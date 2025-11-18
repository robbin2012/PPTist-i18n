/*
  Minimal streaming backend for PPTist with OpenRouter support

  Endpoints (match frontend expectations):
   - POST /tools/aippt_outline  -> streams Markdown outline text
   - POST /tools/aippt          -> streams JSON objects per chunk (AIPPTSlide)
   - POST /tools/ai_writing     -> streams incremental rewritten text
*/

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 51702

// OpenRouter API key - 在这里直接配置
const OPENROUTER_API_KEY = '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'

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Utilities
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function writeStreamHeaders(res, contentType = 'text/plain; charset=utf-8') {
  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
}

// --- OpenRouter API call ---
async function callOpenRouter(prompt, model = 'openai/gpt-3.5-turbo') {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    })
  })
}

// --- Original generators (kept as fallback) ---

function generateOutlineMarkdown(topic = '未命名主题', language = '中文') {
  const title = `# ${topic}`
  const sections = [
    '背景与概述',
    '核心要点',
    '案例与实践',
    '挑战与对策',
    '总结与展望',
  ]
  const bullets = [
    ['定义/范围', '发展历程', '适用场景'],
    ['关键指标', '方法/流程', '成败因素'],
    ['典型案例', '实施步骤', '效果评估'],
    ['主要挑战', '风险控制', '改进建议'],
    ['核心结论', '落地路径', '未来趋势'],
  ]

  const lines = [title]
  sections.forEach((sec, idx) => {
    lines.push(`\n## ${sec}`)
    lines.push(`### ${sec}要点`)
    bullets[idx].forEach(b => lines.push(`- ${b}`))
  })
  return lines
}

function parseOutline(md = '') {
  const lines = md.split(/\r?\n/)
  const result = { title: '未命名演示文稿', sections: [] }
  let current = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('# ')) {
      result.title = line.replace(/^#\s*/, '')
      continue
    }
    if (line.startsWith('## ')) {
      current = { title: line.replace(/^##\s*/, ''), bullets: [] }
      result.sections.push(current)
      continue
    }
    if (line.startsWith('- ') && current) {
      current.bullets.push(line.replace(/^-\s*/, ''))
    }
  }
  return result
}

function makeContentItemsFromBullets(bullets = []) {
  const chunks = []
  const copy = bullets.slice()
  while (copy.length) {
    const group = copy.splice(0, 4)
    chunks.push(group.map((t, i) => ({ title: t, text: `${t}：详细说明与要点阐述。` })))
  }
  return chunks
}

function chunkString(str, size = 28) {
  const out = []
  for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size))
  return out
}

// --- Routes ---

app.post('/tools/aippt_outline', async (req, res) => {
  const { content, language = '中文', model = 'GLM-4.5-Flash' } = req.body || {}
  const topic = content || '未命名主题'

  writeStreamHeaders(res, 'text/plain; charset=utf-8')

  // 映射模型名称
  const openrouterModel = model === 'GLM-4.5-Flash' ? 'openai/gpt-3.5-turbo' : 'openai/gpt-3.5-turbo'

  const prompt = `请为以下主题生成一个专业的PPT大纲，使用Markdown格式：

主题: ${topic}
语言: ${language}

要求:
1. 使用 # 作为主标题
2. 使用 ## 作为章节标题（5-8个章节）
3. 每个章节下用 - 列出3-5个要点
4. 直接输出Markdown，不要额外解释

示例格式:
# 主题
## 章节1
- 要点1
- 要点2`

  try {
    const response = await callOpenRouter(prompt, openrouterModel)

    if (!response.ok) {
      console.error('OpenRouter API error')
      // fallback to demo
      const lines = generateOutlineMarkdown(topic, language)
      for (const line of lines) {
        res.write(line + '\n')
        await sleep(120)
      }
      res.end()
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim() || line.trim() === 'data: [DONE]') continue
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6))
            const content = json.choices?.[0]?.delta?.content
            if (content) res.write(content)
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.error('Stream error:', e)
  } finally {
    res.end()
  }
})

app.post('/tools/aippt', async (req, res) => {
  const { content = '', language = '中文', style = '通用' } = req.body || {}

  writeStreamHeaders(res, 'text/plain; charset=utf-8')

  const parsed = parseOutline(content)
  const slides = []

  // cover
  slides.push({
    type: 'cover',
    data: { title: parsed.title || '未命名演示文稿', text: `${style} · ${language}` },
  })

  // contents
  const toc = parsed.sections.map(s => s.title).filter(Boolean)
  if (toc.length) slides.push({ type: 'contents', data: { items: toc.slice(0, 12) } })

  // transition + content per section
  for (const section of parsed.sections) {
    slides.push({ type: 'transition', data: { title: section.title, text: `${section.title} 概述` } })
    const itemGroups = makeContentItemsFromBullets(section.bullets)
    for (const items of itemGroups) {
      slides.push({ type: 'content', data: { title: section.title, items } })
    }
  }

  // end
  slides.push({ type: 'end' })

  try {
    for (const s of slides) {
      res.write(JSON.stringify(s))
      await sleep(150)
    }
  } catch (e) {
  } finally {
    res.end()
  }
})

app.post('/tools/ai_writing', async (req, res) => {
  const { content = '', command = '美化改写' } = req.body || {}
  writeStreamHeaders(res, 'text/plain; charset=utf-8')

  let result
  if (command.includes('精简')) {
    result = content
      .replace(/，/g, '，')
      .replace(/\s+/g, ' ')
      .split(/(?<=[。！？!?.])/)
      .slice(0, Math.max(1, Math.ceil(content.length * 0.4 / 20)))
      .join('')
  } else if (command.includes('扩写')) {
    result = content
      .split(/(?<=[。！？!?.])/)
      .map(s => (s.trim() ? `${s.trim()}（补充示例与细节说明）` : ''))
      .join('')
  } else {
    result = content
      .replace(/重要/g, '关键')
      .replace(/很好/g, '出色')
      .replace(/提高/g, '提升')
  }

  const chunks = chunkString(result, 32)
  try {
    for (const c of chunks) {
      res.write(c)
      await sleep(80)
    }
  } catch (e) {
  } finally {
    res.end()
  }
})

app.get('/', (_req, res) => {
  res.json({ ok: true, message: 'PPTist AI demo server is running.' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PPTist AI demo server listening on http://0.0.0.0:${PORT}`)
})
