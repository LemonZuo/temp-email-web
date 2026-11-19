import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ContentType = 'text' | 'html' | 'rich'

export type ComposeDraft = {
  fromName: string
  toName: string
  toMail: string
  subject: string
  contentType: ContentType
  content: string
}

export const EMPTY_DRAFT: ComposeDraft = {
  fromName: '',
  toName: '',
  toMail: '',
  subject: '',
  contentType: 'text',
  content: '',
}

type ComposeState = {
  draft: ComposeDraft
  /** Bumped whenever the draft is replaced from outside (reply/forward) so editors re-init */
  revision: number
  setDraft: (patch: Partial<ComposeDraft>) => void
  replaceDraft: (patch: Partial<ComposeDraft>) => void
  reset: () => void
}

const createComposeStore = (name: string) =>
  create<ComposeState>()(
    persist(
      (set) => ({
        draft: EMPTY_DRAFT,
        revision: 0,
        setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
        replaceDraft: (patch) => set((s) => ({ draft: { ...EMPTY_DRAFT, ...patch }, revision: s.revision + 1 })),
        reset: () => set((s) => ({ draft: EMPTY_DRAFT, revision: s.revision + 1 })),
      }),
      { name, storage: createJSONStorage(() => sessionStorage) },
    ),
  )

export type ComposeStore = ReturnType<typeof createComposeStore>

/** Compose draft shared by reply/forward actions and the compose pages (session scoped). */
export const useCompose = createComposeStore('tm-compose')

/** Separate draft for the admin console's send page, so it never mixes with a mailbox draft. */
export const useAdminCompose = createComposeStore('tm-compose-admin')
