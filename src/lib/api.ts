import { toast } from 'sonner'
import { getLocale } from '@/i18n'
import { useApp, DEFAULT_OPEN_SETTINGS, type OpenSettings, type UserSettings } from '@/store/app'
import { useAuth } from '@/store/auth'
import { APP_CONFIG } from './config'
import { getFingerprint } from './fingerprint'
import { safeBearerHeader, safeHeaderValue } from './headers'

export const ErrorCode = {
  AUTH_SITE_PASSWORD_INVALID: 'AUTH_SITE_PASSWORD_INVALID',
  AUTH_ADMIN_CREDENTIAL_INVALID: 'AUTH_ADMIN_CREDENTIAL_INVALID',
  AUTH_USER_ACCESS_TOKEN_EXPIRED: 'AUTH_USER_ACCESS_TOKEN_EXPIRED',
} as const

export class ApiError extends Error {
  status: number
  code?: string
  data: unknown
  constructor(status: number, message: string, data: unknown) {
    super(message)
    this.status = status
    this.data = data
    this.code = (data as { code?: string } | null)?.code
  }
}

export type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Objects are JSON encoded; strings are sent as-is. */
  body?: unknown
  /** Override the user JWT for this request (used when verifying a refreshed token). */
  userJwt?: string
  signal?: AbortSignal
}

const TIMEOUT_MS = 30_000

// Paths where an expired x-user-access-token is refreshed via /user_api/settings and retried.
const MAILBOX_REFRESH_PATHS = new Set(['/api/settings', '/api/send_mail'])
const REFRESH_PATH_PREFIXES = ['/admin/', ...MAILBOX_REFRESH_PATHS, '/user_api/bind_address', '/user_api/address/']

const buildHeaders = async (options: ApiOptions, accessTokenOverride?: string | null) => {
  const auth = useAuth.getState()
  const { userSettings } = useApp.getState()
  const headers: Record<string, string> = {
    'x-lang': getLocale(),
    'x-fingerprint': await getFingerprint(),
    'Content-Type': 'application/json',
  }
  const userToken = safeHeaderValue(options.userJwt ?? auth.userJwt)
  if (userToken) headers['x-user-token'] = userToken
  const accessToken = safeHeaderValue(accessTokenOverride === undefined ? userSettings.access_token : accessTokenOverride)
  if (accessToken) headers['x-user-access-token'] = accessToken
  const siteAuth = safeHeaderValue(auth.siteAuth)
  if (siteAuth) headers['x-custom-auth'] = siteAuth
  const adminAuth = safeHeaderValue(auth.adminAuth)
  if (adminAuth) headers['x-admin-auth'] = adminAuth
  const bearer = safeBearerHeader(auth.jwt)
  if (bearer) headers['Authorization'] = bearer
  return headers
}

const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) return null
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

const errorText = (data: unknown, status: number) => {
  if (data && typeof data === 'object') {
    const d = data as { message?: string; error?: string }
    return d.message || d.error || JSON.stringify(data)
  }
  return (typeof data === 'string' && data) || `HTTP ${status}`
}

const rawRequest = async (path: string, options: ApiOptions, headers: Record<string, string>) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const onAbort = () => controller.abort()
  options.signal?.addEventListener('abort', onAbort)
  try {
    const body =
      options.body === undefined || options.body === null
        ? undefined
        : typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
    const response = await fetch(`${APP_CONFIG.API_BASE}${path}`, {
      method: options.method || (body ? 'POST' : 'GET'),
      headers,
      body,
      signal: controller.signal,
    })
    return { status: response.status, data: await readBody(response) }
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', onAbort)
  }
}

let pendingRefresh: Promise<void> | null = null
const refreshUserAccessToken = async (userToken: string) => {
  if (!pendingRefresh) {
    pendingRefresh = (async () => {
      const headers = await buildHeaders({ userJwt: userToken }, null)
      const { status, data } = await rawRequest('/user_api/settings', {}, headers)
      if (status >= 300) throw new ApiError(status, errorText(data, status), data)
      if (safeHeaderValue(useAuth.getState().userJwt) === userToken) {
        useApp.getState().set({ userSettings: { ...useApp.getState().userSettings, ...(data as object) } })
      }
    })().finally(() => {
      pendingRefresh = null
    })
  }
  return pendingRefresh
}

const isCode = (status: number, data: unknown, code: string) =>
  status === 401 && (data as { code?: string } | null)?.code === code

/**
 * Calls the worker API with all auth headers attached. Throws ApiError on status >= 300.
 * Also opens the site/admin password dialogs on the corresponding 401 codes.
 */
export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = await buildHeaders(options)
  let { status, data } = await rawRequest(path, options, headers)

  // Expired role access token: refresh from /user_api/settings once and retry.
  if (isCode(status, data, ErrorCode.AUTH_USER_ACCESS_TOKEN_EXPIRED) && headers['x-user-access-token']) {
    const pathname = path.split('?')[0]
    const userToken = headers['x-user-token']
    if (REFRESH_PATH_PREFIXES.some((p) => pathname.startsWith(p)) && (userToken || MAILBOX_REFRESH_PATHS.has(pathname))) {
      let accessToken: string | null = null
      if (userToken) {
        try {
          await refreshUserAccessToken(userToken)
          accessToken = useApp.getState().userSettings.access_token
        } catch (error) {
          if (!MAILBOX_REFRESH_PATHS.has(pathname)) throw error
        }
      }
      const retryHeaders = await buildHeaders(options, accessToken)
      // Never replay a request (e.g. send_mail) as a different mailbox or user than the one it was made for.
      if (retryHeaders['Authorization'] !== headers['Authorization'] || retryHeaders['x-user-token'] !== headers['x-user-token']) {
        throw new ApiError(status, 'Session changed, please try again', data)
      }
      ;({ status, data } = await rawRequest(path, options, retryHeaders))
    }
  }

  if (isCode(status, data, ErrorCode.AUTH_ADMIN_CREDENTIAL_INVALID)) useApp.getState().set({ showAdminAuth: true })
  if (isCode(status, data, ErrorCode.AUTH_SITE_PASSWORD_INVALID)) useApp.getState().set({ showSiteAuth: true })
  if (status >= 300) throw new ApiError(status, errorText(data, status), data)
  return data as T
}

export const api = {
  get: <T = unknown>(path: string, options?: Omit<ApiOptions, 'method' | 'body'>) => apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'POST', body: body ?? {} }),
  put: <T = unknown>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body: body ?? {} }),
  patch: <T = unknown>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body: body ?? {} }),
  delete: <T = unknown>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'DELETE', body }),
}

/** Paginated list response used by most list endpoints. */
export type ListResponse<T> = { results: T[]; count: number }

// ---------------------------------------------------------------------------
// Settings loaders (write into the global app store)
// ---------------------------------------------------------------------------

export async function loadOpenSettings() {
  try {
    const res = await api.get<Record<string, unknown>>('/open_api/settings')
    const domains = Array.isArray(res.domains) ? (res.domains as string[]) : []
    const domainLabels = Array.isArray(res.domainLabels) ? (res.domainLabels as string[]) : []
    if (domains.length < 1) toast.error('No domains found, please check your worker settings')
    const merged: OpenSettings = {
      ...DEFAULT_OPEN_SETTINGS,
      ...(res as Partial<OpenSettings>),
      fetched: true,
      title: (res.title as string) || '',
      prefix: (res.prefix as string) || '',
      minAddressLen: (res.minAddressLen as number) || 1,
      maxAddressLen: (res.maxAddressLen as number) || 30,
      copyright: (res.copyright as string) || DEFAULT_OPEN_SETTINGS.copyright,
      defaultDomains: (res.defaultDomains as string[]) || [],
      randomSubdomainDomains: (res.randomSubdomainDomains as string[]) || [],
      domains: domains.map((value, i) => ({ value, label: domainLabels[i] || value })),
      adminContact: (res.adminContact as string) || '',
      cfTurnstileSiteKey: (res.cfTurnstileSiteKey as string) || '',
      showGithubForUser: (res.showGithubForUser as boolean) ?? true,
      smtpImapProxyConfig: (res.smtpImapProxyConfig as OpenSettings['smtpImapProxyConfig']) || DEFAULT_OPEN_SETTINGS.smtpImapProxyConfig,
    }
    useApp.getState().set({ openSettings: merged, ...(merged.needAuth ? { showSiteAuth: true } : {}) })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'error')
    useApp.getState().set({ openSettings: { ...useApp.getState().openSettings, fetched: true } })
  }
}

/** Loads `/api/settings` for the current address JWT; renews password-login tokens. */
export async function loadAddressSettings() {
  const { jwt, setJwt } = useAuth.getState()
  const set = useApp.getState().set
  if (!safeHeaderValue(jwt)) {
    set({ addressSettings: { fetched: true, address: '', send_balance: 0 } })
    return
  }
  try {
    const res = await api.get<{ address: string; send_balance: number; new_address_token?: string }>('/api/settings')
    // Switched to another mailbox meanwhile: that newer call owns the settings.
    if (useAuth.getState().jwt !== jwt) return
    if (res.new_address_token) setJwt(res.new_address_token)
    set({
      addressSettings: { fetched: true, jwt: res.new_address_token || jwt, address: res.address, send_balance: res.send_balance || 0 },
    })
  } catch (error) {
    if (useAuth.getState().jwt !== jwt) return
    set({ addressSettings: { fetched: true, jwt, address: '', send_balance: 0 } })
    throw error
  }
}

export async function loadUserOpenSettings() {
  try {
    const res = await api.get<Record<string, unknown>>('/user_api/open_settings')
    useApp.getState().set({ userOpenSettings: { ...useApp.getState().userOpenSettings, ...res, fetched: true } })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'error')
    useApp.getState().set({ userOpenSettings: { ...useApp.getState().userOpenSettings, fetched: true } })
  }
}

/** Loads `/user_api/settings`; swaps in a renewed user JWT when the worker issues one. */
export async function loadUserSettings() {
  const { userJwt, setUserJwt } = useAuth.getState()
  const { openSettings, set } = useApp.getState()
  if (openSettings.disableUserSystem || !safeHeaderValue(userJwt)) {
    set({ userSettings: { ...useApp.getState().userSettings, fetched: true } })
    return
  }
  try {
    const res = await api.get<Omit<UserSettings, 'fetched'>>('/user_api/settings')
    set({ userSettings: { ...useApp.getState().userSettings, ...res, fetched: true } })
    if (res.new_user_token) {
      try {
        await api.get('/user_api/settings', { userJwt: res.new_user_token })
        setUserJwt(res.new_user_token)
      } catch (error) {
        console.error('Failed to update user JWT', error)
      }
    }
  } catch (error) {
    set({ userSettings: { ...useApp.getState().userSettings, fetched: true } })
    toast.error(error instanceof Error ? error.message : 'error')
  }
}

/** After an address login/creation, bind it to the logged-in user account (if any). */
/** Bind the current mailbox to the logged-in user. Returns false when no user is logged in. */
export async function bindAddressToUser(): Promise<boolean> {
  if (!useAuth.getState().userJwt) return false
  await api.post('/user_api/bind_address')
  return true
}
