import { useCallback } from 'react'
import { APP_CONFIG } from '@/lib/config'
import { usePrefs, type Locale } from '@/store/prefs'
import { common } from './common'

export type { Locale }
export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
]

type Dict = Record<string, string>

/**
 * Co-locate translations with the component that uses them:
 *
 *   const messages = defineMessages({
 *     zh: { title: '收件箱', count: '共 {n} 封' },
 *     en: { title: 'Inbox', count: '{n} mails' },
 *   })
 *   const t = useT(messages)
 *   t('count', { n: 3 })
 *
 * Keys from `common` (ok/cancel/save/delete/...) are always available as fallback.
 */
export function defineMessages<T extends Dict>(messages: { zh: T; en: { [K in keyof T]: string } }) {
  return messages
}

export type Messages<T extends Dict = Dict> = { zh: T; en: { [K in keyof T]: string } }
type CommonKey = keyof typeof common.zh
export type TFunction<K extends string = string> = (key: K | CommonKey, params?: Record<string, string | number>) => string

const normalizeLocale = (value: string | null | undefined): Locale | '' => {
  if (!value) return ''
  const lower = value.toLowerCase()
  if (lower.startsWith('zh')) return 'zh'
  if (lower.startsWith('en')) return 'en'
  return ''
}

export const resolveLocale = (preferred: string): Locale =>
  normalizeLocale(preferred) ||
  normalizeLocale(APP_CONFIG.DEFAULT_LANG) ||
  normalizeLocale(typeof navigator !== 'undefined' ? navigator.language : '') ||
  'en'

export const isLocale = (value: string): value is Locale => value === 'zh' || value === 'en'

/** Current locale, reactive. */
export const useLocale = (): Locale => resolveLocale(usePrefs((s) => s.locale))

/** Non-reactive read for use outside React (api client headers). */
export const getLocale = (): Locale => resolveLocale(usePrefs.getState().locale)

export const setLocale = (locale: Locale) => usePrefs.getState().set({ locale })

const format = (template: string, params?: Record<string, string | number>) =>
  params ? template.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : template

export function translate(messages: Messages | null, locale: Locale, key: string, params?: Record<string, string | number>) {
  const local = messages?.[locale] as Dict | undefined
  const value =
    local?.[key] ??
    (common[locale] as Dict)[key] ??
    (messages?.en as Dict | undefined)?.[key] ??
    (common.en as Dict)[key] ??
    key
  return format(value, params)
}

export function useT<T extends Dict>(messages?: Messages<T>): TFunction<Extract<keyof T, string>> {
  const locale = useLocale()
  return useCallback(
    (key: string, params?: Record<string, string | number>) => translate((messages as Messages) ?? null, locale, key, params),
    [messages, locale],
  ) as TFunction<Extract<keyof T, string>>
}
