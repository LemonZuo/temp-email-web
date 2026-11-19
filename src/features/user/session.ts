import { loadUserSettings } from '@/lib/api'
import { queryClient } from '@/lib/query-client'
import { DEFAULT_USER_SETTINGS, useApp } from '@/store/app'
import { useAuth } from '@/store/auth'
import { readRaw, writeRaw } from '@/store/storage'

/** Stores a freshly issued user JWT and loads `/user_api/settings` for it. */
export async function completeUserLogin(jwt: string) {
  queryClient.removeQueries({ queryKey: ['user'] })
  // `fetched: false` lets the layout show a spinner instead of the "session expired" hint meanwhile.
  useApp.getState().set({ userSettings: { ...DEFAULT_USER_SETTINGS } })
  useAuth.getState().setUserJwt(jwt)
  await loadUserSettings()
}

export function logoutUser() {
  useAuth.getState().setUserJwt('')
  queryClient.removeQueries({ queryKey: ['user'] })
  useApp.getState().set({ userSettings: { ...DEFAULT_USER_SETTINGS, fetched: true } })
}

// OAuth2 login state, same keys as the previous frontend (sessionStorage + localStorage fallback,
// because some providers open the callback in a new tab).
const STATE_KEY = 'userOauth2SessionState'
const CLIENT_ID_KEY = 'userOauth2SessionClientID'

const readOauth2 = (key: string) => readRaw(window.sessionStorage, key) || readRaw(window.localStorage, `${key}_fb`)
const writeOauth2 = (key: string, value: string) => {
  writeRaw(window.sessionStorage, key, value)
  writeRaw(window.localStorage, `${key}_fb`, value)
}

export const oauth2Session = {
  get: () => ({ state: readOauth2(STATE_KEY), clientID: readOauth2(CLIENT_ID_KEY) }),
  set: (state: string, clientID: string) => {
    writeOauth2(STATE_KEY, state)
    writeOauth2(CLIENT_ID_KEY, clientID)
  },
  clear: () => {
    writeOauth2(STATE_KEY, '')
    writeOauth2(CLIENT_ID_KEY, '')
  },
}

export const randomState = () =>
  Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')

/** Row returned by `/user_api/bind_address` (address table + counters, password hidden). */
export type BoundAddress = {
  id: number
  name: string
  mail_count?: number
  send_count?: number
  expires_at?: string | null
  created_at?: string
  updated_at?: string
}

/** The worker rejects `query` values longer than 100 chars or containing `%` / `_`. */
export const isValidAddressQuery = (query: string) => query.length <= 100 && !/[%_]/.test(query)
