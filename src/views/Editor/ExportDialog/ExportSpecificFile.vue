<template>
  <div class="export-pptist-dialog">
    <div class="configs">
      <div class="row">
        <div class="title">{{ t('export.scope') }}</div>
        <RadioGroup
          class="config-item"
          v-model:value="rangeType"
        >
          <RadioButton style="width: 33.33%;" value="all">{{ t('export.scopeAll') }}</RadioButton>
          <RadioButton style="width: 33.33%;" value="current">{{ t('export.scopeCurrent') }}</RadioButton>
          <RadioButton style="width: 33.33%;" value="custom">{{ t('export.scopeCustom') }}</RadioButton>
        </RadioGroup>
      </div>
      <div class="row" v-if="rangeType === 'custom'">
        <div class="title" :data-range="`（${range[0]} ~ ${range[1]}）`">{{ t('export.customRange') }}</div>
        <Slider
          class="config-item"
          range
          :min="1"
          :max="slides.length"
          :step="1"
          v-model:value="range"
        />
      </div>
      <div class="row">
        <div class="title">{{ t('export.canvasWidth') }}</div>
        <div class="config-item width-input">
          <Input
            v-model:value="exportWidth"
            type="number"
            :min="500"
            :max="5000"
            :step="10"
          />
          <span class="unit">px</span>
          <span class="scale-tip" v-if="scalePercentage !== 100">({{ scalePercentage }}%)</span>
        </div>
      </div>

      <div class="tip" v-if="scalePercentage !== 100">{{ t('export.scaleWidthTip', { from: viewportSize, to: exportWidth, percent: scalePercentage }) }}</div>
    </div>
    <div class="btns">
      <Button class="btn export" type="primary" @click="handleExport"><IconDownload /> {{ t('export.exportPPTIST') }}</Button>
      <Button class="btn close" @click="emit('close')">{{ t('export.close') }}</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import useExport from '@/hooks/useExport'
import { scaleSlides } from '@/utils/scaleSlides'
import { encrypt } from '@/utils/crypto'
import { saveAs } from 'file-saver'

import Slider from '@/components/Slider.vue'
import Button from '@/components/Button.vue'
import RadioButton from '@/components/RadioButton.vue'
import RadioGroup from '@/components/RadioGroup.vue'
import Input from '@/components/Input.vue'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const slidesStore = useSlidesStore()
const { slides, currentSlide, viewportSize, viewportRatio, theme, title } = storeToRefs(slidesStore)

const { exportSpecificFile } = useExport()
const { t } = useI18n()

const rangeType = ref<'all' | 'current' | 'custom'>('all')
const range = ref<[number, number]>([1, slides.value.length])
const exportWidth = ref<number | string>(viewportSize.value)

const selectedSlides = computed(() => {
  if (rangeType.value === 'all') return slides.value
  if (rangeType.value === 'current') return [currentSlide.value]
  return slides.value.filter((item, index) => {
    const [min, max] = range.value
    return index >= min - 1 && index <= max - 1
  })
})

// 获取导出用的 slides（根据宽度进行缩放）
const getExportSlides = () => {
  const width = Number(exportWidth.value)
  if (width === viewportSize.value) {
    return selectedSlides.value
  }

  const ratio = width / viewportSize.value
  return scaleSlides(selectedSlides.value, ratio)
}

// 计算缩放比例百分比
const scalePercentage = computed(() => {
  const width = Number(exportWidth.value)
  const ratio = width / viewportSize.value
  return Math.round(ratio * 100)
})

// 导出处理（覆盖原有函数，支持自定义宽度）
const handleExport = () => {
  const width = Number(exportWidth.value)
  const slidesToExport = getExportSlides()
  const json = {
    title: title.value,
    width: width,
    height: width * viewportRatio.value,
    theme: theme.value,
    slides: slidesToExport,
  }
  const blob = new Blob([encrypt(JSON.stringify(json))], { type: '' })
  saveAs(blob, `${title.value}.pptist`)
}
</script>

<style lang="scss" scoped>
.export-pptist-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.configs {
  width: 350px;
  height: calc(100% - 80px);
  display: flex;
  flex-direction: column;
  justify-content: center;

  .row {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 25px;
  }

  .title {
    width: 100px;
    position: relative;

    &::after {
      content: attr(data-range);
      position: absolute;
      top: 20px;
      left: 0;
    }
  }
  .config-item {
    flex: 1;

    &.width-input {
      display: flex;
      align-items: center;
      gap: 8px;

      .unit {
        font-size: 14px;
        color: #666;
      }

      .scale-tip {
        font-size: 12px;
        color: #999;
      }
    }
  }

  .tip {
    font-size: 12px;
    color: #aaa;
    line-height: 1.8;
    margin-top: 10px;
  }
}
.btns {
  width: 300px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;

  .export {
    flex: 1;
  }
  .close {
    width: 100px;
    margin-left: 10px;
  }
}
</style>
