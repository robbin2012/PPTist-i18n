# PPTist 模板制作指南

## 目录

1. [模板数据结构](#模板数据结构)
2. [幻灯片类型](#幻灯片类型)
3. [元素类型详解](#元素类型详解)
4. [模板制作方法](#模板制作方法)
5. [快速模板示例](#快速模板示例)

---

## 模板数据结构

PPTist 模板是一个 JSON 对象,包含以下核心字段:

```json
{
  "title": "演示文稿标题",
  "width": 1000,
  "height": 562.5,
  "theme": {
    "themeColors": ["rgb(155, 0, 0)"],
    "fontColor": "rgb(51, 51, 51)",
    "fontName": "",
    "backgroundColor": "rgb(255, 255, 255)",
    "shadow": {
      "h": 3,
      "v": 3,
      "blur": 2,
      "color": "#808080"
    },
    "outline": {
      "width": 2,
      "color": "#525252",
      "style": "solid"
    }
  },
  "slides": []
}
```

### 字段说明

- **title**: 演示文稿标题
- **width/height**: 画布尺寸,默认 1000 × 562.5
- **theme**: 主题配置
  - **themeColors**: 主题色数组
  - **fontColor**: 默认字体颜色
  - **fontName**: 默认字体
  - **backgroundColor**: 背景色
  - **shadow**: 默认阴影效果
  - **outline**: 默认边框样式
- **slides**: 幻灯片数组

---

## 幻灯片类型

每个幻灯片对象包含以下字段:

```json
{
  "id": "unique-id",
  "type": "cover",
  "elements": [],
  "background": {
    "type": "solid",
    "color": "#fff"
  }
}
```

### 幻灯片类型 (type)

| 类型 | 说明 | 用途 |
|------|------|------|
| `cover` | 封面页 | 演示文稿开场 |
| `contents` | 目录页 | 展示内容大纲 |
| `transition` | 过渡页 | 章节分隔 |
| `content` | 内容页 | 主要内容展示 |
| `end` | 结束页 | 演示文稿结尾 |

### 背景配置 (background)

支持三种背景类型:

1. **纯色背景**
```json
{
  "type": "solid",
  "color": "#ffffff"
}
```

2. **图片背景**
```json
{
  "type": "image",
  "image": {
    "src": "图片URL",
    "size": "cover"
  }
}
```

3. **渐变背景**
```json
{
  "type": "gradient",
  "gradient": {
    "type": "linear",
    "colors": [
      {"pos": 0, "color": "#ff0000"},
      {"pos": 100, "color": "#0000ff"}
    ],
    "rotate": 45
  }
}
```

---

## 元素类型详解

### 1. 文本元素 (text)

```json
{
  "type": "text",
  "id": "text-1",
  "left": 100,
  "top": 100,
  "width": 300,
  "height": 80,
  "rotate": 0,
  "content": "<p style=\"text-align: center;\"><strong><span style=\"font-size: 36px;\">标题文本</span></strong></p>",
  "defaultFontName": "Microsoft YaHei",
  "defaultColor": "#333333",
  "lineHeight": 1.5,
  "wordSpace": 0,
  "opacity": 1,
  "textType": "title"
}
```

**关键属性:**
- **content**: HTML 格式的文本内容
- **textType**: 文本类型 (title/subtitle/content/item/itemTitle)
- **lineHeight**: 行高倍数
- **wordSpace**: 字间距
- **vertical**: 是否竖排文本

### 2. 形状元素 (shape)

```json
{
  "type": "shape",
  "id": "shape-1",
  "left": 200,
  "top": 150,
  "width": 200,
  "height": 100,
  "rotate": 0,
  "viewBox": [200, 200],
  "path": "M 0 0 L 200 0 L 200 200 L 0 200 Z",
  "fill": "#ff0000",
  "fixedRatio": false,
  "opacity": 1,
  "outline": {
    "width": 2,
    "color": "#000000",
    "style": "solid"
  }
}
```

**关键属性:**
- **viewBox**: SVG 视图框 [width, height]
- **path**: SVG 路径数据
- **fill**: 填充颜色
- **gradient**: 渐变填充 (可选)
- **pattern**: 图案填充 (可选)
- **text**: 形状内文本 (可选)

**常用形状路径:**
- 矩形: `M 0 0 L 200 0 L 200 200 L 0 200 Z`
- 圆形: `M 100 0 A 50 50 0 1 1 100 200 A 50 50 0 1 1 100 0 Z`
- 三角形: `M 100 0 L 0 200 L 200 200 Z`

### 3. 图片元素 (image)

```json
{
  "type": "image",
  "id": "image-1",
  "left": 300,
  "top": 200,
  "width": 400,
  "height": 300,
  "rotate": 0,
  "src": "https://example.com/image.jpg",
  "fixedRatio": true,
  "filters": {
    "grayscale": "0%",
    "brightness": "100%",
    "opacity": "100%"
  },
  "clip": {
    "shape": "rect",
    "range": [[0, 0], [100, 100]]
  }
}
```

**关键属性:**
- **src**: 图片 URL
- **fixedRatio**: 是否固定宽高比
- **filters**: 滤镜效果 (grayscale/brightness/contrast/saturate 等)
- **clip**: 裁剪信息
- **radius**: 圆角半径

### 4. 线条元素 (line)

```json
{
  "type": "line",
  "id": "line-1",
  "left": 100,
  "top": 300,
  "width": 500,
  "start": [0, 0],
  "end": [500, 0],
  "style": "solid",
  "color": "#000000",
  "points": ["", "arrow"]
}
```

**关键属性:**
- **start/end**: 起点和终点坐标 [x, y]
- **style**: 线条样式 (solid/dashed/dotted)
- **points**: 端点样式 ["", "arrow", "dot"]
- **broken/curve/cubic**: 折线/曲线控制点

### 5. 图表元素 (chart)

```json
{
  "type": "chart",
  "id": "chart-1",
  "left": 100,
  "top": 100,
  "width": 600,
  "height": 400,
  "rotate": 0,
  "chartType": "bar",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "legends": ["销售额", "利润"],
    "series": [
      [100, 150, 200, 180],
      [50, 80, 120, 100]
    ]
  },
  "themeColors": ["#5b9bd5", "#ed7d31"],
  "options": {
    "stack": false
  }
}
```

**图表类型 (chartType):**
- bar (条形图)
- column (柱状图)
- line (折线图)
- pie (饼图)
- ring (环形图)
- area (面积图)
- radar (雷达图)
- scatter (散点图)

### 6. 表格元素 (table)

```json
{
  "type": "table",
  "id": "table-1",
  "left": 100,
  "top": 100,
  "width": 700,
  "height": 300,
  "rotate": 0,
  "outline": {
    "width": 2,
    "color": "#cccccc",
    "style": "solid"
  },
  "colWidths": [25, 25, 25, 25],
  "cellMinHeight": 40,
  "data": [
    [
      {
        "id": "cell-1",
        "colspan": 1,
        "rowspan": 1,
        "text": "表头1",
        "style": {
          "bold": true,
          "backcolor": "#f0f0f0"
        }
      }
    ]
  ]
}
```

### 7. LaTeX 公式元素 (latex)

```json
{
  "type": "latex",
  "id": "latex-1",
  "left": 200,
  "top": 200,
  "width": 300,
  "height": 100,
  "rotate": 0,
  "latex": "E = mc^2",
  "path": "SVG路径数据",
  "color": "#000000",
  "strokeWidth": 1,
  "viewBox": [100, 50],
  "fixedRatio": true
}
```

### 8. 视频元素 (video)

```json
{
  "type": "video",
  "id": "video-1",
  "left": 100,
  "top": 100,
  "width": 640,
  "height": 360,
  "rotate": 0,
  "src": "https://example.com/video.mp4",
  "autoplay": false,
  "poster": "封面图片URL"
}
```

### 9. 音频元素 (audio)

```json
{
  "type": "audio",
  "id": "audio-1",
  "left": 100,
  "top": 100,
  "width": 60,
  "height": 60,
  "rotate": 0,
  "src": "https://example.com/audio.mp3",
  "autoplay": false,
  "loop": false,
  "color": "#1890ff",
  "fixedRatio": true
}
```

---

## 元素通用属性

所有元素都包含以下基础属性:

```json
{
  "id": "唯一标识符",
  "type": "元素类型",
  "left": 100,
  "top": 100,
  "width": 200,
  "height": 100,
  "rotate": 0,
  "lock": false,
  "groupId": "组合ID",
  "link": {
    "type": "web",
    "target": "https://example.com"
  },
  "shadow": {
    "h": 3,
    "v": 3,
    "blur": 5,
    "color": "#00000080"
  }
}
```

---

## 模板制作方法

### 方法一: 手动编写 JSON

1. 创建 JSON 文件 (如 `template_custom.json`)
2. 定义基本结构 (title, width, height, theme)
3. 添加幻灯片数组
4. 为每个幻灯片添加元素
5. 配置元素属性和样式

### 方法二: 使用编辑器导出

1. 在 PPTist 编辑器中创建演示文稿
2. 添加和编辑幻灯片
3. 使用导出功能生成 JSON
4. 保存为模板文件

---

## 快速模板示例

以下是一个最小化的单页模板:

```json
{
  "title": "简单模板",
  "width": 1000,
  "height": 562.5,
  "theme": {
    "themeColors": ["#5b9bd5"],
    "fontColor": "#333333",
    "fontName": "Microsoft YaHei",
    "backgroundColor": "#ffffff",
    "shadow": {
      "h": 2,
      "v": 2,
      "blur": 4,
      "color": "#00000040"
    },
    "outline": {
      "width": 2,
      "color": "#cccccc",
      "style": "solid"
    }
  },
  "slides": [
    {
      "id": "slide-1",
      "type": "cover",
      "elements": [
        {
          "type": "text",
          "id": "title-1",
          "left": 100,
          "top": 200,
          "width": 800,
          "height": 100,
          "rotate": 0,
          "content": "<p style=\"text-align: center;\"><strong><span style=\"font-size: 48px;\">演示文稿标题</span></strong></p>",
          "defaultFontName": "Microsoft YaHei",
          "defaultColor": "#333333",
          "textType": "title"
        },
        {
          "type": "text",
          "id": "subtitle-1",
          "left": 100,
          "top": 320,
          "width": 800,
          "height": 60,
          "rotate": 0,
          "content": "<p style=\"text-align: center;\"><span style=\"font-size: 24px;\">副标题文本</span></p>",
          "defaultFontName": "Microsoft YaHei",
          "defaultColor": "#666666",
          "textType": "subtitle"
        },
        {
          "type": "shape",
          "id": "decoration-1",
          "left": 400,
          "top": 300,
          "width": 200,
          "height": 4,
          "rotate": 0,
          "viewBox": [200, 4],
          "path": "M 0 0 L 200 0 L 200 4 L 0 4 Z",
          "fill": "#5b9bd5",
          "fixedRatio": false
        }
      ],
      "background": {
        "type": "solid",
        "color": "#ffffff"
      }
    }
  ]
}
```

---

## 注册模板

创建好模板 JSON 文件后,需要在系统中注册:

1. 将 JSON 文件放入 `/public/mocks/` 目录
2. 在 `/src/store/slides.ts` 中添加模板配置:

```typescript
templates: [
  {
    name: '自定义模板',
    id: 'template_custom',
    cover: './imgs/template_custom.jpg'
  }
]
```

3. 准备封面图片 (推荐尺寸 400×225) 并放入 `/public/imgs/`

---

## 最佳实践

1. **保持一致性**: 使用统一的主题色和字体
2. **合理布局**: 注意元素间距和对齐
3. **适度装饰**: 避免过度使用阴影和边框
4. **测试预览**: 创建后及时测试各种场景
5. **版本控制**: 使用语义化的模板 ID
6. **文档注释**: 在 JSON 中添加必要的说明

---

## 常见问题

### Q: 如何调整元素层级?
A: 在 slides[].elements 数组中,靠后的元素会显示在上层

### Q: 如何实现元素组合?
A: 给多个元素设置相同的 groupId

### Q: 如何添加动画?
A: 在 slide 中添加 animations 数组配置动画效果

### Q: 支持哪些图片格式?
A: 支持 JPG、PNG、GIF、SVG 等常见格式

---

## 参考资源

- TypeScript 类型定义: `/src/types/slides.ts`
- 官方模板示例: `/public/mocks/template_*.json`
- 编辑器组件: `/src/views/Editor/`

---

**最后更新**: 2025-10-20
