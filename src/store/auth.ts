import { create } from 'zustand'
import { readJson, readRaw, writeJson, writeRaw } from './storage'

type AuthState = {
  /** Address (mailbox) JWT, sent as `Authorization: Bearer` */
  jwt: string
  /** User account JWT, sent as `x-user-token` */
  userJwt: string
  /** Admin password, sent as `x-admin-auth` */
  adminAuth: string
  /** Global site password, sent as `x-custom-auth` */
  siteAuth: string
  /** Password returned when an address was just created (session only) */
  addressPassword: string
  /** Address JWTs this browser has used, for quick switching */
  localAddressCache: string[]
  setJwt: (jwt: string) => void
  setUserJwt: (jwt: string) => void
  setAdminAuth: (v: string) => void
  setSiteAuth: (v: string) => void
  setAddressPassword: (v: string) => void
  setLocalAddressCache: (list: string[]) => void
  rememberJwt: (jwt: string) => void
}

const ls = window.localStorage
const ss = window.sessionStorage

export const useAuth = create<AuthState>((set, get) => ({
  jwt: readRaw(ls, 'jwt'),
  userJwt: readRaw(ls, 'userJwt'),
  adminAuth: readRaw(ls, 'adminAuth'),
  siteAuth: readRaw(ls, 'auth'),
  addressPassword: readRaw(ss, 'addressPassword'),
  localAddressCache: readJson<string[]>(ls, 'LocalAddressCache', []).filter((x) => typeof x === 'string'),
  setJwt: (jwt) => {
    writeRaw(ls, 'jwt', jwt)
    set({ jwt })
    if (jwt) get().rememberJwt(jwt)
  },
  setUserJwt: (userJwt) => {
    writeRaw(ls, 'userJwt', userJwt)
    set({ userJwt })
  },
  setAdminAuth: (adminAuth) => {
    writeRaw(ls, 'adminAuth', adminAuth)
    set({ adminAuth })
  },
  setSiteAuth: (siteAuth) => {
    writeRaw(ls, 'auth', siteAuth)
    set({ siteAuth })
  },
  setAddressPassword: (addressPassword) => {
    writeRaw(ss, 'addressPassword', addressPassword)
    set({ addressPassword })
  },
  setLocalAddressCache: (localAddressCache) => {
    writeJson(ls, 'LocalAddressCache', localAddressCache)
    set({ localAddressCache })
  },
  rememberJwt: (jwt) => {
    const list = get().localAddressCache
    if (jwt && !list.includes(jwt)) get().setLocalAddressCache([...list, jwt])
  },
}))

// Keep the current jwt in the local cache (mirrors previous frontend behaviour)
{
  const { jwt, rememberJwt } = useAuth.getState()
  if (jwt) rememberJwt(jwt)
}
