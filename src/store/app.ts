import { create } from 'zustand'
import { useAuth } from './auth'

export type DomainOption = { label: string; value: string }

export type SmtpImapProxyConfig = {
  smtp: { host: string; port: number; starttls: boolean }
  imap: { host: string; port: number; starttls: boolean }
}

/** `/open_api/settings` — public site configuration. */
export type OpenSettings = {
  fetched: boolean
  title: string
  announcement: string
  alwaysShowAnnouncement: boolean
  prefix: string
  addressRegex: string
  minAddressLen: number
  maxAddressLen: number
  needAuth: boolean
  adminContact: string
  disableUserSystem: boolean
  enableUserCreateEmail: boolean
  disableAnonymousUserCreateEmail: boolean
  disableCustomAddressName: boolean
  enableUserDeleteEmail: boolean
  enableMailReadStatus: boolean
  enableAddressExpiry: boolean
  enableAutoReply: boolean
  enableIndexAbout: boolean
  defaultDomains: string[]
  randomSubdomainDomains: string[]
  domains: DomainOption[]
  copyright: string
  cfTurnstileSiteKey: string
  enableWebhook: boolean
  isS3Enabled: boolean
  enableSendMail: boolean
  version: string
  showGithub: boolean
  showGithubForUser: boolean
  disableAdminPasswordCheck: boolean
  enableAddressPassword: boolean
  addressPasswordLoginOnly: boolean
  enableAgentEmailInfo: boolean
  enableRedeemCode: boolean
  redeemCodeUrl: string
  smtpImapProxyConfig: SmtpImapProxyConfig
  statusUrl: string
  enableGlobalTurnstileCheck: boolean
}

/** `/api/settings` — current address. */
export type AddressSettings = {
  fetched: boolean
  address: string
  send_balance: number
}

/** `/user_api/open_settings` */
export type UserOpenSettings = {
  fetched: boolean
  enable: boolean
  enableMailVerify: boolean
  oauth2ClientIDs: { clientID: string; name: string; icon?: string }[]
}

export type UserRole = { domains?: string[] | null; role: string; prefix?: string | null }

/** `/user_api/settings` */
export type UserSettings = {
  fetched: boolean
  user_email: string
  user_id: number
  is_admin: boolean
  access_token: string | null
  new_user_token: string | null
  user_role: UserRole | null
}

export const DEFAULT_OPEN_SETTINGS: OpenSettings = {
  fetched: false,
  title: '',
  announcement: '',
  alwaysShowAnnouncement: false,
  prefix: '',
  addressRegex: '',
  minAddressLen: 1,
  maxAddressLen: 30,
  needAuth: false,
  adminContact: '',
  disableUserSystem: false,
  enableUserCreateEmail: false,
  disableAnonymousUserCreateEmail: false,
  disableCustomAddressName: false,
  enableUserDeleteEmail: false,
  enableMailReadStatus: false,
  enableAddressExpiry: false,
  enableAutoReply: false,
  enableIndexAbout: false,
  defaultDomains: [],
  randomSubdomainDomains: [],
  domains: [],
  copyright: 'Dream Hunter',
  cfTurnstileSiteKey: '',
  enableWebhook: false,
  isS3Enabled: false,
  enableSendMail: false,
  version: '',
  showGithub: true,
  showGithubForUser: true,
  disableAdminPasswordCheck: false,
  enableAddressPassword: false,
  addressPasswordLoginOnly: false,
  enableAgentEmailInfo: false,
  enableRedeemCode: false,
  redeemCodeUrl: '',
  smtpImapProxyConfig: {
    smtp: { host: '', port: 8025, starttls: false },
    imap: { host: '', port: 11143, starttls: false },
  },
  statusUrl: '',
  enableGlobalTurnstileCheck: false,
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  fetched: false,
  user_email: '',
  user_id: 0,
  is_admin: false,
  access_token: null,
  new_user_token: null,
  user_role: null,
}

type AppState = {
  openSettings: OpenSettings
  addressSettings: AddressSettings
  userOpenSettings: UserOpenSettings
  userSettings: UserSettings
  /** Site password dialog (x-custom-auth) */
  showSiteAuth: boolean
  /** Admin password dialog (x-admin-auth) */
  showAdminAuth: boolean
  /** Address credential dialog (shown after creating an address) */
  showCredential: boolean
  set: (patch: Partial<Omit<AppState, 'set'>>) => void
}

export const useApp = create<AppState>((set) => ({
  openSettings: DEFAULT_OPEN_SETTINGS,
  addressSettings: { fetched: false, address: '', send_balance: 0 },
  userOpenSettings: { fetched: false, enable: false, enableMailVerify: false, oauth2ClientIDs: [] },
  userSettings: DEFAULT_USER_SETTINGS,
  showSiteAuth: false,
  showAdminAuth: false,
  showCredential: false,
  set: (patch) => set(patch),
}))

/** Derived flags used across the app. */
export const useFlags = () => {
  const openSettings = useApp((s) => s.openSettings)
  const userSettings = useApp((s) => s.userSettings)
  const userJwt = useAuth((s) => s.userJwt)
  const adminAuth = useAuth((s) => s.adminAuth)
  const showUserSystem = openSettings.fetched && !openSettings.disableUserSystem
  return {
    showUserSystem,
    showUserMailboxes: showUserSystem && !!userJwt,
    showAdminPage: !!adminAuth || userSettings.is_admin || openSettings.disableAdminPasswordCheck,
  }
}
