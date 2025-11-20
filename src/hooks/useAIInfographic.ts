import { nanoid } from 'nanoid'
import type { PPTElement, PPTTextElement, PPTShapeElement, Slide, TextType } from '@/types/slides'
import type { TemplateStructure, AIInfographicData, InfographicItem } from '@/types/AIInfographic'
import { useSlidesStore } from '@/store'
import useAddSlidesOrElements from './useAddSlidesOrElements'

export default () => {
  const slidesStore = useSlidesStore()
  const { addSlidesFromData } = useAddSlidesOrElements()

  const checkTextType = (el: PPTElement, type: TextType) => {
    return (el.type === 'text' && el.textType === type) || (el.type === 'shape' && el.text && el.text.type === type)
  }

  // 从HTML内容中提取纯文本
  const extractTextFromHTML = (htmlContent: string): string => {
    return htmlContent.replace(/<[^>]*>/g, '').trim()
  }

  // 提取模板中的示例数据
  const extractTemplateData = (structure: TemplateStructure): AIInfographicData => {
    const template = structure.template
    const elements = template.elements

    // 按位置排序元素（从上到下，从左到右）
    const sortElements = (elements: PPTElement[]) => {
      return elements.sort((a, b) => {
        const aIndex = a.left + a.top * 2
        const bIndex = b.left + b.top * 2
        return aIndex - bIndex
      })
    }

    // 提取标题
    const titleEl = elements.find(el => checkTextType(el, 'title'))
    const title = titleEl
      ? extractTextFromHTML(titleEl.type === 'text' ? titleEl.content : titleEl.text!.content)
      : undefined

    // 提取副标题
    const subtitleEl = elements.find(el => checkTextType(el, 'subtitle'))
    const subtitle = subtitleEl
      ? extractTextFromHTML(subtitleEl.type === 'text' ? subtitleEl.content : subtitleEl.text!.content)
      : undefined

    // 提取正文
    const bodyEl = elements.find(el => checkTextType(el, 'content'))
    const body = bodyEl
      ? extractTextFromHTML(bodyEl.type === 'text' ? bodyEl.content : bodyEl.text!.content)
      : undefined

    // 提取notes（模板自定义生成规则）
    const notesEl = elements.find(el => checkTextType(el, 'notes'))
    const notes = notesEl
      ? extractTextFromHTML(notesEl.type === 'text' ? notesEl.content : notesEl.text!.content)
      : undefined

    // 提取列表项
    const itemElements = sortElements(elements.filter(el => checkTextType(el, 'item')))
    const itemTitleElements = sortElements(elements.filter(el => checkTextType(el, 'itemTitle')))
    const itemNumberElements = sortElements(elements.filter(el => checkTextType(el, 'itemNumber')))

    const items: InfographicItem[] = []

    for (let i = 0; i < structure.itemCount; i++) {
      if (structure.type === 'list') {
        if (structure.hasItemTitle && itemTitleElements[i] && itemElements[i]) {
          const titleText = extractTextFromHTML(
            itemTitleElements[i].type === 'text'
              ? itemTitleElements[i].content
              : (itemTitleElements[i] as PPTShapeElement).text!.content
          )
          const itemText = extractTextFromHTML(
            itemElements[i].type === 'text'
              ? itemElements[i].content
              : (itemElements[i] as PPTShapeElement).text!.content
          )
          items.push({ title: titleText, text: itemText })
        } else if (itemElements[i]) {
          const itemText = extractTextFromHTML(
            itemElements[i].type === 'text'
              ? itemElements[i].content
              : (itemElements[i] as PPTShapeElement).text!.content
          )
          items.push(itemText)
        }
      } else if (structure.type === 'comparison') {
        const leftEl = itemElements.find(el => el.id.includes('left'))
        const rightEl = itemElements.find(el => el.id.includes('right'))
        if (leftEl && rightEl) {
          const leftText = extractTextFromHTML(
            leftEl.type === 'text' ? leftEl.content : (leftEl as PPTShapeElement).text!.content
          )
          const rightText = extractTextFromHTML(
            rightEl.type === 'text' ? rightEl.content : (rightEl as PPTShapeElement).text!.content
          )
          items.push({ left: leftText, right: rightText })
        }
      } else if (structure.type === 'timeline') {
        if (itemNumberElements[i] && itemElements[i]) {
          const yearText = extractTextFromHTML(
            itemNumberElements[i].type === 'text'
              ? itemNumberElements[i].content
              : (itemNumberElements[i] as PPTShapeElement).text!.content
          )
          const eventText = extractTextFromHTML(
            itemElements[i].type === 'text'
              ? itemElements[i].content
              : (itemElements[i] as PPTShapeElement).text!.content
          )
          items.push({ year: yearText, event: eventText })
        }
      }
    }

    return {
      title,
      subtitle,
      body,
      notes,
      items,
    }
  }

  // 提取模板结构信息
  const extractTemplateStructure = (template: Slide): TemplateStructure => {
    const elements = template.elements

    // 检测信息图类型
    let type: 'list' | 'comparison' | 'mindmap' | 'timeline' = 'list'

    // 基于元素ID或内容模式检测类型
    const hasLeft = elements.some(el =>
      (el.type === 'text' && el.textType === 'item' && el.id.includes('left')) ||
      (el.type === 'shape' && el.text?.type === 'item' && el.id.includes('left'))
    )
    const hasRight = elements.some(el =>
      (el.type === 'text' && el.textType === 'item' && el.id.includes('right')) ||
      (el.type === 'shape' && el.text?.type === 'item' && el.id.includes('right'))
    )
    const hasYear = elements.some(el =>
      (el.type === 'text' && el.textType === 'itemNumber' && el.id.includes('year')) ||
      (el.type === 'shape' && el.text?.type === 'itemNumber' && el.id.includes('year'))
    )

    if (hasLeft && hasRight) type = 'comparison'
    else if (hasYear) type = 'timeline'

    // 统计各类元素
    const hasTitle = elements.some(el => checkTextType(el, 'title'))
    const hasSubtitle = elements.some(el => checkTextType(el, 'subtitle'))
    const hasBody = elements.some(el => checkTextType(el, 'content'))

    const items = elements.filter(el => checkTextType(el, 'item'))
    const itemCount = items.length

    const hasItemTitle = elements.some(el => checkTextType(el, 'itemTitle'))
    const hasItemNumber = elements.some(el => checkTextType(el, 'itemNumber'))

    return {
      type,
      hasTitle,
      hasSubtitle,
      hasBody,
      itemCount,
      hasItemTitle,
      hasItemNumber,
      template,
    }
  }

  // 多语言指令配置
  const languageInstructions: Record<string, string> = {
    '中文': '使用简洁的中文表达，避免冗长的从句',
    'English': 'Use concise English, prefer active voice',
    '日本語': '簡潔な日本語表現を使用してください',
  }

  // 生成AI提示词（优化版，包含模板示例）
  const generatePrompt = (
    structure: TemplateStructure,
    templateData: AIInfographicData,
    topic: string,
    language: string
  ): string => {
    const typeNames: Record<string, string> = {
      list: '列表型',
      comparison: '对比型',
      timeline: '时间轴',
      mindmap: '思维导图',
    }

    let prompt = `# 任务角色
你是一位专业的信息图设计师，擅长根据主题创作结构化的视觉内容。

# 任务描述
请根据以下**模板结构**和**用户主题**，生成一个${typeNames[structure.type]}信息图的内容。

# 模板信息
- 信息图类型：${typeNames[structure.type]}
- 语言：${language}
- 项目数量：${structure.itemCount}个

# 模板示例数据
\`\`\`json
${JSON.stringify(templateData, null, 2)}
\`\`\`

**重要说明**：
- 示例数据中的 **"notes"** 字段是针对当前模板的**生成规则**，请务必严格遵守
- 其他字段（title、subtitle、body、items）仅为样例数据，仅供参考风格和长度
- 你的输出JSON中**不要包含notes字段**，它仅用于指导生成过程

# 用户主题
${topic}

# 生成要求
`

    if (structure.hasTitle && templateData.title) {
      const exampleLength = templateData.title.length
      prompt += `1. **标题（title）**：参考示例风格，生成${Math.max(exampleLength - 3, 5)}~${exampleLength + 3}字的标题\n`
    }

    if (structure.hasSubtitle && templateData.subtitle) {
      const exampleLength = templateData.subtitle.length
      prompt += `2. **副标题（subtitle）**：参考示例风格，生成${Math.max(exampleLength - 5, 5)}~${exampleLength + 5}字的副标题\n`
    }

    if (structure.hasBody && templateData.body) {
      const exampleLength = templateData.body.length
      prompt += `3. **正文介绍（body）**：参考示例详细程度，生成${Math.max(exampleLength - 20, 50)}~${exampleLength + 20}字的介绍\n`
    }

    let itemIndex = structure.hasTitle && structure.hasSubtitle && structure.hasBody ? 4 : structure.hasTitle || structure.hasSubtitle ? 3 : structure.hasBody ? 2 : 1
    prompt += `${itemIndex}. **列表项（items）**：生成${structure.itemCount}个项目，每个项目的结构如下：\n`

    if (structure.type === 'list') {
      if (structure.hasItemTitle) {
        prompt += `   - title: 项目标题（参考示例风格）\n`
        prompt += `   - text: 项目描述（参考示例详细程度）\n`
      } else {
        prompt += `   - 简短文本（参考示例长度和风格）\n`
      }
    } else if (structure.type === 'comparison') {
      prompt += `   - left: 左侧对比内容（参考示例风格）\n`
      prompt += `   - right: 右侧对比内容（参考示例风格）\n`
    } else if (structure.type === 'timeline') {
      prompt += `   - year: 年份或时间点（参考示例格式，如"2024-01"或"2024年Q1"）\n`
      prompt += `   - event: 事件描述（参考示例详细程度）\n`
    }

    // 添加语言指令
    if (languageInstructions[language]) {
      prompt += `\n语言要求：${languageInstructions[language]}\n`
    }

    // 添加主题相关性约束
    prompt += `\n⚠️ 重要提示：
- 所有生成的内容必须与主题"${topic}"直接相关
- 保持模板示例的风格和结构，但内容必须完全不同
- 如果主题是专业领域，使用专业术语；如果是通用主题，使用通俗语言
`

    prompt += `\n# 输出格式
请严格按照以下JSON格式返回，不要包含任何其他文字：

\`\`\`json
{`

    if (structure.hasTitle) prompt += `\n  "title": "根据主题生成的标题",`
    if (structure.hasSubtitle) prompt += `\n  "subtitle": "根据主题生成的副标题",`
    if (structure.hasBody) prompt += `\n  "body": "根据主题生成的正文介绍",`

    prompt += `\n  "items": [`

    if (structure.type === 'list' && structure.hasItemTitle) {
      prompt += `\n    {"title": "项目1标题", "text": "项目1描述"},\n    {"title": "项目2标题", "text": "项目2描述"},\n    ...（共${structure.itemCount}个）`
    } else if (structure.type === 'comparison') {
      prompt += `\n    {"left": "左侧内容1", "right": "右侧内容1"},\n    {"left": "左侧内容2", "right": "右侧内容2"},\n    ...（共${structure.itemCount}个）`
    } else if (structure.type === 'timeline') {
      prompt += `\n    {"year": "2024-01", "event": "事件1描述"},\n    {"year": "2024-06", "event": "事件2描述"},\n    ...（共${structure.itemCount}个）`
    } else {
      prompt += `\n    "项目1内容",\n    "项目2内容",\n    ...（共${structure.itemCount}个）`
    }

    prompt += `\n  ]\n}\n\`\`\``

    return prompt
  }

  // 验证AI返回的数据
  const validateAIResponse = (data: AIInfographicData, structure: TemplateStructure): { valid: boolean; error?: string } => {
    // 验证必填字段
    if (structure.hasTitle && !data.title) {
      return { valid: false, error: 'AI未返回标题字段' }
    }
    if (structure.hasSubtitle && !data.subtitle) {
      return { valid: false, error: 'AI未返回副标题字段' }
    }
    if (structure.hasBody && !data.body) {
      return { valid: false, error: 'AI未返回正文字段' }
    }

    // 验证items存在(数量可以不匹配,填充时会按需处理)
    if (!data.items || !Array.isArray(data.items)) {
      return { valid: false, error: 'AI未返回items数组' }
    }

    if (data.items.length === 0) {
      return { valid: false, error: 'items数组为空' }
    }

    // 验证列表项格式(只验证实际返回的items)
    const itemsToValidate = Math.min(data.items.length, structure.itemCount)
    for (let i = 0; i < itemsToValidate; i++) {
      const item = data.items[i]
      if (structure.type === 'list' && structure.hasItemTitle) {
        if (typeof item !== 'object' || !('title' in item) || !('text' in item)) {
          return { valid: false, error: `列表项${i + 1}格式错误，应包含title和text字段` }
        }
      } else if (structure.type === 'comparison') {
        if (typeof item !== 'object' || !('left' in item) || !('right' in item)) {
          return { valid: false, error: `对比项${i + 1}格式错误，应包含left和right字段` }
        }
      } else if (structure.type === 'timeline') {
        if (typeof item !== 'object' || !('year' in item) || !('event' in item)) {
          return { valid: false, error: `时间轴项${i + 1}格式错误，应包含year和event字段` }
        }
      }
    }

    return { valid: true }
  }

  // 获取自适应字号
  const getAdaptedFontsize = (params: {
    text: string
    fontSize: number
    fontFamily: string
    width: number
    height: number
    lineHeight: number
    maxLine: number
  }): number => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!

    let newFontSize = params.fontSize
    const minFontSize = 10

    while (newFontSize >= minFontSize) {
      context.font = `${newFontSize}px ${params.fontFamily}`
      const textWidth = context.measureText(params.text).width
      const line = Math.ceil(textWidth / params.width)

      if (params.maxLine > 1 && params.height) {
        const heightOfLine = Math.max(newFontSize, 16) * (newFontSize < 15 ? 1.2 : params.lineHeight) * 1.2
        const totalHeight = line * heightOfLine
        if (totalHeight <= params.height) return newFontSize
      }
      if (line <= params.maxLine) return newFontSize

      const step = newFontSize <= 22 ? 1 : 2
      newFontSize = newFontSize - step
    }

    return minFontSize
  }

  // 从HTML字符串中提取字体信息
  const getFontInfo = (htmlString: string) => {
    const fontSizeRegex = /font-size:\s*(\d+(?:\.\d+)?)\s*px/i
    const fontFamilyRegex = /font-family:\s*['"]?([^'";]+)['"]?\s*(?=;|>|$)/i

    const defaultInfo = {
      fontSize: 16,
      fontFamily: 'Microsoft Yahei',
    }

    const fontSizeMatch = htmlString.match(fontSizeRegex)
    const fontFamilyMatch = htmlString.match(fontFamilyRegex)

    return {
      fontSize: fontSizeMatch ? (+fontSizeMatch[1].trim()) : defaultInfo.fontSize,
      fontFamily: fontFamilyMatch ? fontFamilyMatch[1].trim() : defaultInfo.fontFamily,
    }
  }

  // 填充文本元素
  const fillTextElement = (
    el: PPTTextElement | PPTShapeElement,
    text: string,
    maxLine: number = 1
  ): PPTTextElement | PPTShapeElement => {
    const padding = 10
    const width = el.width - padding * 2 - 2
    const height = el.height - padding * 2 - 2
    const lineHeight = el.type === 'text' ? (el.lineHeight || 1.5) : 1.2
    let content = el.type === 'text' ? el.content : el.text!.content

    const fontInfo = getFontInfo(content)
    const size = getAdaptedFontsize({
      text,
      fontSize: fontInfo.fontSize,
      fontFamily: fontInfo.fontFamily,
      width,
      height,
      lineHeight,
      maxLine,
    })

    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')

    const treeWalker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
    const firstTextNode = treeWalker.nextNode()
    if (firstTextNode) {
      firstTextNode.textContent = text
      let node
      while ((node = treeWalker.nextNode())) {
        node.parentNode?.removeChild(node)
      }
    }

    if (doc.body.innerHTML.indexOf('font-size') === -1) {
      const p = doc.querySelector('p')
      if (p) p.style.fontSize = '16px'
    }

    content = doc.body.innerHTML.replace(/font-size:(.+?)px/g, `font-size: ${size}px`)

    return el.type === 'text'
      ? { ...el, content, lineHeight: size < 15 ? 1.2 : el.lineHeight }
      : { ...el, text: { ...el.text!, content } }
  }

  // 填充信息图数据到模板
  const fillInfographic = (structure: TemplateStructure, data: AIInfographicData): Slide => {
    const template = structure.template

    // 按位置排序元素（从上到下，从左到右）
    const sortElements = (elements: PPTElement[]) => {
      return elements.sort((a, b) => {
        const aIndex = a.left + a.top * 2
        const bIndex = b.left + b.top * 2
        return aIndex - bIndex
      })
    }

    const itemElements = sortElements(template.elements.filter(el => checkTextType(el, 'item')))
    const itemTitleElements = sortElements(template.elements.filter(el => checkTextType(el, 'itemTitle')))
    const itemNumberElements = sortElements(template.elements.filter(el => checkTextType(el, 'itemNumber')))

    const newElements = template.elements.map(el => {
      // 填充标题
      if (checkTextType(el, 'title') && data.title) {
        return fillTextElement(el, data.title, 1)
      }

      // 填充副标题
      if (checkTextType(el, 'subtitle') && data.subtitle) {
        return fillTextElement(el, data.subtitle, 2)
      }

      // 填充正文
      if (checkTextType(el, 'content') && data.body) {
        return fillTextElement(el, data.body, 6)
      }

      // 填充项目
      if (checkTextType(el, 'item')) {
        const index = itemElements.findIndex(item => item.id === el.id)
        if (index >= 0 && index < data.items.length) {
          const item = data.items[index]

          if (structure.type === 'list') {
            if (typeof item === 'string') {
              return fillTextElement(el, item, 2)
            } else if ('title' in item && 'text' in item) {
              // 如果元素是item但模板有itemTitle，则显示text
              return fillTextElement(el, item.text, 3)
            }
          } else if (structure.type === 'comparison' && 'left' in item) {
            // 根据元素ID判断是left还是right
            const text = el.id.includes('left') ? item.left : item.right
            return fillTextElement(el, text, 2)
          } else if (structure.type === 'timeline' && 'event' in item) {
            return fillTextElement(el, item.event, 3)
          }
        }
      }

      // 填充项目标题
      if (checkTextType(el, 'itemTitle')) {
        const index = itemTitleElements.findIndex(item => item.id === el.id)
        if (index >= 0 && index < data.items.length) {
          const item = data.items[index]
          if (typeof item === 'object' && 'title' in item) {
            return fillTextElement(el, item.title, 1)
          }
        }
      }

      // 填充项目编号
      if (checkTextType(el, 'itemNumber')) {
        const index = itemNumberElements.findIndex(item => item.id === el.id)
        if (index >= 0 && index < data.items.length) {
          const item = data.items[index]
          if (structure.type === 'timeline' && typeof item === 'object' && 'year' in item) {
            return fillTextElement(el, item.year, 1)
          } else {
            return fillTextElement(el, String(index + 1), 1)
          }
        }
      }

      return el
    })

    return {
      ...template,
      id: nanoid(10),
      elements: newElements,
    }
  }

  return {
    extractTemplateStructure,
    extractTemplateData,
    generatePrompt,
    validateAIResponse,
    fillInfographic,
  }
}
