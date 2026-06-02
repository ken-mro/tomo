import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import ja from './locales/ja.json'
import zh from './locales/zh.json'
import es from './locales/es.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' },
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      // Simplified Chinese is the default for `zh`. To add Traditional, ship a
      // zh-TW resource and add it to SUPPORTED_LANGUAGES — the detector and
      // fallback chain handle the rest.
      zh: { translation: zh },
      es: { translation: es },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja', 'zh', 'es'],
    nonExplicitSupportedLngs: true, // map zh-CN, zh-TW, en-US, etc. to the base language
    interpolation: { escapeValue: false },
    detection: {
      // Persist the user's explicit choice; otherwise sniff the browser.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'tomo.lang',
      caches: ['localStorage'],
    },
  })

export default i18n
