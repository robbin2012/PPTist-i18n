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
import { ref, computed } from 'vue'
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

// 计算左侧栏宽度
const thumbnailsWidth = computed(() => thumbnailsCollapsed.value ? 40 : 160)

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
    box-shadow: $panelShadow;
  }
}
.layout-content-right {
  width: 260px;
  height: 100%;
}
</style>
