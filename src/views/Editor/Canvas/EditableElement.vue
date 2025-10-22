<template>
  <div 
    class="editable-element"
    ref="elementRef"
    :id="`editable-element-${elementInfo.id}`"
    :style="{
      zIndex: elementIndex,
    }"
  >
    <component
      :is="currentElementComponent"
      :elementInfo="elementInfo"
      :selectElement="selectElement"
      :contextmenus="contextmenus"
    ></component>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { ElementTypes, type PPTElement } from '@/types/slides'
import type { ContextmenuItem } from '@/components/Contextmenu/types'

import useLockElement from '@/hooks/useLockElement'
import useDeleteElement from '@/hooks/useDeleteElement'
import useCombineElement from '@/hooks/useCombineElement'
import useOrderElement from '@/hooks/useOrderElement'
import useAlignElementToCanvas from '@/hooks/useAlignElementToCanvas'
import useCopyAndPasteElement from '@/hooks/useCopyAndPasteElement'
import useSelectElement from '@/hooks/useSelectElement'
import { useI18n } from 'vue-i18n'

import { ElementOrderCommands, ElementAlignCommands } from '@/types/edit'

import ImageElement from '@/views/components/element/ImageElement/index.vue'
import TextElement from '@/views/components/element/TextElement/index.vue'
import ShapeElement from '@/views/components/element/ShapeElement/index.vue'
import LineElement from '@/views/components/element/LineElement/index.vue'
import ChartElement from '@/views/components/element/ChartElement/index.vue'
import TableElement from '@/views/components/element/TableElement/index.vue'
import LatexElement from '@/views/components/element/LatexElement/index.vue'
import VideoElement from '@/views/components/element/VideoElement/index.vue'
import AudioElement from '@/views/components/element/AudioElement/index.vue'

const props = defineProps<{
  elementInfo: PPTElement
  elementIndex: number
  isMultiSelect: boolean
  selectElement: (e: MouseEvent | TouchEvent, element: PPTElement, canMove?: boolean) => void
  openLinkDialog: () => void
}>()

const currentElementComponent = computed<unknown>(() => {
  const elementTypeMap = {
    [ElementTypes.IMAGE]: ImageElement,
    [ElementTypes.TEXT]: TextElement,
    [ElementTypes.SHAPE]: ShapeElement,
    [ElementTypes.LINE]: LineElement,
    [ElementTypes.CHART]: ChartElement,
    [ElementTypes.TABLE]: TableElement,
    [ElementTypes.LATEX]: LatexElement,
    [ElementTypes.VIDEO]: VideoElement,
    [ElementTypes.AUDIO]: AudioElement,
  }
  return elementTypeMap[props.elementInfo.type] || null
})

const { orderElement } = useOrderElement()
const { alignElementToCanvas } = useAlignElementToCanvas()
const { combineElements, uncombineElements } = useCombineElement()
const { deleteElement } = useDeleteElement()
const { lockElement, unlockElement } = useLockElement()
const { copyElement, pasteElement, cutElement } = useCopyAndPasteElement()
const { selectAllElements } = useSelectElement()

const { t } = useI18n()
const contextmenus = (): ContextmenuItem[] => {
  if (props.elementInfo.lock) {
    return [{
      text: t('element.context.unlock'), 
      handler: () => unlockElement(props.elementInfo),
    }]
  }

  return [
    {
      text: t('element.context.cut'),
      subText: 'Ctrl + X',
      handler: cutElement,
    },
    {
      text: t('element.context.copy'),
      subText: 'Ctrl + C',
      handler: copyElement,
    },
    {
      text: t('element.context.paste'),
      subText: 'Ctrl + V',
      handler: pasteElement,
    },
    { divider: true },
    {
      text: t('toolbar.position.alignHCenter'),
      handler: () => alignElementToCanvas(ElementAlignCommands.HORIZONTAL),
      children: [
        { text: t('element.context.alignCenterBoth'), handler: () => alignElementToCanvas(ElementAlignCommands.CENTER), },
        { text: t('toolbar.position.alignHCenter'), handler: () => alignElementToCanvas(ElementAlignCommands.HORIZONTAL) },
        { text: t('toolbar.position.alignLeft'), handler: () => alignElementToCanvas(ElementAlignCommands.LEFT) },
        { text: t('toolbar.position.alignRight'), handler: () => alignElementToCanvas(ElementAlignCommands.RIGHT) },
      ],
    },
    {
      text: t('toolbar.position.alignVCenter'),
      handler: () => alignElementToCanvas(ElementAlignCommands.VERTICAL),
      children: [
        { text: t('element.context.alignCenterBoth'), handler: () => alignElementToCanvas(ElementAlignCommands.CENTER) },
        { text: t('toolbar.position.alignVCenter'), handler: () => alignElementToCanvas(ElementAlignCommands.VERTICAL) },
        { text: t('element.context.alignTop'), handler: () => alignElementToCanvas(ElementAlignCommands.TOP) },
        { text: t('element.context.alignBottom'), handler: () => alignElementToCanvas(ElementAlignCommands.BOTTOM) },
      ],
    },
    { divider: true },
    {
      text: t('element.context.toTop'),
      disable: props.isMultiSelect && !props.elementInfo.groupId,
      handler: () => orderElement(props.elementInfo, ElementOrderCommands.TOP),
      children: [
        { text: t('element.context.toTop'), handler: () => orderElement(props.elementInfo, ElementOrderCommands.TOP) },
        { text: t('element.context.up'), handler: () => orderElement(props.elementInfo, ElementOrderCommands.UP) },
      ],
    },
    {
      text: t('element.context.toBottom'),
      disable: props.isMultiSelect && !props.elementInfo.groupId,
      handler: () => orderElement(props.elementInfo, ElementOrderCommands.BOTTOM),
      children: [
        { text: t('element.context.toBottom'), handler: () => orderElement(props.elementInfo, ElementOrderCommands.BOTTOM) },
        { text: t('element.context.down'), handler: () => orderElement(props.elementInfo, ElementOrderCommands.DOWN) },
      ],
    },
    { divider: true },
    {
      text: t('element.context.setLink'),
      handler: props.openLinkDialog,
    },
    {
      text: props.elementInfo.groupId ? t('toolbar.multi.ungroup') : t('toolbar.multi.group'),
      subText: 'Ctrl + G',
      handler: props.elementInfo.groupId ? uncombineElements : combineElements,
      hide: !props.isMultiSelect,
    },
    {
      text: t('thumbnails.context.selectAll'),
      subText: 'Ctrl + A',
      handler: selectAllElements,
    },
    {
      text: t('element.context.lock'),
      subText: 'Ctrl + L',
      handler: lockElement,
    },
    {
      text: t('thumbnails.context.delete'),
      subText: 'Delete',
      handler: deleteElement,
    },
  ]
}
</script>
