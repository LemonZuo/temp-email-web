import { loadAddressSettings } from './api'
import { queryClient } from './query-client'
import { useAuth } from '@/store/auth'
import { useApp } from '@/store/app'

/** Switch the current mailbox to another address JWT and reload address-scoped data. */
export async function switchAddress(jwt: string) {
  useAuth.getState().setJwt(jwt)
  useAuth.getState().setAddressPassword('')
  queryClient.removeQueries({ queryKey: ['mailbox'] })
  await loadAddressSettings()
}

/** Forget the current mailbox (stays in the local address cache). */
export function leaveAddress() {
  useAuth.getState().setJwt('')
  useAuth.getState().setAddressPassword('')
  queryClient.removeQueries({ queryKey: ['mailbox'] })
  useApp.getState().set({ addressSettings: { fetched: true, address: '', send_balance: 0 } })
}
