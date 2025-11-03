<template>
  <div class="pptist-editor">
    <EditorHeader class="layout-header" :style="{ height: `${headerHeight}px`, overflow: 'hidden' }" />
    <div class="layout-content" :style="{ height: contentHeight }">
      <Thumbnails class="layout-content-left" :style="{ width: `${thumbnailsWidth}px` }" />
      <div class="layout-content-center" :style="{ width: `calc(100% - ${thumbnailsWidth}px - 260px)` }">
        <CanvasTool class="center-top" />
        <Canvas class="center-body" :style="{ height: `calc(100% - ${remarkHeight + 44}px)` }" />
        <Remark
          class="center-bottom"
          v-model:height="remarkHeight"
          :style="{ height: `${remarkHeight}px` }"
        />
      </div>
      <Toolbar class="layout-content-right" />

      <!-- 悬浮折叠按钮（固定位置，居中于缩略栏的 x/n 区域上方的线条） -->
      <button
        class="thumbnails-collapse-fab"
        :aria-label="thumbnailsCollapsed ? 'expand thumbnails' : 'collapse thumbnails'"
        @click="toggleThumbnailsCollapse"
      >
        <span v-if="thumbnailsCollapsed" class="fab-text">»</span>
        <span v-else class="fab-text">«</span>
      </button>
    </div>
  </div>

  <SelectPanel v-if="showSelectPanel" />
  <SearchPanel v-if="showSearchPanel" />
  <NotesPanel v-if="showNotesPanel" />
  <MarkupPanel v-if="showMarkupPanel" />
  <SymbolPanel v-if="showSymbolPanel" />

  <Modal
    :visible="!!dialogForExport" 
    :width="680"
    @closed="closeExportDialog()"
  >
    <ExportDialog />
  </Modal>

  <Modal
    :visible="showAIPPTDialog" 
    :width="720"
    :closeOnClickMask="false"
    :closeOnEsc="false"
    closeButton
    @closed="closeAIPPTDialog()"
  >
    <AIPPTDialog />
  </Modal>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import useGlobalHotkey from '@/hooks/useGlobalHotkey'
import usePasteEvent from '@/hooks/usePasteEvent'

import EditorHeader from './EditorHeader/index.vue'
import Canvas from './Canvas/index.vue'
import CanvasTool from './CanvasTool/index.vue'
import Thumbnails from './Thumbnails/index.vue'
import Toolbar from './Toolbar/index.vue'
import Remark from './Remark/index.vue'
import ExportDialog from './ExportDialog/index.vue'
import SelectPanel from './SelectPanel.vue'
import SearchPanel from './SearchPanel.vue'
import NotesPanel from './NotesPanel.vue'
import SymbolPanel from './SymbolPanel.vue'
import MarkupPanel from './MarkupPanel.vue'
import AIPPTDialog from './AIPPTDialog.vue'
import Modal from '@/components/Modal.vue'

const mainStore = useMainStore()
const { dialogForExport, showSelectPanel, showSearchPanel, showNotesPanel, showSymbolPanel, showMarkupPanel, showAIPPTDialog, thumbnailsCollapsed, headerCollapsed } = storeToRefs(mainStore)

const closeExportDialog = () => mainStore.setDialogForExport('')
const closeAIPPTDialog = () => mainStore.setAIPPTDialogState(false)

const remarkHeight = ref(40)

// 计算左侧栏宽度（折叠=0，完全隐藏）
const thumbnailsWidth = computed(() => thumbnailsCollapsed.value ? 0 : 160)

// 悬浮折叠按钮交互与持久化
const toggleThumbnailsCollapse = () => {
  const next = !thumbnailsCollapsed.value
  mainStore.setThumbnailsCollapsed(next)
  try {
    localStorage.setItem('pptist_thumbnails_collapsed', next ? '1' : '0')
  } catch {}
}

onMounted(() => {
  try {
    const saved = localStorage.getItem('pptist_thumbnails_collapsed')
    if (saved === '1') mainStore.setThumbnailsCollapsed(true)
  } catch {}
})

// 计算header高度和content高度
const headerHeight = computed(() => headerCollapsed.value ? 0 : 40)
const contentHeight = computed(() => `calc(100% - ${headerHeight.value}px)`)

useGlobalHotkey()
usePasteEvent()
</script>

<style lang="scss" scoped>
.pptist-editor {
  height: 100%;
  background-color: $backgroundGray;
}
.layout-header {
  transition: height $transitionDelay;
}
.layout-content {
  display: flex;
  transition: height $transitionDelay;
  position: relative; // 作为悬浮按钮定位参考
}
.layout-content-left {
  height: 100%;
  flex-shrink: 0;
  transition: width $transitionDelay;
  overflow: hidden;
}
.layout-content-center {
  background-color: $backgroundGray;
  padding: 8px 8px 8px 0;
  transition: width $transitionDelay;

  .center-top {
    height: 44px;
    margin-bottom: 8px;
    margin-left: 8px; // 与左侧 panel 拉开距离
  }
  .center-body {
    border-radius: $borderRadiusMedium;
    overflow: hidden;
    box-shadow: none; // 去掉阴影
    border: 0; // 去掉边框
    background-color: $backgroundGray; // 与主背景一致
  }
}
.layout-content-right {
  width: 260px;
  height: 100%;
}
.thumbnails-collapse-fab {
  position: absolute;
  left: 5px; // 靠近屏幕左侧，保留约 3-5px 间距
  bottom: 5px; // 让圆心落在 x/n 区域的垂直中线（20 - 30/2）
  width: 30px; // 稍微大一些
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  border: 1px solid $borderColor; // 圆圈描边
  background-color: rgba($color: $toolbarBackground, $alpha: .45); // 稍微增加常态半透明
  box-shadow: none; // 无阴影
  transition: background-color $transitionDelayFast, border-color $transitionDelayFast, transform $transitionDelayFast;

  &:hover { background-color: $toolbarBackground; }

  .fab-text {
    font-size: 16px; // 箭头大小
    color: rgba(0, 0, 0, .45); // 箭头更淡
    line-height: 1;
  }
  &:hover .fab-text {
    color: rgba(0, 0, 0, .62);
  }
}
</style>
