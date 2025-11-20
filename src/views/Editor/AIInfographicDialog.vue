<template>
  <div class="ai-infographic-dialog">
    <div class="header">
      <span class="title">AI信息图</span>
      <span class="subtitle">上传模板，输入主题，一键生成精美信息图</span>
    </div>

    <div class="upload-section">
      <div class="upload-area" @click="uploadTemplate">
        <div class="upload-icon">
          <IconPlus />
        </div>
        <div class="upload-text">
          <div class="primary-text">{{ templateFile ? templateFile.name : '点击上传模板' }}</div>
          <div class="secondary-text">支持 .pptist 和 .json 格式</div>
        </div>
      </div>
    </div>

    <Input
      class="input"
      ref="inputRef"
      v-model:value="topic"
      :maxlength="100"
      placeholder="输入信息图主题，如：2024年度工作总结"
      @enter="generate()"
    >
      <template #suffix>
        <span class="count">{{ topic.length }} / 100</span>
      </template>
    </Input>

    <div class="configs">
      <div class="config-item">
        <div class="label">语言：</div>
        <Select
          class="config-content"
          style="width: 80px;"
          v-model:value="language"
          :options="[
            { label: '中文', value: '中文' },
            { label: '英文', value: 'English' },
          ]"
        />
      </div>
      <div class="config-item">
        <div class="label">模型：</div>
        <Select
          class="config-content"
          style="width: 190px;"
          v-model:value="model"
          :options="[
            { label: 'GPT-3.5 Turbo (Fast)', value: 'GLM-4.5-Flash' },
            { label: 'Claude 3 Haiku', value: 'ark-doubao-seed-1.6-flash' },
            { label: 'GPT-4 (Premium)', value: 'gpt-4' },
          ]"
        />
      </div>
    </div>

    <div class="action-section">
      <Button class="btn" type="primary" @click="generate()">生成信息图</Button>
    </div>

    <FullscreenSpin :loading="loading" tip="AI生成中，请稍候..." />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, useTemplateRef } from 'vue'
import { useMainStore, useSlidesStore } from '@/store'
import type { Slide, SlideTheme } from '@/types/slides'
import type { AIInfographicData } from '@/types/AIInfographic'
import message from '@/utils/message'
import { decrypt } from '@/utils/crypto'
import api from '@/services'
import useAIInfographic from '@/hooks/useAIInfographic'
import useAddSlidesOrElements from '@/hooks/useAddSlidesOrElements'
import Input from '@/components/Input.vue'
import Button from '@/components/Button.vue'
import Select from '@/components/Select.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { extractTemplateStructure, extractTemplateData, generatePrompt, validateAIResponse, fillInfographic } = useAIInfographic()
const { addSlidesFromData } = useAddSlidesOrElements()

const topic = ref('')
const language = ref('中文')
const model = ref('GLM-4.5-Flash')
const templateFile = ref<File | null>(null)
const templateData = ref<{ slides: Slide[], theme?: SlideTheme } | null>(null)
const loading = ref(false)
const inputRef = useTemplateRef<InstanceType<typeof Input>>('inputRef')

onMounted(() => {
  setTimeout(() => {
    inputRef.value?.focus()
  }, 500)
})

const uploadTemplate = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pptist,.json'
  input.click()
  input.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      templateFile.value = file
      parseTemplateFile(file)
    }
  })
}

const parseTemplateFile = async (file: File) => {
  const reader = new FileReader()
  reader.addEventListener('load', () => {
    try {
      const raw = String(reader.result || '')
      let parsed: { slides?: Slide[], theme?: SlideTheme }

      if (file.name.endsWith('.pptist')) {
        const decrypted = decrypt(raw)
        if (!decrypted) {
          throw new Error('解密失败：内容为空或密钥不匹配')
        }
        parsed = JSON.parse(decrypted)
      } else {
        parsed = JSON.parse(raw)
      }

      const { slides, theme } = parsed

      if (!Array.isArray(slides) || slides.length === 0) {
        throw new Error('模板结构缺少 slides 字段或为空')
      }

      templateData.value = { slides, theme }
      message.success('模板上传成功')
    } catch (err) {
      const reason = err instanceof Error && err.message ? err.message : String(err)
      message.error(`模板解析失败：${reason}`)
      templateFile.value = null
      templateData.value = null
    }
  })
  reader.readAsText(file)
}

const generate = async () => {
  if (!templateFile.value || !templateData.value) {
    message.error('请先上传模板文件')
    return
  }
  if (!topic.value) {
    message.error('请输入信息图主题')
    return
  }

  loading.value = true

  try {
    const templates = templateData.value.slides
    const totalPages = templates.length
    let successCount = 0

    // 循环处理每一页模板
    for (let i = 0; i < totalPages; i++) {
      const template = templates[i]
      const structure = extractTemplateStructure(template)

      // 提取模板示例数据
      const templateExampleData = extractTemplateData(structure)

      // 生成增强的提示词（包含模板示例）
      const prompt = generatePrompt(structure, templateExampleData, topic.value, language.value)

      // 更新进度提示
      const progressTip = `正在生成第 ${i + 1}/${totalPages} 页...`
      const spinEl = document.querySelector('.fullscreen-spin .tip')
      if (spinEl) spinEl.textContent = progressTip

      // 调用AI生成内容
      const stream = await api.AIInfographic({
        content: prompt,
        language: language.value,
        model: model.value,
      })

      if (stream.status === 500) {
        console.error(`第 ${i + 1} 页生成失败: AI服务异常`)
        continue // 继续处理下一页
      }

      const reader: ReadableStreamDefaultReader = stream.body.getReader()
      const decoder = new TextDecoder('utf-8')

      let aiContent = ''

      const readStream = (): Promise<void> => {
        return reader.read().then(({ done, value }) => {
          if (done) {
            // 解析AI返回的JSON数据
            try {
              const cleanContent = aiContent
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim()
              const data: AIInfographicData = JSON.parse(cleanContent)

              // 验证AI返回的数据
              const validation = validateAIResponse(data, structure)
              if (!validation.valid) {
                throw new Error(validation.error)
              }

              // 填充模板
              const newSlide = fillInfographic(structure, data)

              // 立即添加到幻灯片
              addSlidesFromData([newSlide])

              // 如果有主题且是第一页，应用主题
              if (i === 0 && templateData.value?.theme) {
                slidesStore.setTheme(templateData.value.theme)
              }

              successCount++
            } catch (err) {
              console.error(`第 ${i + 1} 页解析失败:`, err)
            }
            return
          }

          const chunk = decoder.decode(value, { stream: true })
          aiContent += chunk

          return readStream()
        })
      }

      await readStream()
    }

    loading.value = false

    if (successCount === totalPages) {
      message.success(`成功生成 ${successCount} 页信息图！`)
    } else if (successCount > 0) {
      message.warning(`成功生成 ${successCount}/${totalPages} 页，部分页面失败`)
    } else {
      message.error('所有页面生成失败，请重试')
    }

    mainStore.setAIInfographicDialogState(false)

    // 跳转到第一张新生成的幻灯片
    if (successCount > 0) {
      slidesStore.updateSlideIndex(slidesStore.slides.length - successCount)
    }
  } catch (err) {
    console.error('生成信息图失败:', err)
    message.error('生成失败，请重试')
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.ai-infographic-dialog {
  margin: -20px;
  padding: 30px;
}

.header {
  margin-bottom: 20px;

  .title {
    font-weight: 700;
    font-size: 20px;
    margin-right: 8px;
    background: linear-gradient(270deg, #d897fd, #33bcfc);
    background-clip: text;
    color: transparent;
    vertical-align: text-bottom;
    line-height: 1.1;
  }

  .subtitle {
    color: #888;
    font-size: 12px;
  }
}

.upload-section {
  margin-bottom: 20px;

  .upload-area {
    border: 2px dashed $borderColor;
    border-radius: $borderRadius;
    padding: 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background-color: #fafafa;

    &:hover {
      border-color: $themeColor;
      background-color: #f5f5f5;
    }

    .upload-icon {
      font-size: 48px;
      color: #999;
      margin-bottom: 10px;
    }

    .upload-text {
      .primary-text {
        font-size: 14px;
        color: #333;
        margin-bottom: 5px;
      }

      .secondary-text {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

.input {
  margin-bottom: 15px;
}

.count {
  font-size: 12px;
  color: #999;
  margin-right: 10px;
}

.configs {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;

  .config-item {
    font-size: 13px;
    display: flex;
    align-items: center;
  }
}

.action-section {
  display: flex;
  justify-content: center;

  .btn {
    width: 150px;
  }
}

@media screen and (width <= 800px) {
  .configs {
    flex-direction: column;

    .config-item {
      margin-top: 8px;

      .label {
        flex-shrink: 0;
      }

      .config-content {
        width: 100% !important;
      }
    }
  }
}
</style>
