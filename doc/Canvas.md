## 画布与元素

#### 编辑器的基本结构
```
└──编辑器
    ├── 顶部菜单栏
    ├── 左侧导航栏
    ├── 右侧导航栏
    ├── 中上部插入/工具栏
    ├── 底部演讲者备注
    └── 画布
         ├── 可视区域
         │    ├── 可编辑元素
         │    └── 鼠标选框
         │
         └── 画布工具
              ├── 参考线
              ├── 标尺
              ├── 元素操作节点层（如拖拽缩放点）
              ├── 吸附对齐线
              └── 可视区域背景
```

#### 画布的基本原理
我们把关注点放在相对复杂的【画布】部分。画布中的每一个元素都由一组数据来描述，例如：
```typescript
interface PPTBaseElement {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}
```
顾名思义，`left` 表示元素距离画布左上角的位置，`width` 表示元素的宽度，以此类推。
重点需要知道的是：可视区域默认以 宽1000像素 、高562.5像素为基础比例。即无论画布和可视区域实际大小是多少，一个 `{ width: 1000px, height: 562.5px, left: 0, top: 0 }` 的元素一定会正好铺满整个可视区域。
具体实现的方法很简单：假设可视区域的实际宽度为 1200px ，计算出此时的缩放比为 1200 / 1000 = 1.2 ，然后将可视区域内的元素全部缩放到 1.2 倍即可。
同理【缩略图】 和 【放映页面】 其实上就是一个实际大小更小或更大的可视区域。
> 注：1000×562.5的宽高是可以通过修改`src/store/slides.ts`中的`viewportSize`来调整的。

#### 画布内的元素
除了上述中的位置和尺寸信息，还可以携带更多的数据，以一个文本元素为例：
```typescript
interface PPTTextElement {
  type: 'text';
  id: string;
  left: number;
  top: number;
  lock?: boolean;
  groupId?: string;
  width: number;
  height: number;
  link?: string;
  content: string;
  rotate: number;
  defaultFontName: string;
  defaultColor: string;
  outline?: PPTElementOutline;
  fill?: string;
  lineHeight?: number;
  wordSpace?: number;
  opacity?: number;
  shadow?: PPTElementShadow;
}
```
你可以定义一个 `rotate` 来表示文本框旋转的角度、定义一个 `opacity` 来表示文本框的透明度 等。在实现时只需要按照你所定义的数据来渲染元素组件即可，而编辑元素的本质就是在修改这些数据。
以上就是一个画布最基本的组成了。

#### 导入文件时的 Viewport 行为

当导入外部文件（`.pptist` / `.json` / `.pptx`）时，系统会自动处理 viewport 的适配，确保导入的内容能够正确显示。

**核心原则**：**后导入的文件的 viewport 成为主 viewport，之前的所有幻灯片会自动适应新的尺寸**。

##### 导入 .pptist 和 .json 文件

当导入 `.pptist` 或 `.json` 格式的文件时：

1. **读取原始 viewport 信息**：系统从文件数据中提取 `width` 和 `height` 字段
2. **恢复 viewport 设置**：
   ```typescript
   if (width && height) {
     slidesStore.setViewportSize(width)           // 设置画布宽度基数
     slidesStore.setViewportRatio(height / width)  // 设置画布宽高比
   }
   ```
3. **自动缩放现有内容**：现有的所有幻灯片会自动缩放以适应新的 viewport

**示例**：
- 当前 PPT 的 viewport：1000 × 562.5 (16:9)
- 导入文件的 viewport：800 × 600 (4:3)
- **结果**：系统会将 viewport 改为 800 × 600，所有现有幻灯片会按新比例重新显示

##### 导入 .pptx 文件

导入 `.pptx` 文件时，支持两种模式：

**默认模式**（`fixedViewport=false`）：
- 根据 PPTX 文件的原始尺寸动态设置 viewport
- 计算公式：`viewportSize = pptxWidth × (96 / 72)`
- 适用场景：希望完全保留 PPTX 的原始尺寸比例

**固定 viewport 模式**（`fixedViewport=true`）：
- 使用固定比例将 PPTX 内容缩放到 1000px 基准
- 计算公式：`ratio = 1000 / pptxWidth`
- 适用场景：希望统一所有导入内容的画布尺寸

##### AI 信息图的 Viewport 处理

当使用 AI 信息图功能生成新幻灯片时：

1. **读取模板 viewport**：从上传的模板文件中提取 `width` 和 `height`
2. **设置为主 viewport**：
   ```typescript
   slidesStore.setViewportSize(templateWidth)
   slidesStore.setViewportRatio(templateHeight / templateWidth)
   ```
3. **插入生成的幻灯片**：新生成的幻灯片会按照模板的 viewport 显示
4. **现有内容自动适配**：如果当前 PPT 已有内容，会自动缩放以适应新 viewport

**重要提示**：
- viewport 的改变会影响所有幻灯片的显示尺寸
- 这是为了保证视觉一致性，避免不同来源的幻灯片出现尺寸不匹配
- 如果不希望改变现有 PPT 的 viewport，建议先调整模板文件的尺寸

##### 相关代码

- 导入逻辑：`src/hooks/useImport.ts` (line 54-58, 87-92, 297-298)
- Viewport 管理：`src/store/slides.ts` (setViewportSize, setViewportRatio)
- AI 信息图：`src/views/Editor/AIInfographicDialog.vue` (需要实现 viewport 适配)
