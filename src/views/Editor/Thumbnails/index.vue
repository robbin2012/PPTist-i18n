<template>
  <div 
    class="thumbnails"
    @mousedown="() => setThumbnailsFocus(true)"
    v-click-outside="() => setThumbnailsFocus(false)"
    v-contextmenu="contextmenusThumbnails"
  >
    <div class="add-slide" v-if="!thumbnailsCollapsed">
      <div class="btn" @click="createSlide()"><IconPlus class="icon" />{{ t('thumbnails.addSlide') }}</div>
      <Popover trigger="click" placement="bottom-start" v-model:value="presetLayoutPopoverVisible" center>
        <template #content>
          <Templates 
            @select="slide => { createSlideByTemplate(slide); presetLayoutPopoverVisible = false }"
            @selectAll="slides => { insertAllTemplates(slides); presetLayoutPopoverVisible = false }"
          />
        </template>
        <div class="select-btn"><IconDown /></div>
      </Popover>
    </div>
    <div class="add-slide collapsed" v-else>
      <div class="btn icon-only" @click="createSlide()"><IconPlus class="icon" /></div>
    </div>

    <Draggable v-if="!thumbnailsCollapsed"
      class="thumbnail-list"
      ref="thumbnailsRef"
      :modelValue="slides"
      :animation="200"
      :scroll="true"
      :scrollSensitivity="50"
      :disabled="editingSectionId"
      @end="handleDragEnd"
      itemKey="id"
    >
      <template #item="{ element, index }">
        <div class="thumbnail-container">
          <div class="section-title"
            :data-section-id="element?.sectionTag?.id || ''"
            v-if="element.sectionTag || (hasSection && index === 0)" 
            v-contextmenu="contextmenusSection"
            @dblclick="() => editSection(element?.sectionTag?.id || '')"
          >
            <input 
              :id="`section-title-input-${element?.sectionTag?.id || 'default'}`" 
              type="text"
              :value="element?.sectionTag?.title || ''"
              :placeholder="t('thumbnails.section.inputPlaceholder')"
              @blur="$event => saveSection($event)"
              @keydown.enter.stop="$event => saveSection($event)"
              v-if="editingSectionId === element?.sectionTag?.id || (index === 0 && editingSectionId === 'default')"
            >
            <span class="text" v-else>
              <div class="text-content">{{ element?.sectionTag ? (element?.sectionTag?.title || t('thumbnails.section.emptyTitle')) : t('thumbnails.section.default') }}</div>
            </span>
          </div>
          <div
            class="thumbnail-item"
            :class="{
              'active': slideIndex === index,
              'selected': selectedSlidesIndex.includes(index),
            }"
            @mousedown="$event => handleClickSlideThumbnail($event, index)"
            @dblclick="enterScreening()"
            v-contextmenu="contextmenusThumbnailItem"
          >
            <div class="label" :class="{ 'offset-left': index >= 99 }">{{ fillDigit(index + 1, 2) }}</div>
            <ThumbnailSlide class="thumbnail" :slide="element" :size="120" :visible="index < slidesLoadLimit" />
  
            <div class="note-flag" v-if="element.notes && element.notes.length" @click="openNotesPanel()">{{ element.notes.length }}</div>
          </div>
        </div>
      </template>
    </Draggable>

    <div class="page-footer">
      <span class="count" v-if="!thumbnailsCollapsed">{{ slideIndex + 1 }}/{{ slides.length }}</span>
      <!-- 折叠按钮移动到主布局中，这里移除原有按钮 -->
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore, useKeyboardStore } from '@/store'
import { fillDigit } from '@/utils/common'
import { isElementInViewport } from '@/utils/element'
import type { ContextmenuItem } from '@/components/Contextmenu/types'
import useSlideHandler from '@/hooks/useSlideHandler'
import useSectionHandler from '@/hooks/useSectionHandler'
import useScreening from '@/hooks/useScreening'
import useLoadSlides from '@/hooks/useLoadSlides'
import useAddSlidesOrElements from '@/hooks/useAddSlidesOrElements'
import type { Slide } from '@/types/slides'

import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import Templates from './Templates.vue'
import Popover from '@/components/Popover.vue'
import Draggable from 'vuedraggable'
import { useI18n } from 'vue-i18n'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const keyboardStore = useKeyboardStore()
const { selectedSlidesIndex: _selectedSlidesIndex, thumbnailsFocus, thumbnailsCollapsed } = storeToRefs(mainStore)
const { slides, slideIndex, currentSlide } = storeToRefs(slidesStore)
const { ctrlKeyState, shiftKeyState } = storeToRefs(keyboardStore)

const { slidesLoadLimit } = useLoadSlides()

const selectedSlidesIndex = computed(() => [..._selectedSlidesIndex.value, slideIndex.value])

const presetLayoutPopoverVisible = ref(false)
const { t } = useI18n()

const hasSection = computed(() => {
  return slides.value.some(item => item.sectionTag)
})

const { addSlidesFromData } = useAddSlidesOrElements()

const {
  copySlide,
  pasteSlide,
  createSlide,
  createSlideByTemplate,
  copyAndPasteSlide,
  deleteSlide,
  cutSlide,
  selectAllSlide,
  sortSlides,
  isEmptySlide,
} = useSlideHandler()

const {
  createSection,
  removeSection,
  removeAllSection,
  removeSectionSlides,
  updateSectionTitle,
} = useSectionHandler()

// 页面被切换时
const thumbnailsRef = useTemplateRef<InstanceType<typeof Draggable>>('thumbnailsRef')
watch(() => slideIndex.value, () => {

  // 清除多选状态的幻灯片
  if (selectedSlidesIndex.value.length) {
    mainStore.updateSelectedSlidesIndex([])
  }

  // 检查当前页缩略图是否在可视范围，不在的话需要滚动到对应的位置
  nextTick(() => {
    const activeThumbnailRef: HTMLElement = thumbnailsRef.value?.$el?.querySelector('.thumbnail-item.active')
    if (thumbnailsRef.value && activeThumbnailRef && !isElementInViewport(activeThumbnailRef, thumbnailsRef.value.$el)) {
      setTimeout(() => {
        activeThumbnailRef.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  })
}, { immediate: true })

// 切换页面
const changeSlideIndex = (index: number) => {
  mainStore.setActiveElementIdList([])

  if (slideIndex.value === index) return
  slidesStore.updateSlideIndex(index)
}

// 点击缩略图
const handleClickSlideThumbnail = (e: MouseEvent, index: number) => {
  if (editingSectionId.value) return

  const isMultiSelected = selectedSlidesIndex.value.length > 1

  if (isMultiSelected && selectedSlidesIndex.value.includes(index) && e.button !== 0) return

  // 按住Ctrl键，点选幻灯片，再次点击已选中的页面则取消选中
  // 如果被取消选中的页面刚好是当前激活页面，则需要从其他被选中的页面中选择第一个作为当前激活页面
  if (ctrlKeyState.value) {
    if (slideIndex.value === index) {
      if (!isMultiSelected) return

      const newSelectedSlidesIndex = selectedSlidesIndex.value.filter(item => item !== index)
      mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
      changeSlideIndex(selectedSlidesIndex.value[0])
    }
    else {
      if (selectedSlidesIndex.value.includes(index)) {
        const newSelectedSlidesIndex = selectedSlidesIndex.value.filter(item => item !== index)
        mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
      }
      else {
        const newSelectedSlidesIndex = [...selectedSlidesIndex.value, index]
        mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
      }
    }
  }
  // 按住Shift键，选择范围内的全部幻灯片
  else if (shiftKeyState.value) {
    if (slideIndex.value === index && !isMultiSelected) return

    let minIndex = Math.min(...selectedSlidesIndex.value)
    let maxIndex = index

    if (index < minIndex) {
      maxIndex = Math.max(...selectedSlidesIndex.value)
      minIndex = index
    }

    const newSelectedSlidesIndex = []
    for (let i = minIndex; i <= maxIndex; i++) newSelectedSlidesIndex.push(i)
    mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
  }
  // 正常切换页面
  else {
    mainStore.updateSelectedSlidesIndex([])
    changeSlideIndex(index)
  }
}

// 设置缩略图工具栏聚焦状态（只有聚焦状态下，该部分的快捷键才能生效）
const setThumbnailsFocus = (focus: boolean) => {
  if (thumbnailsFocus.value === focus) return
  mainStore.setThumbnailsFocus(focus)

  if (!focus) mainStore.updateSelectedSlidesIndex([])
}

// 拖拽调整顺序后进行数据的同步
const handleDragEnd = (eventData: { newIndex: number; oldIndex: number }) => {
  const { newIndex, oldIndex } = eventData
  if (newIndex === undefined || oldIndex === undefined || newIndex === oldIndex) return
  sortSlides(newIndex, oldIndex)
}

// 打开批注面板
const openNotesPanel = () => {
  mainStore.setNotesPanelState(true)
}

const editingSectionId = ref('')

const editSection = (id: string) => {
  mainStore.setDisableHotkeysState(true)
  editingSectionId.value = id || 'default'

  nextTick(() => {
    const inputRef = document.querySelector(`#section-title-input-${id || 'default'}`) as HTMLInputElement
    inputRef.focus()
  })
}

const saveSection = (e: FocusEvent | KeyboardEvent) => {
  const title = (e.target as HTMLInputElement).value
  updateSectionTitle(editingSectionId.value, title)

  editingSectionId.value = ''
  mainStore.setDisableHotkeysState(false)
}

const insertAllTemplates = (slides: Slide[]) => {
  if (isEmptySlide.value) slidesStore.setSlides(slides)
  else addSlidesFromData(slides)
}

const contextmenusSection = (el: HTMLElement): ContextmenuItem[] => {
  const sectionId = el.dataset.sectionId!

  return [
    {
      text: t('thumbnails.context.deleteSection'),
      handler: () => removeSection(sectionId),
    },
    {
      text: t('thumbnails.context.deleteSectionWithSlides'),
      handler: () => {
        mainStore.setActiveElementIdList([])
        removeSectionSlides(sectionId)
      },
    },
    {
      text: t('thumbnails.context.deleteAllSections'),
      handler: removeAllSection,
    },
    {
      text: t('thumbnails.context.renameSection'),
      handler: () => editSection(sectionId),
    },
  ]
}

const { enterScreening, enterScreeningFromStart } = useScreening()

const contextmenusThumbnails = (): ContextmenuItem[] => {
  return [
    {
      text: t('thumbnails.context.paste'),
      subText: 'Ctrl + V',
      handler: pasteSlide,
    },
    {
      text: t('thumbnails.context.selectAll'),
      subText: 'Ctrl + A',
      handler: selectAllSlide,
    },
    {
      text: t('thumbnails.context.newSlide'),
      subText: 'Enter',
      handler: createSlide,
    },
    {
      text: t('thumbnails.context.slideShow'),
      subText: 'F5',
      handler: enterScreeningFromStart,
    },
  ]
}

const contextmenusThumbnailItem = (): ContextmenuItem[] => {
  return [
    {
      text: t('thumbnails.context.cut'),
      subText: 'Ctrl + X',
      handler: cutSlide,
    },
    {
      text: t('thumbnails.context.copy'),
      subText: 'Ctrl + C',
      handler: copySlide,
    },
    {
      text: t('thumbnails.context.paste'),
      subText: 'Ctrl + V',
      handler: pasteSlide,
    },
    {
      text: t('thumbnails.context.selectAll'),
      subText: 'Ctrl + A',
      handler: selectAllSlide,
    },
    { divider: true },
    {
      text: t('thumbnails.context.newSlide'),
      subText: 'Enter',
      handler: createSlide,
    },
    {
      text: t('thumbnails.context.duplicate'),
      subText: 'Ctrl + D',
      handler: copyAndPasteSlide,
    },
    {
      text: t('thumbnails.context.delete'),
      subText: 'Delete',
      handler: () => deleteSlide(),
    },
    {
      text: t('thumbnails.context.addSection'),
      handler: createSection,
      disable: !!currentSlide.value.sectionTag,
    },
    { divider: true },
    {
      text: t('thumbnails.context.fromCurrent'),
      subText: 'Shift + F5',
      handler: enterScreening,
    },
  ]
}

// 折叠按钮迁移到主布局（Editor/index.vue）中，这里保留占位逻辑（无需实现）
</script>

<style lang="scss" scoped>
.thumbnails {
  border-right: solid 1px $borderColor;
  background-color: $panelBackground;
  box-shadow: $panelShadow;
  display: flex;
  flex-direction: column;
  user-select: none;
  z-index: 5;
  position: relative;
}
.add-slide {
  height: 40px;
  font-size: 12px;
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid $borderColor;
  cursor: pointer;

  .btn {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover {
      background-color: $lightGray;
    }
  }
  .select-btn {
    width: 30px;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-left: 1px solid $borderColor;

    &:hover {
      background-color: $lightGray;
    }
  }

  .icon {
    margin-right: 3px;
    font-size: 14px;
  }
  &.collapsed {
    .btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon {
      margin-right: 0;
      font-size: 16px;
    }
  }
}
.thumbnail-list {
  padding: 5px 0;
  flex: 1;
  overflow: auto;
}
.thumbnail-item {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5px 0;
  position: relative;

  .thumbnail {
    border-radius: $borderRadiusMedium;
    outline: 2px solid rgba($color: $themeColor, $alpha: .15);
  }

  &.active {
    .label {
      color: $themeColor;
    }
    .thumbnail {
      outline-color: $themeColor;
    }
  }
  &.selected {
    .thumbnail {
      outline-color: $themeColor;
    }
    .note-flag {
      background-color: $themeColor;

      &::after {
        border-top-color: $themeColor;
      }
    }
  }

  .note-flag {
    width: 16px;
    height: 12px;
    border-radius: 1px;
    position: absolute;
    left: 8px;
    top: 13px;
    font-size: 8px;
    background-color: rgba($color: $themeColor, $alpha: .75);
    color: #fff;
    text-align: center;
    line-height: 12px;
    cursor: pointer;

    &::after {
      content: '';
      width: 0;
      height: 0;
      position: absolute;
      top: 10px;
      left: 4px;
      border: 4px solid transparent;
      border-top-color: rgba($color: $themeColor, $alpha: .75);
    }
  }
}
.label {
  font-size: 12px;
  color: #999;
  width: 20px;
  cursor: grab;

  &.offset-left {
    position: relative;
    left: -4px;
  }

  &:active {
    cursor: grabbing;
  }
}
.page-footer {
  height: 40px;
  font-size: 12px;
  border-top: 1px solid $borderColor;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: auto; // 保持页脚固定在底部（折叠时无列表也不上移）
  color: #666;
  position: relative;

  .count { line-height: 1; }

  .collapse-circle {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: color $transitionDelayFast;
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);

    &:hover .collapse-icon { color: #333; }

    .collapse-icon {
      font-size: 14px;
      color: #555;
      transition: transform $transitionDelay;
      &.collapsed { transform: rotate(180deg); }
    }
  }
}
.section-title {
  height: 26px;
  font-size: 12px;
  padding: 6px 8px 2px 18px;
  color: #555;

  &.contextmenu-active {
    color: $themeColor;

    .text::before {
      border-bottom-color: $themeColor;
      border-right-color: $themeColor;
    }
  }

  .text {
    display: flex;
    align-items: center;
    position: relative;

    &::before {
      content: '';
      width: 0;
      height: 0;
      border-top: 3px solid transparent;
      border-left: 3px solid transparent;
      border-bottom: 3px solid #555;
      border-right: 3px solid #555;
      margin-right: 5px;
    }

    .text-content {
      display: inline-block;
      @include ellipsis-oneline();
    }
  }

  input {
    width: 100%;
    border: 0;
    outline: 0;
    padding: 0;
    font-size: 12px;
  }
}
</style>
