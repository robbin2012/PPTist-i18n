# PPTist 主题和颜色系统文档

## 📋 目录

- [1. 主题系统概述](#1-主题系统概述)
- [2. SlideTheme 数据结构](#2-slidetheme-数据结构)
- [3. themeColors 颜色数组详解](#3-themecolors-颜色数组详解)
- [4. 主题应用机制](#4-主题应用机制)
- [5. 颜色映射与主题切换](#5-颜色映射与主题切换)
- [6. 预设主题配置](#6-预设主题配置)
- [7. 最佳实践](#7-最佳实践)

---

## 1. 主题系统概述

PPTist 的主题系统提供了一套完整的视觉风格管理方案，通过 `SlideTheme` 接口统一管理整个演示文稿的配色、字体、边框和阴影效果。

### 核心特性

- ✅ **统一风格管理**：一次设置，全局生效
- ✅ **智能颜色映射**：主题切换时自动映射颜色
- ✅ **元素级继承**：支持元素自定义覆盖
- ✅ **预设主题库**：16 种内置专业配色方案

### 主题层级

```
全局默认主题 (Pinia Store)
    ↓
模板主题 (Template Theme)
    ↓
元素自定义 (Element Override)
```

**优先级**：元素自定义 > 模板主题 > 全局默认主题

---

## 2. SlideTheme 数据结构

### TypeScript 接口定义

```typescript
// 文件位置: src/types/slides.ts:761-768

export interface SlideTheme {
  backgroundColor: string        // 幻灯片背景颜色
  themeColors: string[]          // 主题色数组（核心配色方案）
  fontColor: string              // 默认字体颜色
  fontName: string               // 默认字体名称
  outline: PPTElementOutline     // 默认边框样式
  shadow: PPTElementShadow       // 默认阴影效果
}
```

### 依赖类型定义

#### PPTElementOutline（元素边框）

```typescript
// 文件位置: src/types/slides.ts:84-88

export interface PPTElementOutline {
  style?: LineStyleType    // 'solid' | 'dashed' | 'dotted'
  width?: number           // 边框宽度（像素）
  color?: string           // 边框颜色
}
```

#### PPTElementShadow（元素阴影）

```typescript
// 文件位置: src/types/slides.ts:68-73

export interface PPTElementShadow {
  h: number        // 水平偏移量（像素）
  v: number        // 垂直偏移量（像素）
  blur: number     // 模糊程度（像素）
  color: string    // 阴影颜色
}
```

### 完整示例

```json
{
  "backgroundColor": "rgb(255, 255, 255)",
  "themeColors": [
    "#5b9bd5",
    "#ed7d31",
    "#a5a5a5",
    "#ffc000",
    "#4472c4",
    "#70ad47"
  ],
  "fontColor": "rgb(51, 51, 51)",
  "fontName": "Microsoft YaHei",
  "outline": {
    "width": 2,
    "color": "#525252",
    "style": "solid"
  },
  "shadow": {
    "h": 3,
    "v": 3,
    "blur": 2,
    "color": "#808080"
  }
}
```

---

## 3. themeColors 颜色数组详解

### 设计理念

`themeColors` 是一个**颜色数组**，而不是单个颜色值。它提供了一组**协调的配色方案**，用于为不同元素提供多样化但统一的视觉风格。

### 标准配色方案

#### 商务风格（6 色）

```typescript
themeColors: [
  '#5b9bd5',  // 主色 - 蓝色
  '#ed7d31',  // 辅色1 - 橙色
  '#a5a5a5',  // 辅色2 - 灰色
  '#ffc000',  // 强调色1 - 黄色
  '#4472c4',  // 强调色2 - 深蓝
  '#70ad47'   // 强调色3 - 绿色
]
```

#### 自然风格（6 色）

```typescript
themeColors: [
  '#83992a',  // 橄榄绿
  '#3c9670',  // 墨绿
  '#44709d',  // 蓝灰
  '#a23b32',  // 砖红
  '#d87728',  // 橙色
  '#deb340'   // 金黄
]
```

#### 单色主题（1 色）

```typescript
themeColors: [
  'rgb(155, 0, 0)'  // 深红色（模板主题色）
]
```

### themeColors 的 5 种应用场景

#### 场景 1：图表元素（完整数组应用）

**使用方式**：将整个 `themeColors` 数组传递给图表配置

```typescript
// 文件位置: src/hooks/useCreateElement.ts:89-102

const createChartElement = (type: ChartType) => {
  createElement({
    type: 'chart',
    chartType: type,
    themeColors: theme.value.themeColors,  // ← 完整数组
    textColor: theme.value.fontColor,
    data: CHART_DEFAULT_DATA[type],
  })
}
```

**ECharts 配置**：

```typescript
// 文件位置: src/views/components/element/ChartElement/chartOption.ts:59

return {
  color: themeColors,  // ← 自动为每个系列分配不同颜色
  series: data.series.map((item, index) => ({
    data: item,
    name: data.legends[index],
    type: 'bar',
  }))
}
```

**实际效果示例**：

```
假设有 3 个数据系列的柱状图：
themeColors = ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4', '#70ad47']

系列1（销售额） → 使用 themeColors[0] = #5b9bd5 (蓝色)
系列2（成本）   → 使用 themeColors[1] = #ed7d31 (橙色)
系列3（利润）   → 使用 themeColors[2] = #a5a5a5 (灰色)

如果系列数超过数组长度，ECharts 会自动循环使用
```

**支持的图表类型**：

- 柱状图 (bar)
- 条形图 (column)
- 折线图 (line)
- 饼图 (pie)
- 环形图 (ring)
- 面积图 (area)
- 雷达图 (radar)
- 散点图 (scatter)

---

#### 场景 2：形状元素（使用第一个颜色）

**使用方式**：使用 `themeColors[0]` 作为形状的默认填充色

```typescript
// 文件位置: src/hooks/useCreateElement.ts:194-223

const createShapeElement = (position, data) => {
  const newElement: PPTShapeElement = {
    type: 'shape',
    fill: theme.value.themeColors[0],  // ← 使用数组第一个颜色
    viewBox: data.viewBox,
    path: data.path,
    fixedRatio: false,
    rotate: 0,
  }
  createElement(newElement)
}
```

**实际效果**：

```
themeColors = ['#5b9bd5', '#ed7d31', '#a5a5a5']
创建矩形   → fill = '#5b9bd5'
创建圆形   → fill = '#5b9bd5'
创建三角形 → fill = '#5b9bd5'

用户可以在创建后手动修改为其他颜色
```

---

#### 场景 3：表格元素（使用第一个颜色作为主题色）

**使用方式**：`themeColors[0]` 用于表格的主题色（标题行、首列等）

```typescript
// 文件位置: src/hooks/useCreateElement.ts:110-155

const createTableElement = (row: number, col: number) => {
  createElement({
    type: 'table',
    outline: {
      width: 2,
      style: 'solid',
      color: '#eeece1',
    },
    theme: {
      color: theme.value.themeColors[0],  // ← 表格主题色
      rowHeader: true,    // 标题行启用
      rowFooter: false,
      colHeader: false,
      colFooter: false,
    },
    cellMinHeight: 36,
  })
}
```

**TableTheme 结构**：

```typescript
interface TableTheme {
  color: string       // 主题色（用于标题区域背景）
  rowHeader: boolean  // 启用标题行
  rowFooter: boolean  // 启用汇总行
  colHeader: boolean  // 启用第一列
  colFooter: boolean  // 启用最后一列
}
```

**实际效果**：

```
themeColors = ['#5b9bd5', ...]
表格创建时:
- 第一行（标题行）背景色 = #5b9bd5
- 其他单元格背景色 = 白色（默认）
```

---

#### 场景 4：线条元素（使用第一个颜色）

**使用方式**：`themeColors[0]` 作为线条颜色

```typescript
// 文件位置: src/hooks/useCreateElement.ts:231-250

const createLineElement = (position, data) => {
  const newElement: PPTLineElement = {
    type: 'line',
    color: theme.value.themeColors[0],  // ← 线条颜色
    style: data.style,
    start,
    end,
    points: data.points,
    width: 2,
  }
  createElement(newElement)
}
```

---

#### 场景 5：音频元素（使用第一个颜色作为图标色）

**使用方式**：`themeColors[0]` 用于音频播放器图标颜色

```typescript
// 文件位置: src/hooks/useCreateElement.ts:299-315

const createAudioElement = (src: string, ext?: string) => {
  const newElement: PPTAudioElement = {
    type: 'audio',
    color: theme.value.themeColors[0],  // ← 音频图标颜色
    width: 50,
    height: 50,
    loop: false,
    autoplay: false,
    fixedRatio: true,
    src,
  }
  createElement(newElement)
}
```

---

### 元素类型与 themeColors 使用对照表

| 元素类型 | themeColors 使用方式 | 具体应用 | 代码位置 |
|---------|---------------------|---------|---------|
| **Chart**（图表） | 完整数组 `themeColors` | 多系列图表每个系列使用不同颜色 | `useCreateElement.ts:99`<br>`chartOption.ts:59,93,127` |
| **Shape**（形状） | 第一个 `themeColors[0]` | 形状填充色 | `useCreateElement.ts:205` |
| **Table**（表格） | 第一个 `themeColors[0]` | 表格主题色（标题行/列背景） | `useCreateElement.ts:148` |
| **Line**（线条） | 第一个 `themeColors[0]` | 线条颜色 | `useCreateElement.ts:242` |
| **Audio**（音频） | 第一个 `themeColors[0]` | 音频图标颜色 | `useCreateElement.ts:311` |
| **Text**（文本） | ❌ 不使用 | 使用 `fontColor` 而非 `themeColors` | `useCreateElement.ts:179` |
| **Image**（图片） | ❌ 不使用 | 图片无需颜色配置 | - |
| **Video**（视频） | ❌ 不使用 | 视频无需颜色配置 | - |
| **LaTeX**（公式） | ❌ 不使用 | 使用 `fontColor` | `useCreateElement.ts:268` |

---

## 4. 主题应用机制

### 4.1 主题设置流程

```typescript
// 文件位置: src/views/Editor/AIPPTDialog.vue

const createPPT = async (template?: { slides: Slide[], theme: SlideTheme }) => {
  // 1. 加载模板数据
  let templateData = template
  if (!templateData) {
    templateData = await api.getMockData(selectedTemplate.value)
  }

  const templateSlides: Slide[] = templateData!.slides
  const templateTheme: SlideTheme = templateData!.theme

  // 2. 应用主题到全局
  slideStore.setTheme(templateTheme)  // ← 设置全局主题

  // 3. 后续生成的所有幻灯片都会继承这个主题
}
```

### 4.2 主题级联应用

主题属性会自动级联到不同类型的元素：

```typescript
// 文件位置: src/hooks/useSlideTheme.ts:279-340

const setSlideTheme = (slide: Slide, theme: PresetTheme) => {
  const colorMap = createSlideThemeColorMap(slide, theme.colors)

  const getColor = (color: string) => {
    const alpha = tinycolor(color).getAlpha()
    const _color = colorMap[tinycolor(color).setAlpha(1).toRgbString()]
    return _color ? tinycolor(_color).setAlpha(alpha).toRgbString() : color
  }

  // 应用背景
  if (!slide.background || slide.background.type !== 'image') {
    slide.background = {
      type: 'solid',
      color: theme.background,
    }
  }

  // 遍历每个元素应用主题
  for (const el of slide.elements) {
    // 形状元素
    if (el.type === 'shape') {
      if (el.fill) el.fill = getColor(el.fill)
      if (el.text) {
        el.text.defaultColor = theme.fontColor
        el.text.defaultFontName = theme.fontname
      }
    }

    // 文本元素
    if (el.type === 'text') {
      if (el.fill) el.fill = getColor(el.fill)
      el.defaultColor = theme.fontColor
      el.defaultFontName = theme.fontname
    }

    // 图表元素
    if (el.type === 'chart') {
      el.themeColors = [...theme.colors]  // ← 完全替换颜色数组
      el.textColor = theme.fontColor
    }

    // 表格元素
    if (el.type === 'table') {
      if (el.theme) el.theme.color = getColor(el.theme.color)
      for (const rowCells of el.data) {
        for (const cell of rowCells) {
          if (cell.style) {
            cell.style.color = theme.fontColor
            cell.style.fontname = theme.fontname
          }
        }
      }
    }

    // 线条元素
    if (el.type === 'line') {
      el.color = getColor(el.color)
    }

    // 音频元素
    if (el.type === 'audio') {
      el.color = getColor(el.color)
    }

    // 公式元素
    if (el.type === 'latex') {
      el.color = theme.fontColor
    }

    // 应用边框和阴影
    if ('outline' in el && el.outline) {
      if (theme.outline) el.outline = { ...theme.outline }
      if (theme.borderColor) el.outline.color = theme.borderColor
    }
    if ('shadow' in el && el.shadow && theme.shadow) {
      el.shadow = theme.shadow
    }
  }
}
```

### 4.3 主题应用范围

| 主题属性 | 应用元素类型 | 应用方式 |
|---------|-------------|---------|
| **backgroundColor** | Slide | 幻灯片背景色 |
| **themeColors** | Chart, Shape, Table, Line, Audio | 图表系列色、元素填充色 |
| **fontColor** | Text, Shape.text, Chart, Table, LaTeX | 文字颜色 |
| **fontName** | Text, Shape.text, Table | 字体族 |
| **outline** | Text, Shape, Image, Chart, Table | 边框样式 |
| **shadow** | Text, Shape, Image, Line | 阴影效果 |

---

## 5. 颜色映射与主题切换

### 5.1 智能颜色映射算法

当用户切换主题时，系统会智能地将旧颜色映射到新颜色，保持视觉层次关系。

```typescript
// 文件位置: src/hooks/useSlideTheme.ts:261-276

const createSlideThemeColorMap = (slide: Slide, _newColors: string[]): { [key: string]: string } => {
  const newColors = [..._newColors]
  const oldColors = getSlideAllColors(slide)  // 按使用面积排序的旧颜色
  const themeColorMap: { [key: string]: string } = {}

  // 如果旧颜色数量 > 新颜色数量，生成额外的类似色
  if (oldColors.length > newColors.length) {
    const analogous = tinycolor(newColors[0]).analogous(oldColors.length - newColors.length + 10)
    const otherColors = analogous.map(item => item.toHexString()).slice(1)
    newColors.push(...otherColors)
  }

  // 一对一映射
  for (let i = 0; i < oldColors.length; i++) {
    themeColorMap[oldColors[i]] = newColors[i]
  }

  return themeColorMap
}
```

### 5.2 颜色映射示例

**场景 1：颜色数量相等**

```
旧主题: ['#5b9bd5', '#ed7d31', '#a5a5a5']
新主题: ['#83992a', '#3c9670', '#44709d']

映射关系:
#5b9bd5 (蓝色)  → #83992a (橄榄绿)
#ed7d31 (橙色)  → #3c9670 (墨绿)
#a5a5a5 (灰色)  → #44709d (蓝灰)

所有使用旧颜色的元素会自动更新为对应的新颜色
```

**场景 2：新颜色少于旧颜色**

```
旧主题: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4']  // 5 个颜色
新主题: ['#83992a', '#3c9670', '#44709d']                        // 3 个颜色

处理方式:
1. 使用 tinycolor 的 analogous() 方法生成类似色
2. 生成额外 2 个与新主题色协调的颜色
3. 扩展后新主题: ['#83992a', '#3c9670', '#44709d', '#generated1', '#generated2']

映射关系:
#5b9bd5 → #83992a
#ed7d31 → #3c9670
#a5a5a5 → #44709d
#ffc000 → #generated1
#4472c4 → #generated2
```

### 5.3 颜色提取算法

系统会分析幻灯片中所有元素的颜色使用情况，按面积权重排序：

```typescript
// 文件位置: src/hooks/useSlideTheme.ts:21-211

const getSlidesThemeStyles = (slide: Slide | Slide[]) => {
  const slides = Array.isArray(slide) ? slide : [slide]

  const themeColorValues: ThemeValueWithArea[] = []

  for (const slide of slides) {
    for (const el of slide.elements) {
      const elWidth = el.width
      const elHeight = el.type === 'line' ? getLineElementLength(el) : el.height
      const area = elWidth * elHeight  // 计算元素面积

      // 形状和文本元素
      if (el.type === 'shape' || el.type === 'text') {
        if (el.fill) {
          themeColorValues.push({ area, value: el.fill })
        }
      }

      // 图表元素（权重分配）
      else if (el.type === 'chart') {
        if (el.fill) {
          themeColorValues.push({ area: area * 0.6, value: el.fill })
        }
        if (el.themeColors[0]) {
          themeColorValues.push({ area: area * 0.3, value: el.themeColors[0] })
        }
        for (const color of el.themeColors) {
          themeColorValues.push({ area: area / el.themeColors.length * 0.1, value: color })
        }
      }

      // 线条元素
      else if (el.type === 'line') {
        themeColorValues.push({ area, value: el.color })
      }
    }
  }

  // 聚合相同颜色的面积
  const themeColors: { [key: string]: number } = {}
  for (const item of themeColorValues) {
    const color = tinycolor(item.value).toRgbString()
    if (!themeColors[color]) themeColors[color] = item.area
    else themeColors[color] += item.area
  }

  // 按面积从大到小排序
  return Object.keys(themeColors).sort((a, b) => themeColors[b] - themeColors[a])
}
```

### 5.4 透明度保留

颜色映射时会保留原始透明度：

```typescript
const getColor = (color: string) => {
  const alpha = tinycolor(color).getAlpha()  // 保存透明度
  const _color = colorMap[tinycolor(color).setAlpha(1).toRgbString()]
  return _color ? tinycolor(_color).setAlpha(alpha).toRgbString() : color  // 恢复透明度
}

// 示例：
// 旧颜色: rgba(91, 155, 213, 0.5)  // 50% 透明度
// 新颜色: rgba(131, 153, 42, 0.5)  // 保持 50% 透明度
```

---

## 6. 预设主题配置

PPTist 提供了 16 种精心设计的预设主题。

### 6.1 PresetTheme 接口

```typescript
// 文件位置: src/configs/theme.ts:3-11

export interface PresetTheme {
  background: string              // 背景颜色
  fontColor: string               // 字体颜色
  fontname: string                // 字体名称
  colors: string[]                // 主题色数组（themeColors）
  borderColor?: string            // 边框颜色（可选）
  outline?: PPTElementOutline     // 边框样式（可选）
  shadow?: PPTElementShadow       // 阴影效果（可选）
}
```

### 6.2 预设主题列表

#### 主题 1：经典商务蓝

```typescript
{
  background: '#ffffff',
  fontColor: '#333333',
  borderColor: '#41719c',
  fontname: '',
  colors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4', '#70ad47'],
}
```

- **适用场景**：商务报告、数据分析
- **配色特点**：专业稳重、对比度适中

#### 主题 2：清新自然绿

```typescript
{
  background: '#ffffff',
  fontColor: '#333333',
  borderColor: '#5f6f1c',
  fontname: '',
  colors: ['#83992a', '#3c9670', '#44709d', '#a23b32', '#d87728', '#deb340'],
}
```

- **适用场景**：环保主题、健康产业
- **配色特点**：清新自然、生机勃勃

#### 主题 3：温暖大地棕

```typescript
{
  background: '#ffffff',
  fontColor: '#333333',
  borderColor: '#a75f0a',
  fontname: '',
  colors: ['#e48312', '#bd582c', '#865640', '#9b8357', '#c2bc80', '#94a088'],
}
```

- **适用场景**：人文历史、艺术设计
- **配色特点**：温暖沉稳、复古典雅

#### 主题 4：科技紫蓝

```typescript
{
  background: '#ffffff',
  fontColor: '#333333',
  borderColor: '#7c91a8',
  fontname: '',
  colors: ['#bdc8df', '#003fa9', '#f5ba00', '#ff7567', '#7676d9', '#923ffc'],
}
```

- **适用场景**：科技产品、创新企业
- **配色特点**：科技感强、现代时尚

#### 主题 7：深色自然风

```typescript
{
  background: '#e9efd6',
  fontColor: '#333333',
  borderColor: '#782009',
  fontname: '',
  colors: ['#a5300f', '#de7e18', '#9f8351', '#728653', '#92aa4c', '#6aac91'],
}
```

- **适用场景**：户外探险、自然教育
- **配色特点**：自然朴实、亲和力强

#### 主题 8：深色高级商务（深色背景）

```typescript
{
  background: '#17444e',
  fontColor: '#ffffff',
  borderColor: '#800c0b',
  fontname: '',
  colors: ['#b01513', '#ea6312', '#e6b729', '#6bab90', '#55839a', '#9e5d9d'],
}
```

- **适用场景**：高端发布会、夜间演讲
- **配色特点**：高端大气、对比强烈

#### 主题 9：潮流紫粉（深色背景）

```typescript
{
  background: '#36234d',
  fontColor: '#ffffff',
  borderColor: '#830949',
  fontname: '',
  colors: ['#b31166', '#e33d6f', '#e45f3c', '#e9943a', '#9b6bf2', '#d63cd0'],
}
```

- **适用场景**：时尚品牌、创意设计
- **配色特点**：活力时尚、年轻潮流

#### 主题 14：经典黑白灰

```typescript
{
  background: '#333333',
  fontColor: '#ffffff',
  borderColor: '#7c91a8',
  fontname: '',
  colors: ['#bdc8df', '#003fa9', '#f5ba00', '#ff7567', '#7676d9', '#923ffc'],
}
```

- **适用场景**：极简设计、黑白摄影
- **配色特点**：简约大气、对比鲜明

### 6.3 应用预设主题

```typescript
// 文件位置: src/hooks/useSlideTheme.ts:342-364

const applyPresetTheme = (theme: PresetTheme, resetSlides = false) => {
  // 1. 设置全局主题
  slidesStore.setTheme({
    backgroundColor: theme.background,
    themeColors: theme.colors,
    fontColor: theme.fontColor,
    outline: {
      width: 2,
      style: 'solid',
      color: theme.borderColor,
    },
    fontName: theme.fontname,
  })

  // 2. 如果需要，将主题应用到现有幻灯片
  if (resetSlides) {
    const newSlides: Slide[] = JSON.parse(JSON.stringify(slides.value))
    for (const slide of newSlides) {
      setSlideTheme(slide, theme)
    }
    slidesStore.setSlides(newSlides)
    addHistorySnapshot()
  }
}
```

---

## 7. 最佳实践

### 7.1 主题设计原则

#### 1. 颜色数量建议

- **标准配置**：6 个颜色（推荐）
  - 主色 1 个 + 辅色 2 个 + 强调色 3 个
- **最少配置**：1 个颜色（单色主题）
- **最多配置**：不限制，但建议不超过 10 个

#### 2. 颜色选择原则

```
主色（themeColors[0]）：
- 使用最频繁，代表品牌或主题
- 应用于形状、线条、表格、音频等默认元素

辅色（themeColors[1-2]）：
- 用于次要信息展示
- 提供视觉层次感

强调色（themeColors[3-5]）：
- 用于突出重点数据
- 提供视觉多样性
```

#### 3. 对比度要求

```
浅色背景（#ffffff）：
- fontColor 建议使用深色（#333333）
- themeColors 建议使用饱和度较高的颜色

深色背景（#17444e）：
- fontColor 必须使用浅色（#ffffff）
- themeColors 建议使用明亮色彩
```

### 7.2 多系列图表配色

```typescript
// 推荐：使用渐进色系
themeColors: [
  '#5b9bd5',  // 蓝色系 - 主色
  '#4472c4',  // 蓝色系 - 深色变体
  '#ed7d31',  // 橙色系 - 对比色
  '#ffc000',  // 黄色系 - 辅助色
]

// 避免：使用过于相似的颜色
themeColors: [
  '#5b9bd5',  // 蓝色
  '#5b9cd6',  // 浅蓝（过于相似，难以区分）
  '#5b9dd7',  // 更浅蓝（过于相似，难以区分）
]
```

### 7.3 主题切换注意事项

#### 建议操作流程

```typescript
// 1. 先设置全局主题
slidesStore.setTheme(newTheme)

// 2. 可选：应用到现有幻灯片
applyThemeToAllSlides(applyAll = true)

// 3. 保存历史快照
addHistorySnapshot()
```

#### 避免的操作

```typescript
// ❌ 不建议：直接修改单个元素颜色后再切换主题
element.fill = '#custom-color'
applyPresetTheme(newTheme, true)  // 会覆盖自定义颜色

// ✅ 推荐：先切换主题，再自定义
applyPresetTheme(newTheme, true)
element.fill = '#custom-color'  // 在新主题基础上自定义
```

### 7.4 AI PPT 生成最佳实践

```typescript
// 模板选择建议
const selectTemplate = () => {
  // 1. 根据内容类型选择模板
  if (content.isDataHeavy) {
    return template_with_more_charts  // 图表较多
  }

  // 2. 根据风格选择主题色
  if (content.style === 'professional') {
    return theme_blue_business  // 商务蓝
  } else if (content.style === 'creative') {
    return theme_purple_pink  // 潮流紫粉
  }
}

// 主题应用
const createPPT = async () => {
  const template = selectTemplate()

  // 应用模板主题
  slideStore.setTheme(template.theme)

  // 使用主题色生成内容
  const slides = await generateSlides(template)

  return slides
}
```

### 7.5 性能优化建议

```typescript
// 1. 批量更新主题时，使用深拷贝避免响应式问题
const newSlides: Slide[] = JSON.parse(JSON.stringify(slides.value))
for (const slide of newSlides) {
  setSlideTheme(slide, theme)
}
slidesStore.setSlides(newSlides)

// 2. 颜色映射时，缓存计算结果
const colorMapCache = new Map<string, { [key: string]: string }>()
const getColorMap = (slide: Slide, colors: string[]) => {
  const key = `${slide.id}-${colors.join(',')}`
  if (!colorMapCache.has(key)) {
    colorMapCache.set(key, createSlideThemeColorMap(slide, colors))
  }
  return colorMapCache.get(key)!
}

// 3. 大量幻灯片主题切换时，使用异步处理
const applyThemeToManySlides = async (theme: PresetTheme) => {
  const batchSize = 10
  for (let i = 0; i < slides.length; i += batchSize) {
    const batch = slides.slice(i, i + batchSize)
    await Promise.all(batch.map(slide => setSlideTheme(slide, theme)))
  }
}
```

---

## 附录

### A. 相关文件索引

| 文件路径 | 主要内容 |
|---------|---------|
| `src/types/slides.ts` | SlideTheme、PPTElementOutline、PPTElementShadow 接口定义 |
| `src/configs/theme.ts` | PresetTheme 接口和 16 个预设主题配置 |
| `src/hooks/useSlideTheme.ts` | 主题应用、颜色映射、主题提取逻辑 |
| `src/hooks/useCreateElement.ts` | 各类元素创建时的主题色应用 |
| `src/views/components/element/ChartElement/chartOption.ts` | 图表元素 themeColors 应用逻辑 |
| `src/store/slides.ts` | 全局主题状态管理 |
| `src/views/Editor/AIPPTDialog.vue` | AI PPT 生成时的主题应用 |

### B. 常用工具函数

```typescript
// 颜色处理库
import tinycolor from 'tinycolor2'

// 获取颜色透明度
tinycolor(color).getAlpha()

// 设置颜色透明度
tinycolor(color).setAlpha(alpha).toRgbString()

// 转换为 RGB 字符串
tinycolor(color).toRgbString()  // 'rgb(91, 155, 213)'

// 生成类似色
tinycolor(color).analogous(count)  // 返回颜色数组

// 转换为 HEX
tinycolor(color).toHexString()  // '#5b9bd5'
```

### C. 常见问题 FAQ

**Q1: 为什么图表使用完整 themeColors 数组，而其他元素只用第一个？**

A: 图表需要区分多个数据系列，需要多种颜色；而形状、线条等元素主要需要统一的主题色，使用第一个颜色即可保持视觉一致性。

**Q2: 如何确保自定义颜色不被主题切换覆盖？**

A: 在 `applyPresetTheme()` 时设置 `resetSlides = false`，这样只更新全局主题，不影响现有幻灯片的自定义颜色。

**Q3: themeColors 数组的顺序重要吗？**

A: 非常重要！第一个颜色（themeColors[0]）是主色，使用频率最高。图表会按顺序为系列分配颜色，所以应该把对比度高的颜色放在前面。

**Q4: 单色主题（只有 1 个颜色）能正常工作吗？**

A: 可以。ECharts 会自动生成色相变化，表格、形状等元素都会使用这个主色。但建议至少提供 3 个颜色以获得更好的视觉效果。

**Q5: 如何为深色背景选择合适的 themeColors？**

A: 深色背景应选择明度较高的颜色，避免使用深色系。例如：`['#40aebd', '#97e8d5', '#a1cf49', '#f2df3a']`（明亮色）而不是 `['#052f61', '#032e45']`（深色）。

---

## 更新日志

- **v1.0.0** (2025-01-20): 初始版本，完整文档发布

---

**文档维护者**：PPTist 开发团队
**最后更新**：2025-01-20
**版本**：v1.0.0
