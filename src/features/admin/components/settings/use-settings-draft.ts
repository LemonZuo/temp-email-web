import { useCallback, useEffect, useState } from 'react'
import { useBlocker } from 'react-router'
import { useQuery, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { confirm } from '@/components/common/confirm'
import { errorMessage } from '@/lib/format'
import { useT } from '@/i18n'
import { settingsMessages } from './messages'

const isSame = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)

/**
 * Loads a settings object with TanStack Query and keeps an editable draft of it.
 *
 * - `draft` is reset whenever fresh data arrives (first load, refetch after save).
 * - `dirty` compares the draft with the last loaded value.
 * - Load errors are toasted; leaving the page with unsaved changes asks for confirmation.
 */
export function useSettingsDraft<T>({ queryKey, queryFn }: { queryKey: QueryKey; queryFn: () => Promise<T> }) {
  const query = useQuery({ queryKey, queryFn })
  const [synced, setSynced] = useState<T | undefined>(undefined)
  const [draft, setDraft] = useState<T | undefined>(undefined)

  // Adopt new server data during render (no effect round-trip / flash of stale draft).
  if (query.data !== undefined && query.data !== synced) {
    setSynced(query.data)
    setDraft(query.data)
  }

  const dirty = draft !== undefined && synced !== undefined && !isSame(draft, synced)

  useEffect(() => {
    if (query.error) toast.error(errorMessage(query.error))
  }, [query.error])

  useUnsavedChangesGuard(dirty)

  const update = useCallback((patch: Partial<T>) => setDraft((d) => (d === undefined ? d : { ...d, ...patch })), [])
  const reset = useCallback(() => setDraft(synced), [synced])

  return {
    draft,
    setDraft,
    update,
    reset,
    dirty,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Warns before leaving the page (in-app navigation or tab close) while there are unsaved changes. */
export function useUnsavedChangesGuard(dirty: boolean) {
  const t = useT(settingsMessages)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    let active = true
    confirm({ title: t('leaveTitle'), description: t('leaveDescription'), confirmText: t('leave'), destructive: true }).then(
      (ok) => {
        if (!active) return
        if (ok) blocker.proceed()
        else blocker.reset()
      },
    )
    return () => {
      active = false
    }
  }, [blocker, t])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}
