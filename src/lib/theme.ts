import { useSyncExternalStore } from 'react'

/**
 * Minimal light / dark / system theme switcher (replaces next-themes, which renders a <script>
 * inside the React tree and warns under React 19). Stored as a raw string under `theme`;
 * `index.html` applies the class before first paint.
 */
export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

const readTheme = (): Theme => {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'light' || value === 'dark' ? value : 'system'
}

const resolve = (theme: Theme): ResolvedTheme => (theme === 'system' ? (media.matches ? 'dark' : 'light') : theme)

let snapshot = { theme: readTheme(), resolvedTheme: resolve(readTheme()) }

function apply() {
  const root = document.documentElement
  // Avoid every element animating its colors while switching.
  const style = document.createElement('style')
  style.textContent = '*,*::before,*::after{transition:none!important}'
  document.head.appendChild(style)
  root.classList.toggle('dark', snapshot.resolvedTheme === 'dark')
  root.style.colorScheme = snapshot.resolvedTheme
  void window.getComputedStyle(document.body).opacity
  setTimeout(() => style.remove(), 1)
}

function update(theme: Theme) {
  const resolvedTheme = resolve(theme)
  if (theme === snapshot.theme && resolvedTheme === snapshot.resolvedTheme) return
  snapshot = { theme, resolvedTheme }
  apply()
  listeners.forEach((l) => l())
}

export function setTheme(theme: string) {
  const next: Theme = theme === 'light' || theme === 'dark' ? theme : 'system'
  localStorage.setItem(STORAGE_KEY, next)
  update(next)
}

media.addEventListener('change', () => update(snapshot.theme))
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) update(readTheme())
})
apply()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const state = useSyncExternalStore(subscribe, () => snapshot)
  return { ...state, setTheme }
}
