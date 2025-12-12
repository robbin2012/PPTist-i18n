<template>
  <div class="canvas-tool">
    <div class="left-handler">
      <IconBack class="handler-item" :class="{ 'disable': !canUndo }" v-tooltip="t('toolbar.canvasTool.undo')" @click="undo()" />
      <IconNext class="handler-item" :class="{ 'disable': !canRedo }" v-tooltip="t('toolbar.canvasTool.redo')" @click="redo()" />
      <div class="more">
        <Divider type="vertical" style="height: 20px;" />
        <Popover class="more-icon" trigger="click" v-model:value="moreVisible" :offset="10">
          <template #content>
            <!-- <PopoverMenuItem class="popover-menu-item" center @click="toggleNotesPanel(); moreVisible = false"><IconComment class="icon" /> {{ t('toolbar.canvasTool.notesPanel') }}</PopoverMenuItem> -->
            <PopoverMenuItem class="popover-menu-item" center @click="toggleSelectPanel(); moreVisible = false"><IconMoveOne class="icon" /> {{ t('toolbar.canvasTool.selectPanel') }}</PopoverMenuItem>
            <PopoverMenuItem class="popover-menu-item" center @click="toggleSraechPanel(); moreVisible = false"><IconSearch class="icon" /> {{ t('toolbar.canvasTool.searchReplace') }}</PopoverMenuItem>
          </template>
          <IconMore class="handler-item" />
        </Popover>
        <!-- <IconComment class="handler-item" :class="{ 'active': showNotesPanel }" v-tooltip="t('toolbar.canvasTool.notesPanel')" @click="toggleNotesPanel()" /> -->
        <IconMoveOne class="handler-item" :class="{ 'active': showSelectPanel }" v-tooltip="t('toolbar.canvasTool.selectPanel')" @click="toggleSelectPanel()" />
        <IconSearch class="handler-item" :class="{ 'active': showSearchPanel }" v-tooltip="t('toolbar.canvasTool.searchReplace')" @click="toggleSraechPanel()" />
      </div>
    </div>

    <div class="add-element-handler">
      <div class="handler-item group-btn" v-tooltip="t('toolbar.canvasTool.insertText')">
        <IconFontSize class="icon" :class="{ 'active': creatingElement?.type === 'text' }" @click="drawText()" />
        
        <Popover trigger="click" v-model:value="textTypeSelectVisible" style="height: 100%;" :offset="10">
          <template #content>
            <PopoverMenuItem center @click="() => { drawText(); textTypeSelectVisible = false }"><IconTextRotationNone /> {{ t('toolbar.canvasTool.textboxHorizontal') }}</PopoverMenuItem>
            <PopoverMenuItem center @click="() => { drawText(true); textTypeSelectVisible = false }"><IconTextRotationDown /> {{ t('toolbar.canvasTool.textboxVertical') }}</PopoverMenuItem>
          </template>
          <IconDown class="arrow" />
        </Popover>
      </div>
      <div class="handler-item group-btn" v-tooltip="t('toolbar.canvasTool.insertShape')" :offset="10">
        <Popover trigger="click" style="height: 100%;" v-model:value="shapePoolVisible" :offset="10">
          <template #content>
            <ShapePool @select="shape => drawShape(shape)" />
          </template>
          <IconGraphicDesign class="icon" :class="{ 'active': creatingCustomShape || creatingElement?.type === 'shape' }" />
        </Popover>
        
        <Popover trigger="click" v-model:value="shapeMenuVisible" style="height: 100%;" :offset="10">
          <template #content>
            <PopoverMenuItem center @click="() => { drawCustomShape(); shapeMenuVisible = false }">{{ t('toolbar.canvasTool.freeDraw') }}</PopoverMenuItem>
          </template>
          <IconDown class="arrow" />
        </Popover>
      </div>
      <FileInput @change="files => insertImageElement(files)">
        <IconPicture class="handler-item" v-tooltip="t('toolbar.canvasTool.insertImage')" />
      </FileInput>
      <Popover trigger="click" v-model:value="linePoolVisible" :offset="10">
        <template #content>
          <LinePool @select="line => drawLine(line)" />
        </template>
        <IconConnection class="handler-item" :class="{ 'active': creatingElement?.type === 'line' }" v-tooltip="t('toolbar.canvasTool.insertLine')" />
      </Popover>
      <Popover trigger="click" v-model:value="chartPoolVisible" :offset="10">
        <template #content>
          <ChartPool @select="chart => { createChartElement(chart); chartPoolVisible = false }" />
        </template>
        <IconChartProportion class="handler-item" v-tooltip="t('toolbar.canvasTool.insertChart')" />
      </Popover>
      <Popover trigger="click" v-model:value="tableGeneratorVisible" :offset="10">
        <template #content>
          <TableGenerator
            @close="tableGeneratorVisible = false"
            @insert="({ row, col }) => { createTableElement(row, col); tableGeneratorVisible = false }"
          />
        </template>
        <IconInsertTable class="handler-item" v-tooltip="t('toolbar.canvasTool.insertTable')" />
      </Popover>
      <IconFormula class="handler-item" v-tooltip="t('toolbar.canvasTool.insertFormula')" @click="latexEditorVisible = true" />
      <Popover trigger="click" v-model:value="mediaInputVisible" :offset="10">
        <template #content>
          <MediaInput 
            @close="mediaInputVisible = false"
            @insertVideo="({ src, ext }) => { createVideoElement(src, ext); mediaInputVisible = false }"
            @insertAudio="({ src, ext }) => { createAudioElement(src, ext); mediaInputVisible = false }"
          />
        </template>
        <IconVideoTwo class="handler-item" v-tooltip="t('toolbar.canvasTool.insertMedia')" />
      </Popover>
      <IconSymbol class="handler-item" :class="{ 'active': showSymbolPanel }" v-tooltip="t('toolbar.canvasTool.insertSymbol')" @click="toggleSymbolPanel()" />
    </div>

    <div class="right-handler">
      <IconMinus class="handler-item viewport-size" v-tooltip="t('toolbar.canvasTool.zoomOut')" @click="scaleCanvas('-')" />
      <Popover trigger="click" v-model:value="canvasScaleVisible">
        <template #content>
          <PopoverMenuItem
            center
            v-for="item in canvasScalePresetList" 
            :key="item" 
            @click="applyCanvasPresetScale(item)"
          >{{item}}%</PopoverMenuItem>
          <PopoverMenuItem center @click="resetCanvas(); canvasScaleVisible = false">适应屏幕</PopoverMenuItem>
        </template>
        <span class="text">{{canvasScalePercentage}}</span>
      </Popover>
      <IconPlus class="handler-item viewport-size" v-tooltip="t('toolbar.canvasTool.zoomIn')" @click="scaleCanvas('+')" />
      <IconFullScreen class="handler-item viewport-size-adaptation" v-tooltip="t('toolbar.canvasTool.fitScreen')" @click="resetCanvas()" />
      <IconSave class="handler-item" :class="{ 'disable': isSaving }" v-tooltip="t('toolbar.canvasTool.save')" @click="saveToDrupal()" />
      <Popover trigger="click" v-model:value="exportMenuVisible" :offset="10">
        <template #content>
          <PopoverMenuItem class="popover-menu-item" center @click="quickExport('png')"><IconPicture class="icon" /> PNG</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" center @click="quickExport('jpeg')"><IconFileJpg class="icon" /> JPEG</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" center @click="quickExport('pptx')"><IconPpt class="icon" /> PPTX</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" center @click="quickExport('pdf')"><IconFilePdf class="icon" /> PDF</PopoverMenuItem>
        </template>
        <IconDownload class="handler-item" v-tooltip="t('toolbar.canvasTool.quickExport')" />
      </Popover>
      <IconPpt class="handler-item" v-tooltip="t('toolbar.canvasTool.play')" @click="enterScreening()" />
      <IconDown v-if="isFullMode" class="handler-item header-collapse-btn" :class="{ 'collapsed': headerCollapsed }" @click="toggleHeaderCollapse()" />
    </div>

    <Modal
      v-model:visible="latexEditorVisible" 
      :width="880"
    >
      <LaTeXEditor 
        @close="latexEditorVisible = false"
        @update="data => { createLatexElement(data); latexEditorVisible = false }"
      />
    </Modal>

    <!-- 用于导出的隐藏缩略图容器 -->
    <div class="export-thumbnails-container" v-show="isExporting">
      <div class="export-thumbnails" ref="exportThumbnailsRef">
        <ThumbnailSlide
          class="thumbnail"
          v-for="slide in slides"
          :key="slide.id"
          :slide="slide"
          :size="1600"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSnapshotStore, useSlidesStore } from '@/store'
import { getImageDataURL } from '@/utils/image'
import type { ShapePoolItem } from '@/configs/shapes'
import type { LinePoolItem } from '@/configs/lines'
import useScaleCanvas from '@/hooks/useScaleCanvas'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useCreateElement from '@/hooks/useCreateElement'
import useExport from '@/hooks/useExport'
import { print } from '@/utils/print'
import { toPng } from 'html-to-image'
import { saveSlides } from '@/services/drupal'
import message from '@/utils/message'

// 检查是否为 full 模式（只有 full 模式才显示菜单折叠按钮）
const isFullMode = computed(() => {
  return sessionStorage.getItem('pptist_mode') === 'full'
})

import ShapePool from './ShapePool.vue'
import LinePool from './LinePool.vue'
import ChartPool from './ChartPool.vue'
import TableGenerator from './TableGenerator.vue'
import MediaInput from './MediaInput.vue'
import LaTeXEditor from '@/components/LaTeXEditor/index.vue'
import FileInput from '@/components/FileInput.vue'
import Modal from '@/components/Modal.vue'
import Divider from '@/components/Divider.vue'
import Popover from '@/components/Popover.vue'
import PopoverMenuItem from '@/components/PopoverMenuItem.vue'
import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import { useI18n } from 'vue-i18n'
import useScreening from '@/hooks/useScreening'

const mainStore = useMainStore()
const { creatingElement, creatingCustomShape, showSelectPanel, showSearchPanel, showNotesPanel, showSymbolPanel, headerCollapsed } = storeToRefs(mainStore)
const { canUndo, canRedo } = storeToRefs(useSnapshotStore())
const slidesStore = useSlidesStore()
const { slides, viewportRatio, title, viewportSize, theme } = storeToRefs(slidesStore)

const { redo, undo } = useHistorySnapshot()
const { t } = useI18n()
const { exportImage, exportPPTX } = useExport()

const {
  scaleCanvas,
  setCanvasScalePercentage,
  resetCanvas,
  canvasScalePercentage,
} = useScaleCanvas()

const canvasScalePresetList = [200, 150, 125, 100, 75, 50]
const canvasScaleVisible = ref(false)

const applyCanvasPresetScale = (value: number) => {
  setCanvasScalePercentage(value)
  canvasScaleVisible.value = false
}

const {
  createImageElement,
  createChartElement,
  createTableElement,
  createLatexElement,
  createVideoElement,
  createAudioElement,
} = useCreateElement()
const { enterScreening } = useScreening()

const insertImageElement = (files: FileList) => {
  const imageFile = files[0]
  if (!imageFile) return
  getImageDataURL(imageFile).then(dataURL => createImageElement(dataURL))
}

const shapePoolVisible = ref(false)
const linePoolVisible = ref(false)
const chartPoolVisible = ref(false)
const tableGeneratorVisible = ref(false)
const mediaInputVisible = ref(false)
const latexEditorVisible = ref(false)
const textTypeSelectVisible = ref(false)
const shapeMenuVisible = ref(false)
const moreVisible = ref(false)
const exportMenuVisible = ref(false)
const isExporting = ref(false)
const exportThumbnailsRef = ref<HTMLElement>()
const isSaving = ref(false)
const storedUuid = (() => {
  try {
    return sessionStorage.getItem('pptist_drupal_uuid') || ''
  } catch {
    return ''
  }
})()
const storedContentType = (() => {
  try {
    const value = sessionStorage.getItem('pptist_drupal_content_type')
    return value === 'infographic_template' ? 'infographic_template' : 'aigc'
  } catch {
    return 'aigc'
  }
})()
const drupalUuid = ref(new URLSearchParams(window.location.search).get('uuid') || storedUuid)
const drupalContentType = ref<'aigc' | 'infographic_template'>(
  new URLSearchParams(window.location.search).get('content_type') === 'infographic_template'
    ? 'infographic_template'
    : storedContentType
)

// 绘制文字范围
const drawText = (vertical = false) => {
  mainStore.setCreatingElement({
    type: 'text',
    vertical,
  })
}

// 绘制形状范围
const drawShape = (shape: ShapePoolItem) => {
  mainStore.setCreatingElement({
    type: 'shape',
    data: shape,
  })
  shapePoolVisible.value = false
}
// 绘制自定义任意多边形
const drawCustomShape = () => {
  mainStore.setCreatingCustomShapeState(true)
  shapePoolVisible.value = false
}

// 绘制线条路径
const drawLine = (line: LinePoolItem) => {
  mainStore.setCreatingElement({
    type: 'line',
    data: line,
  })
  linePoolVisible.value = false
}

// 打开选择面板
const toggleSelectPanel = () => {
  mainStore.setSelectPanelState(!showSelectPanel.value)
}

// 打开搜索替换面板
const toggleSraechPanel = () => {
  mainStore.setSearchPanelState(!showSearchPanel.value)
}

// 打开批注面板
const toggleNotesPanel = () => {
  mainStore.setNotesPanelState(!showNotesPanel.value)
}

// 打开符号面板
const toggleSymbolPanel = () => {
  mainStore.setSymbolPanelState(!showSymbolPanel.value)
}

// 折叠顶部菜单栏
const toggleHeaderCollapse = () => {
  mainStore.setHeaderCollapsed(!headerCollapsed.value)
}

// 将所有幻灯片按顺序导出为单独的图片文件
const exportSlidesAsImages = async (format: 'png' | 'jpeg') => {
  isExporting.value = true
  await nextTick()

  const container = exportThumbnailsRef.value
  if (!container) {
    isExporting.value = false
    return
  }

  // 只选择每一页缩略图的根容器，避免选到文本里的 .thumbnail 样式
  const thumbnails = Array.from(container.querySelectorAll<HTMLElement>('.thumbnail-slide'))
  try {
    for (let index = 0; index < thumbnails.length; index++) {
      const el = thumbnails[index]
      const seq = String(index + 1).padStart(3, '0')
      const fileName = `${seq}.${format}`
      try {
        await exportImage(el, format, 1, false, fileName)
      } catch {
        // 单张失败继续导出后续图片
        // 错误提示已在 useExport 中处理
      }
    }
  } finally {
    isExporting.value = false
  }
}

// 快捷导出功能
const quickExport = async (format: 'png' | 'jpeg' | 'pptx' | 'pdf') => {
  exportMenuVisible.value = false

  if (format === 'pptx') {
    // 导出PPTX - 使用默认配置
    exportPPTX(slides.value, true, true)
  }
  else if (format === 'pdf') {
    // 导出PDF - 使用隐藏的缩略图容器
    isExporting.value = true
    await nextTick()

    setTimeout(() => {
      if (exportThumbnailsRef.value) {
        const pageSize = {
          width: 1600,
          height: 1600 * viewportRatio.value,
          margin: 50,
        }
        print(exportThumbnailsRef.value, pageSize)
        // 导出完成后隐藏容器
        setTimeout(() => {
          isExporting.value = false
        }, 500)
      }
    }, 200)
  }
  else {
    // PNG/JPEG 导出按幻灯片分开保存
    await exportSlidesAsImages(format)
  }
}

const dataUrlToFile = (dataUrl: string, fileName: string) => {
  try {
    const [meta, base64] = dataUrl.split(',')
    const mime = /data:(.*?);/.exec(meta)?.[1] || 'image/png'
    const bin = atob(base64)
    const len = bin.length
    const u8 = new Uint8Array(len)
    for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i)
    return new File([u8], fileName, { type: mime })
  } catch {
    return undefined
  }
}

const generateCoverFile = async () => {
  isExporting.value = true
  await nextTick()
  const firstThumbnail = exportThumbnailsRef.value?.querySelector<HTMLElement>('.thumbnail-slide')
  if (!firstThumbnail) throw new Error('no-thumbnail')
  const dataUrl = await toPng(firstThumbnail, { width: 1600 })
  return dataUrlToFile(dataUrl, 'pptist-cover.png')
}

const buildContentData = () => JSON.stringify({
  title: title.value,
  width: viewportSize.value,
  height: viewportSize.value * viewportRatio.value,
  theme: theme.value,
  slides: slides.value,
})

const saveToDrupal = async () => {
  if (isSaving.value) return
  isSaving.value = true
  try {
    if (!slides.value.length) {
      message.error(t('save.error'))
      return
    }

    const isInfographicTemplate = drupalContentType.value === 'infographic_template'
    if (isInfographicTemplate && !drupalUuid.value) {
      message.error(t('save.error'))
      return
    }

    let cover: File | undefined
    if (!isInfographicTemplate) {
      try {
        message.info(t('save.creatingCover'))
        cover = await generateCoverFile()
      } catch (err) {
        console.warn('[save] generate cover failed:', err)
      }
    }

    message.info(t('save.saving'))
    const result = await saveSlides({
      title: title.value || 'Untitled',
      data: buildContentData(),
      cover,
      uuid: drupalUuid.value || undefined,
      contentType: drupalContentType.value,
      fileName: isInfographicTemplate ? 'template.json' : undefined,
    })

    if (result?.uuid) {
      drupalUuid.value = result.uuid
      try {
        sessionStorage.setItem('pptist_drupal_uuid', result.uuid)
        sessionStorage.setItem('pptist_drupal_content_type', drupalContentType.value)
      } catch {}
    }
    message.success(t('save.success'))
  } catch (err: any) {
    if ((err as Error)?.message === 'unauthorized') message.error(t('save.unauthorized'))
    else message.error(t('save.error'))
  } finally {
    isSaving.value = false
    isExporting.value = false
  }
}
</script>

<style lang="scss" scoped>
.canvas-tool {
  position: relative;
  border: 0;
  background-color: #fff; // 主工具栏背景改为白色
  border-radius: 12px;
  box-shadow: rgba(64, 87, 109, 0.04) 0 0 0 1px, rgba(64, 87, 109, 0.3) 0 6px 20px -4px;
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
  user-select: none;
  z-index: 5;
  overflow: hidden;
}
.header-collapse-btn { transition: transform $transitionDelay; }
.header-collapse-btn.collapsed { transform: rotate(180deg); }
.left-handler, .more {
  display: flex;
  align-items: center;
}
.left-handler, .right-handler { padding: 0 4px; }
.more-icon {
  display: none;
}
.popover-menu-item {
  display: flex;
  padding: 8px 10px;

  .icon {
    font-size: 18px;
    margin-right: 8px;
  }
}
.add-element-handler {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;

  .handler-item {
    width: 32px;

    &:not(.group-btn):hover { background-color: $lightGray; } // 悬停浅灰

    &.active {
      color: $themeColor;
    }

    &.group-btn {
      width: auto;
      margin-right: 5px;

      &:hover { background-color: $lightGray; }

      .icon, .arrow {
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .icon {
        width: 26px;
        padding: 0 2px;

        &:hover { background-color: $lightGray; }
        &.active {
          color: $themeColor;
        }
      }
      .arrow {
        font-size: 12px;

        &:hover { background-color: $lightGray; }
      }
    }
  }
}
.handler-item {
  height: 30px;
  font-size: 14px;
  margin: 0 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: $borderRadius;
  overflow: hidden;
  cursor: pointer;

  &.disable {
    opacity: .5;
  }
}
.left-handler, .right-handler {
  .handler-item {
    padding: 0 8px;

    &.active,
    &:not(.disable):hover {
      background-color: $lightGray; // 悬停浅灰
    }
  }
}
.right-handler {
  display: flex;
  align-items: center;

  .text {
    display: inline-block;
    width: 40px;
    text-align: center;
    cursor: pointer;
  }

  .viewport-size {
    font-size: 13px;
  }
}

@media screen and (width <= 1200px) {
  .right-handler .text {
    display: none;
  }
  .more > .handler-item {
    display: none;
  }
  .more-icon {
    display: block;
  }
  .add-element-handler {
    .handler-item {
      width: 30px;
      margin: 0 1px;
    }
  }
}
@media screen and (width <= 1000px) {
  .left-handler, .right-handler {
    display: none;
  }
}

.export-thumbnails-container {
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 1600px;
  z-index: -1;
  opacity: 0;
  pointer-events: none;

  .export-thumbnails {
    background-color: #fff;
  }
}
</style>
