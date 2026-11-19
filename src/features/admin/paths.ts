/**
 * Frontend base path of the admin console.
 *
 * Not `/admin/*`: the Pages middleware and the Worker (assets mode) forward every `/admin/...` request to the
 * backend API, so a deep link like `/admin/accounts` would hit the API on reload. `/admin` itself redirects here.
 */
export const ADMIN_BASE = '/console'

/** `adminPath()` → `/console`, `adminPath('accounts/new')` → `/console/accounts/new` */
export const adminPath = (sub = '') => (sub ? `${ADMIN_BASE}/${sub.replace(/^\//, '')}` : ADMIN_BASE)
