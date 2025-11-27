<template>
  <template v-if="slides.length">
    <Screen v-if="screening" />
    <Editor v-else-if="_isPC" />
    <Mobile v-else />
  </template>
  <FullscreenSpin v-else loading :mask="false" />
</template>



<script lang="ts" setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useScreenStore, useMainStore, useSnapshotStore, useSlidesStore } from '@/store'
import { LOCALSTORAGE_KEY_DISCARDED_DB } from '@/configs/storage'
import { deleteDiscardedDB } from '@/utils/database'
import { isPC } from '@/utils/common'
import api from '@/services'

import Editor from './views/Editor/index.vue'
import Screen from './views/Screen/index.vue'
import Mobile from './views/Mobile/index.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'

const _isPC = isPC()
const { t } = useI18n()

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const snapshotStore = useSnapshotStore()
const { databaseId } = storeToRefs(mainStore)
const { slides } = storeToRefs(slidesStore)
const { screening } = storeToRefs(useScreenStore())

onMounted(async () => {
  // 检查 URL 参数控制菜单显示
  const urlParams = new URLSearchParams(window.location.search)
  const mode = urlParams.get('mode')
  const isFullMode = mode === 'full'

  // 保存 mode 状态到 sessionStorage，供其他组件使用
  sessionStorage.setItem('pptist_mode', isFullMode ? 'full' : 'simple')

  // 默认隐藏菜单，只有 mode=full 时才显示
  if (!isFullMode) {
    mainStore.setHeaderCollapsed(true)
  }

  // 支持通过 URL 参数动态加载 JSON：?type=json&file=/api/viz/cache/...
  const type = urlParams.get('type')
  const fileParam = urlParams.get('file')

  try {
    if (type === 'json' && fileParam) {
      // 构造可访问的 JSON 地址，支持相对路径和绝对 URL
      const fileUrl = fileParam.startsWith('http://') || fileParam.startsWith('https://')
        ? fileParam
        : new URL(fileParam, window.location.origin).toString()

      const resp = await fetch(fileUrl)
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
      }

      const data = await resp.json()
      const { slides, width, height, theme, title } = data

      // 恢复 viewportSize 和 viewportRatio
      // 优先使用顶层 width/height；如果没有，则使用 size.width/size.height（兼容部分生成器输出）
      const viewportWidth = width ?? data.size?.width
      const viewportHeight = height ?? data.size?.height
      if (viewportWidth && viewportHeight) {
        slidesStore.setViewportSize(viewportWidth)
        slidesStore.setViewportRatio(viewportHeight / viewportWidth)
      }

      // 应用主题（如果存在）
      if (theme) {
        slidesStore.setTheme(theme)
      }

      // 应用标题（如果存在）
      if (title) {
        slidesStore.setTitle(title)
      }

      // 设置幻灯片数据
      slidesStore.setSlides(slides || [])
    } else {
      // 默认行为：加载本地 mocks/slides.json
      const slides = await api.getMockData('slides')
      slidesStore.setSlides(slides)
    }
  } catch (err) {
    console.error('Failed to load slides JSON from URL, falling back to mocks:', err)
    try {
      const slides = await api.getMockData('slides')
      slidesStore.setSlides(slides)
    } catch (e) {
      console.error('Failed to load default mock slides:', e)
    }
  }

  await deleteDiscardedDB()
  snapshotStore.initSnapshotDatabase()
})

// 应用注销时向 localStorage 中记录下本次 indexedDB 的数据库ID，用于之后清除数据库
window.addEventListener('beforeunload', () => {
  const discardedDB = localStorage.getItem(LOCALSTORAGE_KEY_DISCARDED_DB)
  const discardedDBList: string[] = discardedDB ? JSON.parse(discardedDB) : []

  discardedDBList.push(databaseId.value)

  const newDiscardedDB = JSON.stringify(discardedDBList)
  localStorage.setItem(LOCALSTORAGE_KEY_DISCARDED_DB, newDiscardedDB)
})
</script>

<style lang="scss">
#app {
  height: 100%;
}
</style>
