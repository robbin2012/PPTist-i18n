import { createI18n } from 'vue-i18n'
import zhCN from '@/locales/zh-CN.json'
import enUS from '@/locales/en-US.json'
import esES from '@/locales/es-ES.json'
import frFR from '@/locales/fr-FR.json'
import ruRU from '@/locales/ru-RU.json'
import jaJP from '@/locales/ja-JP.json'

export type AppLocale = 'zh-CN' | 'en-US' | 'es-ES' | 'fr-FR' | 'ru-RU' | 'ja-JP'

const SUPPORTED: Record<string, AppLocale> = {
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-CN': 'zh-CN',
  en: 'en-US',
  'en-us': 'en-US',
  'en-US': 'en-US',
  es: 'es-ES',
  'es-es': 'es-ES',
  'es-ES': 'es-ES',
  fr: 'fr-FR',
  'fr-fr': 'fr-FR',
  'fr-FR': 'fr-FR',
  ru: 'ru-RU',
  'ru-ru': 'ru-RU',
  'ru-RU': 'ru-RU',
  ja: 'ja-JP',
  jp: 'ja-JP',
  'ja-jp': 'ja-JP',
  'ja-JP': 'ja-JP',
}

function detectLocale(): AppLocale {
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = (params.get('lang') || '').trim()
    if (raw) {
      const key = raw.toLowerCase()
      return SUPPORTED[key] || (SUPPORTED[raw] as AppLocale) || 'zh-CN'
    }
  } catch {}
  return 'zh-CN'
}

const locale = detectLocale()

export const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
    'es-ES': esES,
    'fr-FR': frFR,
    'ru-RU': ruRU,
    'ja-JP': jaJP,
  },
})

// keep <html lang="..."> in sync
try {
  document.documentElement.setAttribute('lang', locale)
} catch {}

// helper for non-component files
export const t = (key: string, params?: Record<string, any>) => i18n.global.t(key as any, params as any) as string

export default i18n
