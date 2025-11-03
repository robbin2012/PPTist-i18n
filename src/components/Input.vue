<template>
<div 
    class="input"
    :class="{
      'disabled': disabled,
      'focused': focused,
      'simple': simple,
      'ghost': ghost,
    }"
  >
    <span class="prefix">
      <slot name="prefix"></slot>
    </span>
    <input
      type="text"
      ref="inputRef"
      :style="inputStyle"
      :disabled="disabled"
      :value="value" 
      :placeholder="placeholder"
      :maxlength="maxlength"
      @input="$event => handleInput($event)"
      @focus="$event => handleFocus($event)"
      @blur="$event => handleBlur($event)"
      @change="$event => emit('change', $event)"
      @keydown.enter="$event => emit('enter', $event)"
      @keydown.backspace="$event => emit('backspace', $event)"
    />
    <span class="suffix">
      <slot name="suffix"></slot>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { useTemplateRef, ref, computed } from 'vue'

withDefaults(defineProps<{
  value: string
  disabled?: boolean
  placeholder?: string
  simple?: boolean
  maxlength?: number
  ghost?: boolean
}>(), {
  disabled: false,
  placeholder: '',
  simple: false,
  ghost: false,
})

const emit = defineEmits<{
  (event: 'update:value', payload: string): void
  (event: 'input', payload: Event): void
  (event: 'change', payload: Event): void
  (event: 'blur', payload: Event): void
  (event: 'focus', payload: Event): void
  (event: 'enter', payload: Event): void
  (event: 'backspace', payload: Event): void
}>()

const focused = ref(false)

const handleInput = (e: Event) => {
  emit('update:value', (e.target as HTMLInputElement).value)
}
const handleBlur = (e: Event) => {
  focused.value = false
  emit('blur', e)
}
const handleFocus = (e: Event) => {
  focused.value = true
  emit('focus', e)
}

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const inputStyle = computed(() => ({
  backgroundColor: (/* @ts-ignore */ (typeof ghost !== 'undefined' && ghost)) ? 'transparent' : undefined,
  WebkitAppearance: (/* @ts-ignore */ (typeof ghost !== 'undefined' && ghost)) ? 'none' : undefined,
  appearance: (/* @ts-ignore */ (typeof ghost !== 'undefined' && ghost)) ? 'none' : undefined,
}))
const focus = () => {
  if (inputRef.value) inputRef.value.focus()
}

defineExpose({
  focus,
})
</script>

<style lang="scss" scoped>
.input {
  background-color: var(--input-bg, #fff);
  border: 1px solid var(--input-border, #d9d9d9);
  padding: 0 5px;
  border-radius: var(--input-radius, $borderRadius);
  transition: border-color .25s;
  font-size: 13px;
  display: flex;

  input {
    min-width: 0;
    height: 30px;
    outline: 0;
    border: 0;
    line-height: 30px;
    vertical-align: top;
    background-color: var(--input-field-bg, transparent);
    color: var(--input-text-color, $textColor);
    padding: 0 5px;
    flex: 1;
    font-size: 13px;
    font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Noto Color Emoji';

    &::placeholder {
      color: var(--input-placeholder-color, #bfbfbf);
    }
  }

  &:not(.disabled):hover, &.focused {
    border-color: var(--input-border-hover, $themeColor);
  }

  &.disabled {
    background-color: #f5f5f5;
    border-color: #dcdcdc;
    color: #b7b7b7;

    input {
      color: #b7b7b7;
    }
  }

  &.simple {
    border: 0;
  }

  .prefix, .suffix {
    display: flex;
    justify-content: center;
    align-items: center;
    line-height: 30px;
    user-select: none;
  }
}

/* Ghost style: transparent background, border-only container */
.input.ghost {
  background-color: transparent !important;
  border-color: var(--input-border, #d9d9d9);
}
.input.ghost input {
  background-color: transparent !important;
  color: var(--input-text-color, $textColor);
}
.input.ghost:not(.disabled):hover,
.input.ghost.focused {
  border-color: var(--input-border-hover, $themeColor);
}
</style>
