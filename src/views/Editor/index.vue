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

      <!-- 悬浮折叠按钮（侧边栏伸缩） -->
      <button
        class="thumbnails-collapse-fab"
        :aria-label="thumbnailsCollapsed ? 'expand thumbnails' : 'collapse thumbnails'"
        @click="toggleThumbnailsCollapse"
        :style="{ left: `${thumbnailsWidth}px` }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16" version="1.1" style="width: 1em; height: 1em;"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><line x1="2" y1="6.5" x2="14" y2="6.5" id="路径-159" stroke="currentColor"></line><line x1="2" y1="9.5" x2="14" y2="9.5" id="路径-159" stroke="currentColor"></line></g></svg>
      </button>

      <!-- AI助手悬浮按钮（右侧固定位置） -->
      <button
        class="ai-panel-fab"
        :class="{ 'active': showAIPanel }"
        :aria-label="'AI Assistant'"
        @click="toggleAIPanel"
      >
        <IconMagic />
      </button>
    </div>
  </div>

  <SelectPanel v-if="showSelectPanel" />
  <SearchPanel v-if="showSearchPanel" />
  <NotesPanel v-if="showNotesPanel" />
  <MarkupPanel v-if="showMarkupPanel" />
  <SymbolPanel v-if="showSymbolPanel" />
  <AIPanel v-if="showAIPanel" />

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

  <Modal
    :visible="showAIInfographicDialog"
    :width="680"
    :closeOnClickMask="false"
    :closeOnEsc="false"
    closeButton
    @closed="closeAIInfographicDialog()"
  >
    <AIInfographicDialog />
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
import AIPanel from './AIPanel.vue'
import AIPPTDialog from './AIPPTDialog.vue'
import AIInfographicDialog from './AIInfographicDialog.vue'
import Modal from '@/components/Modal.vue'

const mainStore = useMainStore()
const { dialogForExport, showSelectPanel, showSearchPanel, showNotesPanel, showSymbolPanel, showMarkupPanel, showAIPanel, showAIPPTDialog, showAIInfographicDialog, thumbnailsCollapsed, headerCollapsed } = storeToRefs(mainStore)

const closeExportDialog = () => mainStore.setDialogForExport('')
const closeAIPPTDialog = () => mainStore.setAIPPTDialogState(false)
const closeAIInfographicDialog = () => mainStore.setAIInfographicDialogState(false)

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

// AI助手面板切换
const toggleAIPanel = () => {
  mainStore.setAIPanelState(!showAIPanel.value)
}

  onMounted(() => {
    try {
      const saved = localStorage.getItem('pptist_thumbnails_collapsed')
      // 如果没有记录（null）或者记录为 '1'，则折叠；只有明确为 '0' 才展开
      if (saved !== '0') mainStore.setThumbnailsCollapsed(true)
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
  top: 50%;
  margin-left: -31px; // (80 - 18) / 2 = 31 offset
  width: 5rem; 
  height: 1.125rem;
  
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  
  border: 1px solid #e0e0e0; // gray-10 equivalent
  border-bottom: none;
  border-radius: .5rem .5rem 0 0;
  background-color: $backgroundGray;
  color: #c1c1c1; // gray-70 equivalent
  
  transform: translateY(-50%) rotate(90deg);
  transition: left $transitionDelay, background-color $transitionDelayFast, color $transitionDelayFast, border-color $transitionDelayFast;

  &:hover { 
    background-color: #f1f3f4;
    color: $textColor; 
    border-color: #d0d0d0;
  }
}
.ai-panel-fab {
  display: flex;
  position: absolute;
  right: 270px; // 距离右侧工具栏 260px + 10px 间距
  bottom: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  border: 1px solid $borderColor;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all $transitionDelayFast;
  font-size: 24px;
  color: #666;

  &:hover {
    background-color: $themeColor;
    color: #fff;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &.active {
    background-color: $themeColor;
    color: #fff;
  }
}
</style>
