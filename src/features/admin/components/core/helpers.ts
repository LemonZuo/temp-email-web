import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** Worker sort order values (`sort_order` query param). */
export type SortOrder = 'ascend' | 'descend' | ''
export type SortState<K extends string = string> = { by: K | ''; order: SortOrder }

/** Next state in the ascend → descend → off cycle for column `key`. */
export function nextSort<K extends string>(state: SortState<K>, key: K): SortState<K> {
  if (state.by !== key || !state.order) return { by: key, order: 'ascend' }
  if (state.order === 'ascend') return { by: key, order: 'descend' }
  return { by: '', order: '' }
}

/** Auto-login link for an address JWT (same format as the credential dialog). */
export const loginUrl = (jwt: string) => `${window.location.origin}/?jwt=${encodeURIComponent(jwt)}`

/** `?address=` filter shared by the admin mail / sendbox pages. */
export function useAddressParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const address = (searchParams.get('address') || '').trim()
  const setAddress = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value.trim()) next.set('address', value.trim())
          else next.delete('address')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )
  return [address, setAddress] as const
}
