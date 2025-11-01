# UI 改造文档

## 📋 改造概述

将 PPTist 的 UI 升级为类似 Google Slides 的现代化风格，包括：
- 浅灰色背景
- 圆角卡片式面板
- 现代化阴影效果
- 可折叠的侧边栏
- 可折叠的顶部菜单栏

**改造日期**: 2025-11-01
**版本**: v2.0.0
**设计参考**: Google Slides

---

## 🎯 改造目标

### 视觉设计目标
1. ✅ 整体背景从纯白改为浅灰色 (#f9f9fb)
2. ✅ 面板背景保持白色，添加轻微阴影
3. ✅ 缩略图圆角从 2px 升级到 6px
4. ✅ 中部工具条浅灰蓝背景（#f0f4f9）+ 药丸圆角（18px）+ 轻描边（无强阴影）
5. ✅ Canvas 区域添加圆角和阴影包裹

### 交互功能目标
1. ✅ 左侧 Slides 栏可折叠（160px ↔ 40px）
2. ✅ 顶部 Header 可折叠（40px ↔ 0px）
3. ✅ 平滑的折叠/展开动画（0.2s）
4. ✅ 自动调整布局响应折叠状态

---

## 🎨 设计方案

### 配色方案（清爽灰调）

```scss
// 主要颜色
$backgroundGray: #f9f9fb;      // 主背景色（浅灰）
$panelBackground: #ffffff;     // 面板背景（纯白）
$toolbarBackground: #f0f4f9;   // 工具栏背景（Google Slides）
$borderColor: #e5e7eb;         // 边框颜色（灰色）

// 圆角
$borderRadius: 2px;            // 小圆角（保留原有）
$borderRadiusMedium: 6px;      // 中圆角（缩略图、画布）
$borderRadiusLarge: 8px;       // 大圆角（大型面板）

// 阴影
$panelShadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);

// 保留原有主题色
$themeColor: #d14424;          // 主题红色（不变）
```

### 布局结构

```
┌─────────────────────────────────────────────────────────┐
│ EditorHeader (可折叠)                 ▼折叠按钮在右侧栏 │
├──────┬───────────────────────────────────────┬──────────┤
│      │ CanvasTool                            │          │
│ Thum │ ┌─────────────────────────────────┐   │ Toolbar  │
│ bnai │ │                                 │   │          │
│ ls   │ │ Canvas (圆角+阴影)              │   │ ▼ 折叠   │
│      │ │                                 │   │ Header   │
│ >折  │ └─────────────────────────────────┘   │          │
│ 叠   │ Remark                                │          │
│      │                                       │          │
└──────┴───────────────────────────────────────┴──────────┘
```

---

## 🔧 技术实现

### 1. 全局样式变量

**文件**: `src/assets/styles/variable.scss`

**修改内容**:
```scss
// 新增 Google Slides 风格变量
$backgroundGray: #f9f9fb;      // 主背景色
$panelBackground: #ffffff;     // 面板背景
$toolbarBackground: #f0f4f9;   // 工具栏背景（Google Slides）
$borderRadiusLarge: 8px;       // 大圆角
$borderRadiusMedium: 6px;      // 中圆角
$panelShadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
```

**代码量**: +7 行

---

### 2. 状态管理

**文件**: `src/store/main.ts`

**新增状态**:
```typescript
export interface MainState {
  // ... 其他状态
  thumbnailsCollapsed: boolean  // 左侧缩略图栏折叠状态
  headerCollapsed: boolean      // 顶部菜单栏折叠状态
}
```

**新增方法**:
```typescript
setThumbnailsCollapsed(isCollapsed: boolean) {
  this.thumbnailsCollapsed = isCollapsed
}

setHeaderCollapsed(isCollapsed: boolean) {
  this.headerCollapsed = isCollapsed
}
```

**代码量**: +7 行

---

### 3. 主布局改造（含工具条微调）

**文件**: `src/views/Editor/index.vue`

#### 3.1 响应式宽度计算

```typescript
// 计算左侧栏宽度
const thumbnailsWidth = computed(() =>
  thumbnailsCollapsed.value ? 40 : 160
)

// 计算header高度和content高度
const headerHeight = computed(() =>
  headerCollapsed.value ? 0 : 40
)
const contentHeight = computed(() =>
  `calc(100% - ${headerHeight.value}px)`
)
```

#### 3.2 动态样式绑定

```vue
<template>
  <div class="pptist-editor">
    <!-- Header 可折叠 -->
    <EditorHeader
      class="layout-header"
      :style="{
        height: `${headerHeight}px`,
        overflow: 'hidden'
      }"
    />

    <div class="layout-content" :style="{ height: contentHeight }">
      <!-- 左侧栏可折叠 -->
      <Thumbnails
        class="layout-content-left"
        :style="{ width: `${thumbnailsWidth}px` }"
      />

      <!-- 中间区域自适应 -->
      <div
        class="layout-content-center"
        :style="{
          width: `calc(100% - ${thumbnailsWidth}px - 260px)`
        }"
      >
        <!-- Canvas 带圆角和阴影 -->
        <Canvas class="center-body" />
      </div>

      <Toolbar class="layout-content-right" />
    </div>
  </div>
</template>
```

#### 3.3 样式更新

```scss
.pptist-editor {
  height: 100%;
  background-color: $backgroundGray;  // 新增背景色
}

.layout-header {
  transition: height $transitionDelay;  // 平滑过渡
}

.layout-content {
  display: flex;
  transition: height $transitionDelay;
}

.layout-content-left {
  height: 100%;
  flex-shrink: 0;
  transition: width $transitionDelay;  // 平滑过渡
  overflow: hidden;
}

.layout-content-center {
  background-color: $backgroundGray;
  padding: 8px 8px 8px 0;
  transition: width $transitionDelay;

  .center-body {
    border-radius: $borderRadiusMedium;  // 圆角
    overflow: hidden;
    box-shadow: $panelShadow;  // 阴影
  }

  // 中部工具条区域高度与左侧间距
  .center-top {
    height: 44px;
    margin-bottom: 8px;
    margin-left: 8px; // 与左侧 Thumbnails 拉开距离
  }
}
```

**代码量**: +10 行新增，12 行修改

---

### 4. Thumbnails 折叠功能（极简折叠态）

**文件**: `src/views/Editor/Thumbnails/index.vue`

#### 4.1 顶部区域（展开/折叠）

```vue
<template>
  <!-- 展开：显示“新建 + 模板” -->
  <div class="add-slide" v-if="!thumbnailsCollapsed">
    <div class="btn" @click="createSlide()"><IconPlus class="icon" />{{ t('thumbnails.addSlide') }}</div>
    <Popover trigger="click" placement="bottom-start" v-model:value="presetLayoutPopoverVisible" center>
      <template #content>
        <Templates @select="slide => { createSlideByTemplate(slide); presetLayoutPopoverVisible = false }" />
      </template>
      <div class="select-btn"><IconDown /></div>
    </Popover>
  </div>

  <!-- 折叠：仅显示一个 + 按钮 -->
  <div class="add-slide collapsed" v-else>
    <div class="btn icon-only" @click="createSlide()"><IconPlus class="icon" /></div>
  </div>
```

#### 4.2 列表与页脚（展开/折叠）

```vue
<!-- 展开：显示缩略图列表 -->
<Draggable v-if="!thumbnailsCollapsed" class="thumbnail-list" ... />

<!-- 页脚：展开显示 x/n 居中；折叠隐藏 x/n，仅保留右侧箭头 -->
<div class="page-footer">
  <span class="count" v-if="!thumbnailsCollapsed">{{ slideIndex + 1 }}/{{ slides.length }}</span>
  <span class="collapse-circle" @click="toggleThumbnailsCollapse">
    <IconRight class="collapse-icon" :class="{ 'collapsed': thumbnailsCollapsed }" />
  </span>
  </div>
```

#### 4.3 样式（重点：折叠态极简）

```scss
.page-footer {
  height: 40px;
  font-size: 12px;
  border-top: 1px solid $borderColor;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: #666;

  .count { line-height: 1; }

  // 右侧箭头，无底色，只做颜色 hover
  .collapse-circle {
    width: 22px; height: 22px; border-radius: 50%;
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; transition: color $transitionDelayFast;

    .collapse-icon { font-size: 14px; color: #555; transition: transform $transitionDelay; }
    &:hover .collapse-icon { color: #333; }
    .collapse-icon.collapsed { transform: rotate(180deg); }
  }
}
```

```scss
.thumbnails {
  border-right: solid 1px $borderColor;
  background-color: $panelBackground;  // 白色背景
  box-shadow: $panelShadow;  // 阴影
  display: flex;
  flex-direction: column;
  user-select: none;
  z-index: 5;
  position: relative;
}

.thumbnail {
  border-radius: $borderRadiusMedium;  // 6px 圆角
  outline: 2px solid rgba($color: $themeColor, $alpha: .15);
}
```

**代码量**: +30 行新增，6 行修改

---

### 5. Header 折叠入口（移动至中部工具条右侧）

为减少视觉干扰与重复，顶部 Header 的折叠入口从右侧属性面板 Toolbar 移动到中部工具条（CanvasTool）的最右侧。

**文件**: `src/views/Editor/CanvasTool/index.vue`

```vue
<div class="right-handler">
  <!-- 缩放/适应屏幕 -->
  <IconMinus class="handler-item" @click="scaleCanvas('-')" />
  <Popover v-model:value="canvasScaleVisible"> ... </Popover>
  <IconPlus class="handler-item" @click="scaleCanvas('+')" />
  <IconFullScreen class="handler-item" @click="resetCanvas()" />

  <!-- Header 折叠入口（最右侧） -->
  <IconDown class="handler-item header-collapse-btn" :class="{ 'collapsed': headerCollapsed }" @click="toggleHeaderCollapse()" />
</div>
```

```ts
const { headerCollapsed } = storeToRefs(mainStore)
const toggleHeaderCollapse = () => mainStore.setHeaderCollapsed(!headerCollapsed.value)
```

```scss
.header-collapse-btn { transition: transform $transitionDelay; }
.header-collapse-btn.collapsed { transform: rotate(180deg); }
```

---

### 6. 其他面板样式升级

#### 6.1 EditorHeader

**文件**: `src/views/Editor/EditorHeader/index.vue`

```scss
.editor-header {
  background-color: $panelBackground;  // 白色背景
  user-select: none;
  border-bottom: 1px solid $borderColor;
  box-shadow: $panelShadow;  // 新增阴影
  display: flex;
  justify-content: space-between;
  padding: 0 5px;
  z-index: 10;
  position: relative;
}
```

**代码量**: 4 行修改

---

#### 6.2 CanvasTool

**文件**: `src/views/Editor/CanvasTool/index.vue`

```scss
.canvas-tool {
  position: relative;
  border: 1px solid $borderColor;      // 轻描边
  background-color: $toolbarBackground; // 浅灰蓝背景 #f0f4f9
  border-radius: 18px;                  // 药丸圆角
  box-shadow: none;                     // 无强阴影
  display: flex;
  justify-content: space-between;
  padding: 4px 12px;                    // 更舒适的内边距
  font-size: 13px;
  user-select: none;
  z-index: 5;
}
```

---


## 🎬 动画效果

所有折叠/展开操作都使用平滑过渡动画：

```scss
// 过渡时间配置
$transitionDelay: 0.2s;        // 标准过渡时间
$transitionDelayFast: 0.1s;    // 快速过渡时间

// 应用场景
.layout-header { transition: height $transitionDelay; }         // Header 高度变化
.layout-content-left { transition: width $transitionDelay; }    // Thumbnails 宽度变化
.header-collapse-btn { transition: transform $transitionDelay; }
.header-collapse-btn.collapsed { transform: rotate(180deg); }
.collapse-circle .collapse-icon { transition: transform $transitionDelay; }
```

---

## 🚀 使用指南

### 功能使用

#### 1. 折叠左侧 Slides 栏
- **位置**: 左侧栏底部
- **按钮**: `>` 箭头图标
- **效果**:
  - 展开状态：160px 宽度，显示完整缩略图
  - 折叠状态：40px 宽度，仅显示折叠按钮
  - 中间画布区域自动调整宽度

#### 2. 折叠顶部 Header
- **位置**: 右侧工具栏顶部
- **按钮**: `∨` 下箭头图标
- **效果**:
  - 展开状态：显示完整的 EditorHeader（40px 高度）
  - 折叠状态：完全隐藏 Header（0px 高度）
  - 内容区域自动占满全屏

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 访问地址
http://localhost:51711/
http://192.168.6.33:51711/
```

---

## 🔍 技术亮点

### 1. 响应式计算属性

使用 Vue 3 的 `computed` 实现动态宽度/高度计算：

```typescript
const thumbnailsWidth = computed(() => thumbnailsCollapsed.value ? 40 : 160)
const headerHeight = computed(() => headerCollapsed.value ? 0 : 40)
const contentHeight = computed(() => `calc(100% - ${headerHeight.value}px)`)
```

### 2. 平滑过渡动画

所有尺寸变化都添加 CSS `transition`：

```scss
.layout-content-left {
  transition: width $transitionDelay;
}
```

### 3. 统一状态管理

使用 Pinia store 集中管理折叠状态：

```typescript
// store/main.ts
thumbnailsCollapsed: boolean
headerCollapsed: boolean

// 组件中使用
const { thumbnailsCollapsed } = storeToRefs(mainStore)
mainStore.setThumbnailsCollapsed(true)
```

### 4. 图标旋转动画

按钮图标通过 CSS `transform` 实现旋转：

```scss
.collapse-icon {
  transition: transform $transitionDelay;

  &.collapsed {
    transform: rotate(180deg);
  }
}
```

### 5. 自适应布局

使用 CSS `calc()` 实现动态宽度计算：

```vue
<div :style="{
  width: `calc(100% - ${thumbnailsWidth}px - 260px)`
}">
```

---

## 📝 设计规范

### 间距规范
- **面板边距**: 8px
- **按钮高度**: 28-30px
- **边框宽度**: 1px

### 圆角规范
- **小圆角**: 2px（保留原有）
- **中圆角**: 6px（缩略图、画布）
- **大圆角**: 8px（大型面板）

### 阴影规范
```scss
$panelShadow:
  0 1px 3px rgba(0, 0, 0, 0.12),  // 主阴影
  0 1px 2px rgba(0, 0, 0, 0.06);  // 次阴影
```

### 颜色规范
- **主背景**: #f9f9fb（浅灰）
- **面板背景**: #ffffff（纯白）
- **边框颜色**: #e5e7eb（灰色）
- **主题色**: #d14424（红色，保持不变）
- **文本颜色**: #666（中灰）

---

## 🐛 已知问题

目前无已知问题。

---

## 🔮 未来优化方向

### 可选增强功能

1. **状态持久化**
   - 使用 `localStorage` 保存折叠状态
   - 刷新页面后保持用户的折叠偏好

2. **快捷键支持**
   - 添加键盘快捷键控制折叠/展开
   - 例如：`Ctrl + B` 切换左侧栏

3. **更多主题**
   - 支持切换不同配色主题
   - 暗色模式支持

4. **动画优化**
   - 添加更多微交互动画
   - 改进过渡曲线（使用 `cubic-bezier`）

5. **响应式优化**
   - 小屏幕自动折叠侧边栏
   - 移动端适配

---

## 📚 参考资料

- [Google Slides](https://slides.google.com/) - 设计参考
- [Vue 3 Documentation](https://vuejs.org/) - Vue 3 官方文档
- [Pinia Documentation](https://pinia.vuejs.org/) - 状态管理
- [Sass Documentation](https://sass-lang.com/) - SCSS 样式

---

## 👥 贡献者

- **设计与实现**: Claude Code
- **需求提出**: 项目维护者
- **测试验证**: 开发团队

---

## 📄 许可证

遵循项目原有许可证。

---

**最后更新**: 2025-11-01
**文档版本**: v1.0.0
