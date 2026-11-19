type RuntimeConfig = Record<string, unknown>

/**
 * Runtime config can be injected into index.html (`<script id="app-config">`) at deploy
 * time so a single build can point at different workers. Falls back to VITE_* env vars.
 */
const getRuntimeConfig = (): RuntimeConfig => {
  if (typeof document === 'undefined') return {}
  const content = document.querySelector('#app-config')?.textContent
  if (!content?.trim()) return {}
  try {
    const config = JSON.parse(content)
    return config && typeof config === 'object' && !Array.isArray(config) ? config : {}
  } catch (error) {
    console.error('Failed to parse app config', error)
    return {}
  }
}

const runtimeConfig = getRuntimeConfig()

const str = (key: string, buildValue: string | undefined): string => {
  const runtimeValue = runtimeConfig[key]
  return typeof runtimeValue === 'string' ? runtimeValue : buildValue || ''
}

export const APP_CONFIG = {
  API_BASE: str('API_BASE', import.meta.env.VITE_API_BASE).replace(/\/$/, ''),
  DEFAULT_LANG: str('DEFAULT_LANG', import.meta.env.VITE_DEFAULT_LANG),
  VERSION: (import.meta.env.PACKAGE_VERSION as string | undefined) || '',
} as const
