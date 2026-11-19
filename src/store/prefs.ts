import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'zh' | 'en'

type Prefs = {
  locale: Locale | ''
  useUTCDate: boolean
  autoLoadRemoteImages: boolean
  autoRefresh: boolean
  autoRefreshInterval: number
  preferShowTextMail: boolean
  /** Lines of body preview shown in mail list rows (0-3) */
  previewLines: number
  /** Width of the mail list pane in pixels (desktop) */
  listPaneWidth: number
  set: (patch: Partial<Omit<Prefs, 'set'>>) => void
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      locale: '',
      useUTCDate: false,
      autoLoadRemoteImages: false,
      autoRefresh: false,
      autoRefreshInterval: 60,
      preferShowTextMail: false,
      previewLines: 1,
      listPaneWidth: 360,
      set: (patch) => set(patch),
    }),
    {
      name: 'tm-prefs',
      version: 1,
      partialize: ({ set: _set, ...rest }) => rest,
      // v1: the list pane went from a percentage (`listPaneSize`) to a pixel width
      migrate: (persisted) => {
        const { listPaneSize: _old, ...rest } = (persisted ?? {}) as Record<string, unknown>
        return rest as Omit<Prefs, 'set'> // missing keys fall back to the defaults when merged
      },
    },
  ),
)
