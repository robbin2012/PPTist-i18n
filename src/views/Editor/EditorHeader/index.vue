<template>
  <div class="editor-header">
    <div class="left">
      <Popover trigger="click" placement="bottom-start" v-model:value="mainMenuVisible">
        <template #content>
          <div class="main-menu">
            <div class="ai-menu" @click="openAIPPTDialog(); mainMenuVisible = false">
              <div class="icon"><IconClick theme="two-tone" :fill="['#ffc158', '#fff']" /></div>
              <div class="aippt-content">
                <div class="aippt"><span>AIPPT</span></div>
                <div class="aippt-subtitle">{{ t('header.aipptSubtitle') }}</div>
              </div>
            </div>
          </div>
          <Divider :margin="10" />
          <div class="import-section">
            <div class="import-label">{{ t('header.import.label') }}</div>
            <div class="import-grid">
              <FileInput class="import-block" accept="application/vnd.openxmlformats-officedocument.presentationml.presentation" @change="files => {
                importPPTXFile(files)
                mainMenuVisible = false
              }">
                <span class="icon"><IconFilePdf theme="multi-color" :fill="['#333', '#d14424', '#fff']" /></span>
                <span class="label">PPTX</span>
                <span class="sub-label">{{ t('header.import.testOnly') }}</span>
              </FileInput>
              <FileInput class="import-block" accept=".json" @change="files => {
                importJSON(files)
                mainMenuVisible = false
              }">
                <span class="icon"><IconFileJpg theme="multi-color" :fill="['#333', '#d14424', '#fff']" /></span>
                <span class="label">JSON</span>
                <span class="sub-label">{{ t('header.import.testOnly') }}</span>
              </FileInput>
              <FileInput class="import-block" accept=".pptist" @change="files => {
                importSpecificFile(files)
                mainMenuVisible = false
              }">
                <span class="icon"><IconNotes theme="multi-color" :fill="['#333', '#d14424', '#fff']" /></span>
                <span class="label">PPTIST</span>
                <span class="sub-label">{{ t('header.import.proprietary') }}</span>
              </FileInput>
            </div>
          </div>
          <Divider :margin="10" />
          <PopoverMenuItem class="popover-menu-item" @click="setDialogForExport('pptx')"><IconDownload class="icon" /> {{ t('header.menu.export') }}</PopoverMenuItem>
          <Divider :margin="10" />
          <PopoverMenuItem class="popover-menu-item" @click="resetSlides(); mainMenuVisible = false"><IconRefresh class="icon" /> {{ t('header.menu.reset') }}</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="openMarkupPanel(); mainMenuVisible = false"><IconMark class="icon" /> {{ t('header.menu.markup') }}</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="mainMenuVisible = false; hotkeyDrawerVisible = true"><IconCommand class="icon" /> {{ t('header.menu.hotkeys') }}</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="goLink('https://github.com/pipipi-pikachu/PPTist/issues')"><IconComment class="icon" /> {{ t('header.menu.feedback') }}</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="goLink('https://github.com/pipipi-pikachu/PPTist/blob/master/doc/Q&A.md')"><IconHelpcenter class="icon" /> {{ t('header.menu.faq') }}</PopoverMenuItem>
          <Divider :margin="10" />
          <div class="statement">{{ t('header.menu.statement') }}</div>
        </template>
        <div class="menu-item"><IconHamburgerButton class="icon" /></div>
      </Popover>

      <div class="title">
        <Input 
          class="title-input" 
          ref="titleInputRef"
          v-model:value="titleValue" 
          @blur="handleUpdateTitle()" 
          v-if="editingTitle" 
        ></Input>
        <div
          class="title-text"
          @click="startEditTitle()"
          :title="title"
          v-else
        >{{ title }}</div>
      </div>
    </div>

    <div class="right">
      <div class="group-menu-item">
        <div class="menu-item" v-tooltip="t('header.tooltip.screening')" @click="enterScreening()">
          <IconPpt class="icon" />
        </div>
        <Popover trigger="click" center>
          <template #content>
            <PopoverMenuItem class="popover-menu-item" @click="enterScreeningFromStart()"><IconSlideTwo class="icon" /> {{ t('header.menu.fromStart') }}</PopoverMenuItem>
            <PopoverMenuItem class="popover-menu-item" @click="enterScreening()"><IconPpt class="icon" /> {{ t('header.menu.fromCurrent') }}</PopoverMenuItem>
          </template>
          <div class="arrow-btn"><IconDown class="arrow" /></div>
        </Popover>
      </div>
      <div class="menu-item" v-tooltip="t('header.tooltip.ai')" @click="openAIPPTDialog(); mainMenuVisible = false">
        <span class="text ai">AI</span>
      </div>
      <div class="menu-item" v-tooltip="t('header.tooltip.export')" @click="setDialogForExport('pptx')">
        <IconDownload class="icon" />
      </div>
      <a class="github-link" v-tooltip="t('header.githubTooltip')" href="https://github.com/pipipi-pikachu/PPTist" target="_blank">
        <div class="menu-item"><IconGithub class="icon" /></div>
      </a>
    </div>

    <Drawer
      :width="320"
      v-model:visible="hotkeyDrawerVisible"
      placement="right"
    >
      <HotkeyDoc />
          <template v-slot:title>{{ t('header.menu.hotkeys') }}</template>
        </Drawer>

    <FullscreenSpin :loading="exporting" :tip="t('import.loading')" />
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import useScreening from '@/hooks/useScreening'
import useImport from '@/hooks/useImport'
import useSlideHandler from '@/hooks/useSlideHandler'
import type { DialogForExportTypes } from '@/types/export'

import HotkeyDoc from './HotkeyDoc.vue'
import FileInput from '@/components/FileInput.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import Drawer from '@/components/Drawer.vue'
import Input from '@/components/Input.vue'
import Popover from '@/components/Popover.vue'
import PopoverMenuItem from '@/components/PopoverMenuItem.vue'
import Divider from '@/components/Divider.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { t } = useI18n()
const { title } = storeToRefs(slidesStore)
const { enterScreening, enterScreeningFromStart } = useScreening()
const { importSpecificFile, importPPTXFile, importJSON, exporting } = useImport()
const { resetSlides } = useSlideHandler()

const mainMenuVisible = ref(false)
const hotkeyDrawerVisible = ref(false)
const editingTitle = ref(false)
const titleValue = ref('')
const titleInputRef = useTemplateRef<InstanceType<typeof Input>>('titleInputRef')

const startEditTitle = () => {
  titleValue.value = title.value
  editingTitle.value = true
  nextTick(() => titleInputRef.value?.focus())
}

const handleUpdateTitle = () => {
  slidesStore.setTitle(titleValue.value)
  editingTitle.value = false
}

const goLink = (url: string) => {
  window.open(url)
  mainMenuVisible.value = false
}

const setDialogForExport = (type: DialogForExportTypes) => {
  mainStore.setDialogForExport(type)
  mainMenuVisible.value = false
}

const openMarkupPanel = () => {
  mainStore.setMarkupPanelState(true)
}

const openAIPPTDialog = () => {
  mainStore.setAIPPTDialogState(true)
}
</script>

<style lang="scss" scoped>
.editor-header {
  // 渐变背景（参考 Canva 顶部导航）
  background-image: linear-gradient(90deg, #00c4cc, #7d2ae8);
  user-select: none;
  border-bottom: 1px solid $borderColor;
  box-shadow: none;
  display: flex;
  justify-content: space-between;
  padding: 0 5px;
  // iOS 安全区域内边距（不改动结构，仅补充），需要放在 padding 之后覆盖
  padding-left: calc(5px + var(--safe-area-inset-left, 0px));
  padding-right: calc(5px + var(--safe-area-inset-right, 0px));
  z-index: 10;
  position: relative;
}
.left, .right {
  display: flex;
  justify-content: center;
  align-items: center;
}
.menu-item {
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  padding: 0 10px;
  border-radius: $borderRadius;
  cursor: pointer;
  color: #fff;

  .icon {
    font-size: 18px;
    color: #fff;
  }
  .text {
    width: 18px;
    text-align: center;
    font-size: 17px;
  }
  .ai {
    background: linear-gradient(270deg, #d897fd, #33bcfc);
    background-clip: text;
    color: transparent;
    font-weight: 700;
  }
}
.right {
  .menu-item {
    border: 1px solid rgba(255, 255, 255, .45);
    border-radius: 8px;
    background-color: transparent;
  }
  // 控制右侧按钮间距：分组与独立按钮统一为 8px
  .group-menu-item {
    margin: 0;         // 先清空通用左右 8px
    margin-right: 8px; // 仅保留右侧 8px，与后续按钮保持间距
  }
  > .menu-item {       // 右侧直接子级按钮（AI、导出）
    margin-left: 8px;
  }
  > .github-link {     // GitHub 按钮
    margin-left: 8px;
  }

  .group-menu-item {
    // no hover effect for group container
    &:hover { background-color: transparent; }
    // 作为一个整体显示边框和圆角
    border: 1px solid rgba(255, 255, 255, .45);
    border-radius: 8px;
    background-color: transparent;
    overflow: hidden;

    // 组内的两个子块不再单独带边框
    .menu-item {
      border: 0;
      border-radius: 0;
      background-color: transparent;
      // no hover effect per request
    }
    .arrow-btn {
      height: 30px;
      padding: 0 8px;
      border: 0;
      border-radius: 0;
      background-color: transparent;
      // no hover effect per request
    }
  }
}
.popover-menu-item {
  display: flex;
  padding: 8px 10px;

  .icon {
    font-size: 18px;
    margin-right: 12px;
  }
}
.statement {
  font-size: 12px;
  color: #999;
  padding: 8px 10px;
  font-style: italic;
}
.main-menu {
  width: 300px;
}
.ai-menu {
  background: linear-gradient(270deg, #f8edff, #d4f1ff);
  color: $themeColor;
  border-radius: $borderRadius;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;

  .icon {
    font-size: 22px;
    margin-right: 16px;
  }
  .aippt-content {
    display: flex;
    flex-direction: column;
  }
  .aippt {
    font-weight: 700;
    font-size: 16px;

    span {
      background: linear-gradient(270deg, #d897fd, #33bcfc);
      background-clip: text;
      color: transparent;
    }
  }
  .aippt-subtitle {
    font-size: 12px;
    color: #777;
    margin-top: 5px;
  }
}

.import-section {
  padding: 5px 0;

  .import-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 6px;
  }
  .import-grid {
    display: flex;
    gap: 8px;
    justify-content: space-between;
  }
  .import-block {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 8px;
    border-radius: $borderRadius;
    border: 1px solid $borderColor;
    transition: background-color .2s;
    cursor: pointer;
  
    &:hover {
      background-color: #f1f1f1;
    }
    .icon {
      font-size: 24px;
      margin-bottom: 2px;
    }
    .label {
      font-size: 12px;
      text-align: center;
    }
    .sub-label {
      font-size: 10px;
      color: #999;
    }
  }
}

.group-menu-item {
  height: 30px;
  display: flex;
  margin: 0 8px;
  padding: 0 2px;
  border-radius: $borderRadius;


  .menu-item {
    padding: 0 3px;
  }
  .arrow-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    color: #fff;
  }
}
.title {
  height: 30px;
  margin-left: 2px;
  font-size: 13px;

  .title-input {
    width: 200px;
    height: 100%;
    padding-left: 0;
    padding-right: 0;

    ::v-deep(input) {
      height: 28px;
      line-height: 28px;
    }
  }
  .title-text {
    min-width: 20px;
    max-width: 400px;
    line-height: 30px;
    padding: 0 6px;
    border-radius: $borderRadius;
    cursor: pointer;

    @include ellipsis-oneline();

    &:hover {
      background-color: #f1f1f1;
    }
  }
}
.github-link {
  display: inline-block;
  height: 30px;
}
</style>
const { t } = useI18n()
