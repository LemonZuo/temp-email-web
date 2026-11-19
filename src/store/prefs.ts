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
  /** Width of the mail list pane in percent */
  listPaneSize: number
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
      listPaneSize: 36,
      set: (patch) => set(patch),
    }),
    { name: 'tm-prefs', partialize: ({ set: _set, ...rest }) => rest },
  ),
)
