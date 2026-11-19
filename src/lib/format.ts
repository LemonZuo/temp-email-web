import { usePrefs } from '@/store/prefs'

/** Backend timestamps are UTC strings like `2024-01-01 12:00:00` without zone. */
export const parseUtcDate = (utcDate: string | null | undefined): Date | null => {
  if (!utcDate) return null
  const normalized = /[zZ]|[+-]\d\d:?\d\d$/.test(utcDate) ? utcDate : `${utcDate.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDateTime = (utcDate: string | null | undefined, useUTC = usePrefs.getState().useUTCDate) => {
  if (!utcDate) return ''
  if (useUTC) return `${utcDate} UTC`
  const date = parseUtcDate(utcDate)
  return date ? date.toLocaleString() : `${utcDate} UTC`
}

/** Compact time for list rows: time today, month/day this year, else full date. */
export const formatShortDate = (utcDate: string | null | undefined) => {
  const date = parseUtcDate(utcDate)
  if (!date) return utcDate || ''
  if (usePrefs.getState().useUTCDate) return `${utcDate} UTC`
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString()
}

export const humanFileSize = (size: number) => {
  if (!size) return '0 B'
  const i = Math.min(Math.floor(Math.log(size) / Math.log(1024)), 4)
  return `${parseFloat((size / Math.pow(1024, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'error'
