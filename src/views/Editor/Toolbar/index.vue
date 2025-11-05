<template>
  <div class="toolbar">
    <div class="tabs-wrap" :class="{ 'with-shadow': tabsShadow }">
      <Tabs
        :tabs="currentTabs"
        :value="toolbarState"
        @update:value="key => setToolbarState(key as ToolbarStates)"
      />
    </div>
    <div class="content" ref="contentRef">
      <component :is="currentPanelComponent"></component>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, watch, ref, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import { ToolbarStates } from '@/types/toolbar'

import ElementStylePanel from './ElementStylePanel/index.vue'
import ElementPositionPanel from './ElementPositionPanel.vue'
import ElementAnimationPanel from './ElementAnimationPanel.vue'
import SlideDesignPanel from './SlideDesignPanel/index.vue'
import SlideAnimationPanel from './SlideAnimationPanel.vue'
import MultiPositionPanel from './MultiPositionPanel.vue'
import MultiStylePanel from './MultiStylePanel.vue'
import Tabs from '@/components/Tabs.vue'
import { useI18n } from 'vue-i18n'

const mainStore = useMainStore()
const { activeElementIdList, activeElementList, activeGroupElementId, toolbarState, headerCollapsed } = storeToRefs(mainStore)

const { t } = useI18n()

const elementTabs = computed(() => ([
  { label: t('toolbar.tabs.style'), key: ToolbarStates.EL_STYLE },
  { label: t('toolbar.tabs.position'), key: ToolbarStates.EL_POSITION },
  { label: t('toolbar.tabs.animation'), key: ToolbarStates.EL_ANIMATION },
]))
const slideTabs = computed(() => ([
  { label: t('toolbar.tabs.design'), key: ToolbarStates.SLIDE_DESIGN },
  { label: t('toolbar.tabs.transition'), key: ToolbarStates.SLIDE_ANIMATION },
  { label: t('toolbar.tabs.animation'), key: ToolbarStates.EL_ANIMATION },
]))
const multiSelectTabs = computed(() => ([
  { label: t('toolbar.tabs.multiStyle'), key: ToolbarStates.MULTI_STYLE },
  { label: t('toolbar.tabs.multiPosition'), key: ToolbarStates.MULTI_POSITION },
]))

const setToolbarState = (value: ToolbarStates) => {
  mainStore.setToolbarState(value)
}

const currentTabs = computed(() => {
  if (!activeElementIdList.value.length) return slideTabs.value
  else if (activeElementIdList.value.length > 1) {
    if (!activeGroupElementId.value) return multiSelectTabs.value

    const activeGroupElement = activeElementList.value.find(item => item.id === activeGroupElementId.value)
    if (activeGroupElement) return elementTabs.value
    return multiSelectTabs.value
  }
  return elementTabs.value
})

watch(currentTabs, () => {
  const currentTabsValue: ToolbarStates[] = currentTabs.value.map(tab => tab.key)
  if (!currentTabsValue.includes(toolbarState.value)) {
    mainStore.setToolbarState(currentTabsValue[0])
  }
})

const currentPanelComponent = computed(() => {
  const panelMap = {
    [ToolbarStates.EL_STYLE]: ElementStylePanel,
    [ToolbarStates.EL_POSITION]: ElementPositionPanel,
    [ToolbarStates.EL_ANIMATION]: ElementAnimationPanel,
    [ToolbarStates.SLIDE_DESIGN]: SlideDesignPanel,
    [ToolbarStates.SLIDE_ANIMATION]: SlideAnimationPanel,
    [ToolbarStates.MULTI_STYLE]: MultiStylePanel,
    [ToolbarStates.MULTI_POSITION]: MultiPositionPanel,
  }
  return panelMap[toolbarState.value] || null
})

// 顶部 header 折叠入口已移到中心工具条（CanvasTool）最右侧

// 监听右侧内容滚动，给 tabs 底部添加阴影
const tabsShadow = ref(false)
const contentRef = useTemplateRef<HTMLDivElement>('contentRef')
const updateTabsShadow = () => {
  tabsShadow.value = !!(contentRef.value && contentRef.value.scrollTop > 0)
}
onMounted(() => {
  if (contentRef.value) {
    contentRef.value.addEventListener('scroll', updateTabsShadow)
    updateTabsShadow()
  }
})
onBeforeUnmount(() => {
  if (contentRef.value) contentRef.value.removeEventListener('scroll', updateTabsShadow)
})
</script>

<style lang="scss" scoped>
.toolbar {
  border-left: solid 1px $borderColor;
  background-color: $panelBackground;
  box-shadow: none; // 去掉右侧面板阴影，保留分隔线
  display: flex;
  flex-direction: column;
  z-index: 5;
  position: relative;
}

.tabs-wrap {
  background-color: $panelBackground;
  position: relative;
  z-index: 2;
}
.tabs-wrap.with-shadow {
  // 更明显的阴影效果
  box-shadow: 0 3px 12px rgba(0, 0, 0, .12), 0 1px 0 rgba(0, 0, 0, .08);
}

/* 顶部 Tabs 改为细下划线风格，并优化文字样式 */
.toolbar :deep(.tabs:not(.card) .tab) {
  font-size: 14px;
  font-weight: 400; // 不加粗
  padding: 16px 12px; // 通过增加上下 padding 提高高度
  color: rgba(13, 18, 22, .698);
  transition: color $transitionDelayFast, border-color $transitionDelayFast; // 还原
  flex: 1 1 0; // 等宽
  min-width: 0; // 处理文本溢出
  text-align: center;
}
.toolbar :deep(.tabs:not(.card) .tab.active) {
  color: #0d1216;
  border-bottom-color: var(--color, $themeColor);
}

/* 圆角优化：右侧面板内的按钮与表单框 */
.toolbar :deep(.button) {
  border-radius: $borderRadiusLarge;
  white-space: nowrap; // 文案不换行
  letter-spacing: 0;   // 减少占宽
  overflow: hidden;
  text-overflow: ellipsis;
}
.toolbar :deep(.button.small) {
  border-radius: $borderRadiusMedium;
}
.toolbar :deep(.input),
.toolbar :deep(.number-input),
.toolbar :deep(.select),
.toolbar :deep(.select-wrap .select) {
  border-radius: $borderRadiusLarge;
}
.toolbar :deep(.options .option) {
  border-radius: $borderRadiusMedium;
}
.toolbar :deep(.background-image),
.toolbar :deep(.theme-item),
.toolbar :deep(.theme-item .theme-item-content) {
  border-radius: $borderRadiusLarge;
}

.content {
  padding: 12px;
  font-size: 13px;

  @include overflow-overlay();
}
</style>
