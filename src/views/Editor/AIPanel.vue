<template>
  <MoveablePanel
    class="ai-panel"
    :width="350"
    :height="600"
    :title="t('aiPanel.title')"
    :left="-320"
    :top="90"
    :minWidth="300"
    :minHeight="450"
    :maxWidth="500"
    :maxHeight="800"
    resizeable
    @close="close()"
  >
    <div class="container">
      <!-- Top: Input Area -->
      <div class="input-section">
        <TextArea
          ref="textAreaRef"
          v-model:value="userInput"
          :padding="10"
          :placeholder="t('aiPanel.placeholder')"
          :rows="3"
          :disabled="isGenerating"
          @enter.prevent="handleSend()"
        />
        <div class="input-footer">
          <Button
            type="primary"
            class="send-btn"
            :disabled="!userInput.trim() || !selectedTemplateId || isGenerating"
            @click="handleSend()"
          >
            <IconSend v-if="!isGenerating" class="icon" />
            <span v-if="isGenerating" class="loading-spinner"></span>
            {{ isGenerating ? t('aiPanel.generating') : t('aiPanel.send') }}
          </Button>
        </div>
      </div>

      <!-- Bottom: Templates List -->
      <div class="templates-section" ref="templatesRef">
        <div class="section-title">{{ t('aiPanel.templates') }}</div>

        <!-- Loading State: Skeleton -->
        <div v-if="isLoadingTemplates" class="templates-grid">
          <div v-for="i in 4" :key="`skeleton-${i}`" class="skeleton-card">
            <div class="skeleton-image"></div>
            <div class="skeleton-title"></div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="templateError" class="error-state">
          <IconAttention class="error-icon" />
          <span>{{ templateError }}</span>
          <Button size="small" @click="loadTemplates">{{ t('aiPanel.retry') }}</Button>
        </div>

        <!-- Templates Grid -->
        <div v-else-if="templates.length > 0" class="templates-grid">
          <div
            v-for="template in templates"
            :key="template.id"
            class="template-card"
            :class="{ 'selected': selectedTemplateId === template.id }"
            @click="selectTemplate(template.id)"
          >
            <img
              :src="template.cover?.webp?.url || template.cover?.url || ''"
              :alt="template.title"
              class="template-image"
              loading="lazy"
            />
            <div v-if="selectedTemplateId === template.id" class="selected-badge">
              <IconCheck class="check-icon" />
            </div>
            <div class="template-title">{{ template.title }}</div>
          </div>

          <!-- Loading More Skeleton -->
          <template v-if="isLoadingMore">
            <div v-for="i in 4" :key="`loading-${i}`" class="skeleton-card">
              <div class="skeleton-image"></div>
              <div class="skeleton-title"></div>
            </div>
          </template>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          {{ t('aiPanel.empty') }}
        </div>
      </div>

      <!-- Generation Success Message -->
      <div v-if="showSuccessMessage" class="success-message">
        <IconCheckOne class="success-icon" />
        <span>{{ t('aiPanel.success') }}</span>
      </div>
    </div>
  </MoveablePanel>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useMainStore, useSlidesStore } from '@/store'
import { useI18n } from 'vue-i18n'
import message from '@/utils/message'
import { fetchInfographicTemplates, generateInfographic } from '@/services/aiService'
import type { Slide } from '@/types/slides'

import MoveablePanel from '@/components/MoveablePanel.vue'
import TextArea from '@/components/TextArea.vue'
import Button from '@/components/Button.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { t } = useI18n()

interface Template {
  id: string
  title: string
  cover: {
    webp?: { url: string; width: number; height: number }
    url?: string
  }
  category?: string
}

const userInput = ref('')
const textAreaRef = useTemplateRef<InstanceType<typeof TextArea>>('textAreaRef')
const templatesRef = useTemplateRef<HTMLElement>('templatesRef')

// Template state
const templates = ref<Template[]>([])
const selectedTemplateId = ref<string>('')
const isLoadingTemplates = ref(false)
const isLoadingMore = ref(false)
const templateError = ref<string>('')
const hasMoreTemplates = ref(true)
const currentOffset = ref(0)
const pageSize = 20

// Generation state
const isGenerating = ref(false)
const showSuccessMessage = ref(false)

// Load initial templates from API
const loadTemplates = async () => {
  isLoadingTemplates.value = true
  templateError.value = ''
  currentOffset.value = 0
  templates.value = []

  try {
    const { templates: data, hasMore } = await fetchInfographicTemplates(0, pageSize)
    templates.value = data
    hasMoreTemplates.value = hasMore
    currentOffset.value = pageSize

    // Auto-select first template
    if (data.length > 0 && !selectedTemplateId.value) {
      selectedTemplateId.value = data[0].id
    }
  } catch (error) {
    console.error('Failed to load templates:', error)
    templateError.value = error instanceof Error ? error.message : 'Failed to load templates'
  } finally {
    isLoadingTemplates.value = false
  }
}

// Load more templates (infinite scroll)
const loadMoreTemplates = async () => {
  if (isLoadingMore.value || !hasMoreTemplates.value) return

  isLoadingMore.value = true

  try {
    const { templates: data, hasMore } = await fetchInfographicTemplates(currentOffset.value, pageSize)
    templates.value = [...templates.value, ...data]
    hasMoreTemplates.value = hasMore
    currentOffset.value += pageSize
  } catch (error) {
    console.error('Failed to load more templates:', error)
    message.error('Failed to load more templates')
  } finally {
    isLoadingMore.value = false
  }
}

// Handle scroll event for infinite loading
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const scrollTop = target.scrollTop
  const scrollHeight = target.scrollHeight
  const clientHeight = target.clientHeight

  // Load more when scrolled to bottom (with 50px threshold)
  if (scrollHeight - scrollTop - clientHeight < 50) {
    loadMoreTemplates()
  }
}

// Add scroll listener on mount
onMounted(() => {
  loadTemplates()

  if (templatesRef.value) {
    templatesRef.value.addEventListener('scroll', handleScroll)
  }
})

// Remove scroll listener on unmount
onUnmounted(() => {
  if (templatesRef.value) {
    templatesRef.value.removeEventListener('scroll', handleScroll)
  }
})

// Select template
const selectTemplate = (templateId: string) => {
  selectedTemplateId.value = templateId
}

// Handle send button click
const handleSend = async () => {
  if (!userInput.value.trim()) {
    message.warning(t('aiPanel.inputRequired'))
    if (textAreaRef.value) textAreaRef.value.focus()
    return
  }

  if (!selectedTemplateId.value) {
    message.warning(t('aiPanel.selectTemplateFirst'))
    return
  }

  isGenerating.value = true

  try {
    // Call AI API
    const result = await generateInfographic({
      prompt: userInput.value.trim(),
      templateIds: [selectedTemplateId.value],
      reference: '',
    })

    console.log('AI Generation result:', result)

    // Insert slides into PPT
    if (result && result.slides && Array.isArray(result.slides)) {
      // Get current slide index before insertion
      const currentIndex = slidesStore.slideIndex

      // Insert all slides from the generated PPT
      result.slides.forEach((slide: Slide, index: number) => {
        slidesStore.addSlide(slide, currentIndex + 1 + index)
      })

      // Navigate to first new slide
      if (result.slides.length > 0) {
        slidesStore.updateSlideIndex(currentIndex + 1)
      }

      // Show success message
      showSuccessMessage.value = true
      setTimeout(() => {
        showSuccessMessage.value = false
      }, 3000)

      // Clear input
      userInput.value = ''
    } else {
      throw new Error('Invalid response from API')
    }
  } catch (error) {
    console.error('Failed to generate infographic:', error)
    message.error(error instanceof Error ? error.message : t('aiPanel.generateFailed'))
  } finally {
    isGenerating.value = false
  }
}

// Close panel
const close = () => {
  mainStore.setAIPanelState(false)
}
</script>

<style lang="scss" scoped>
.ai-panel {
  height: 100%;
  font-size: 12px;
  user-select: none;
}

.container {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.input-section {
  flex-shrink: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
  margin-bottom: 12px;

  .input-footer {
    margin-top: 10px;
    text-align: right;

    .send-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;

      .icon {
        font-size: 14px;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
}

.templates-section {
  flex: 1;
  overflow: auto;
  margin: 0 -10px;
  padding: 2px 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  padding-left: 2px;
}

.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.error-state {
  color: #f56c6c;

  .error-icon {
    font-size: 32px;
  }
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.template-card {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  background: #f7f7f7;

  &:hover {
    border-color: #d0d0d0;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.selected {
    border-color: $themeColor;
    box-shadow: 0 0 0 2px rgba($themeColor, 0.2);
  }

  .template-image {
    width: 100%;
    height: 120px;
    object-fit: cover;
    display: block;
  }

  .selected-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    background-color: $themeColor;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

    .check-icon {
      font-size: 14px;
      color: #fff;
    }
  }

  .template-title {
    padding: 8px;
    font-size: 12px;
    color: #333;
    text-align: center;
    background: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.skeleton-card {
  border-radius: 6px;
  overflow: hidden;
  background: #f7f7f7;

  .skeleton-image {
    width: 100%;
    height: 120px;
    background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-title {
    padding: 8px;
    margin: 8px;
    height: 12px;
    background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
    background-size: 200% 100%;
    border-radius: 4px;
    animation: shimmer 1.5s infinite;
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.loading-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success-message {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  background: #67c23a;
  color: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  animation: slideUp 0.3s ease-out;
  z-index: 1000;

  .success-icon {
    font-size: 20px;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
