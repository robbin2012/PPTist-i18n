import type { Slide, PPTElement } from '@/types/slides'

/**
 * 缩放HTML内容中的font-size
 * @param html HTML字符串
 * @param ratio 缩放比例
 * @returns 缩放后的HTML字符串
 */
const scaleHTMLFontSize = (html: string, ratio: number): string => {
  // 匹配 font-size: 数字px 的模式
  return html.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (match, size) => {
    const newSize = parseFloat(size) * ratio
    return `font-size: ${newSize}px`
  })
}

/**
 * 缩放单个元素的所有尺寸和位置属性
 * @param element 元素对象
 * @param ratio 缩放比例
 * @returns 缩放后的元素
 */
export const scaleElement = (element: PPTElement, ratio: number): PPTElement => {
  const scaled: any = { ...element }

  // 基础位置和尺寸
  scaled.left = element.left * ratio
  scaled.top = element.top * ratio
  scaled.width = element.width * ratio
  scaled.height = element.height * ratio

  // 旋转中心点（如果有）
  if ('originX' in element && element.originX !== undefined) {
    scaled.originX = element.originX * ratio
  }
  if ('originY' in element && element.originY !== undefined) {
    scaled.originY = element.originY * ratio
  }

  // 文本元素的字体大小
  if (element.type === 'text') {
    if ('defaultFontSize' in element && element.defaultFontSize) {
      scaled.defaultFontSize = element.defaultFontSize * ratio
    }
    // 缩放HTML内容中的font-size
    if ('content' in element && element.content) {
      scaled.content = scaleHTMLFontSize(element.content, ratio)
    }
  }

  // Shape 元素的 text 字体大小
  if (element.type === 'shape' && 'text' in element && element.text) {
    scaled.text = { ...element.text }
    if (element.text.defaultFontSize) {
      scaled.text.defaultFontSize = element.text.defaultFontSize * ratio
    }
    // 缩放HTML内容中的font-size
    if (element.text.content) {
      scaled.text.content = scaleHTMLFontSize(element.text.content, ratio)
    }
  }

  // 边框宽度
  if ('outline' in element && element.outline && element.outline.width) {
    scaled.outline = { ...element.outline, width: element.outline.width * ratio }
  }

  // 阴影偏移
  if ('shadow' in element && element.shadow) {
    scaled.shadow = {
      ...element.shadow,
      h: (element.shadow.h || 0) * ratio,
      v: (element.shadow.v || 0) * ratio,
      blur: (element.shadow.blur || 0) * ratio,
    }
  }

  // 线条特殊处理
  if (element.type === 'line' && 'points' in element && element.points) {
    scaled.points = element.points.map(([x, y]) => [x * ratio, y * ratio] as [number, number])
  }

  // 表格特殊处理
  if (element.type === 'table' && 'colWidths' in element && element.colWidths) {
    scaled.colWidths = element.colWidths.map(w => w * ratio)
  }

  return scaled as PPTElement
}

/**
 * 缩放单个幻灯片
 * @param slide 幻灯片对象
 * @param ratio 缩放比例
 * @returns 缩放后的幻灯片
 */
export const scaleSlide = (slide: Slide, ratio: number): Slide => {
  return {
    ...slide,
    elements: slide.elements.map(el => scaleElement(el, ratio)),
  }
}

/**
 * 批量缩放所有幻灯片
 * @param slides 幻灯片数组
 * @param ratio 缩放比例
 * @returns 缩放后的幻灯片数组
 */
export const scaleSlides = (slides: Slide[], ratio: number): Slide[] => {
  // 如果比例是 1，不需要缩放，直接返回原数组
  if (ratio === 1) return slides

  return slides.map(slide => scaleSlide(slide, ratio))
}
