import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router'
import { FullScreenFallback } from '@/components/common/route-fallback'
import { isLocale, setLocale } from '@/i18n'
import MailboxLayout from '@/features/mailbox/layout'

const page = (loader: () => Promise<{ default: React.ComponentType }>) => {
  const Component = lazy(loader)
  return <Component />
}

const standalone = (loader: () => Promise<{ default: React.ComponentType }>) => {
  const Component = lazy(loader)
  return (
    <Suspense fallback={<FullScreenFallback />}>
      <Component />
    </Suspense>
  )
}

const LEGACY_LOCALES = ['zh', 'en', 'es', 'ja', 'de', 'pt-BR']

/** Old frontend used `/:lang/...` URLs; strip the prefix and remember the language. */
function LegacyLocaleRedirect() {
  const location = useLocation()
  const [, lang, ...rest] = location.pathname.split('/')
  if (isLocale(lang)) setLocale(lang)
  return <Navigate to={`/${rest.join('/')}${location.search}${location.hash}`} replace />
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <MailboxLayout />,
    children: [
      { index: true, element: page(() => import('@/features/mailbox/pages/inbox')) },
      { path: 'sent', element: page(() => import('@/features/mailbox/pages/sent')) },
      { path: 'compose', element: page(() => import('@/features/mailbox/pages/compose')) },
      { path: 'settings', element: page(() => import('@/features/mailbox/pages/settings')) },
      { path: 'auto-reply', element: page(() => import('@/features/mailbox/pages/auto-reply')) },
      { path: 'webhook', element: page(() => import('@/features/webhook/mailbox-webhook-page')) },
      { path: 'attachments', element: page(() => import('@/features/mailbox/pages/attachments')) },
      { path: 'preferences', element: page(() => import('@/features/mailbox/pages/preferences')) },
      { path: 'about', element: page(() => import('@/features/mailbox/pages/about')) },
    ],
  },
  {
    path: '/user/oauth2/callback',
    element: standalone(() => import('@/features/user/pages/oauth2-callback')),
  },
  {
    path: '/user',
    element: standalone(() => import('@/features/user/layout')),
    children: [
      { index: true, element: page(() => import('@/features/user/pages/addresses')) },
      { path: 'mails', element: page(() => import('@/features/user/pages/mails')) },
      { path: 'sent', element: page(() => import('@/features/user/pages/sent')) },
      { path: 'compose', element: page(() => import('@/features/user/pages/compose')) },
      { path: 'settings', element: page(() => import('@/features/user/pages/settings')) },
    ],
  },
  {
    path: '/admin',
    element: standalone(() => import('@/features/admin/layout')),
    children: [
      { index: true, element: page(() => import('@/features/admin/pages/statistics')) },
      { path: 'accounts', element: page(() => import('@/features/admin/pages/accounts')) },
      { path: 'accounts/new', element: page(() => import('@/features/admin/pages/create-account')) },
      { path: 'sender-access', element: page(() => import('@/features/admin/pages/sender-access')) },
      { path: 'mails', element: page(() => import('@/features/admin/pages/mails')) },
      { path: 'mails/unknown', element: page(() => import('@/features/admin/pages/unknown-mails')) },
      { path: 'sendbox', element: page(() => import('@/features/admin/pages/sendbox')) },
      { path: 'send', element: page(() => import('@/features/admin/pages/send-mail')) },
      { path: 'mail-webhook', element: page(() => import('@/features/admin/pages/mail-webhook')) },
      { path: 'users', element: page(() => import('@/features/admin/pages/users')) },
      { path: 'user-settings', element: page(() => import('@/features/admin/pages/user-settings')) },
      { path: 'oauth2', element: page(() => import('@/features/admin/pages/oauth2-settings')) },
      { path: 'roles', element: page(() => import('@/features/admin/pages/role-address-config')) },
      { path: 'account-settings', element: page(() => import('@/features/admin/pages/account-settings')) },
      { path: 'webhook', element: page(() => import('@/features/admin/pages/webhook')) },
      { path: 'telegram', element: page(() => import('@/features/admin/pages/telegram')) },
      { path: 'ai-extract', element: page(() => import('@/features/admin/pages/ai-extract')) },
      { path: 'ip-blacklist', element: page(() => import('@/features/admin/pages/ip-blacklist')) },
      { path: 'redeem-codes', element: page(() => import('@/features/admin/pages/redeem-codes')) },
      { path: 'database', element: page(() => import('@/features/admin/pages/database')) },
      { path: 'worker', element: page(() => import('@/features/admin/pages/worker-config')) },
      { path: 'maintenance', element: page(() => import('@/features/admin/pages/maintenance')) },
    ],
  },
  { path: '/redeem', element: standalone(() => import('@/features/redeem/redeem-page')) },
  { path: '/telegram_mail', element: standalone(() => import('@/features/telegram/telegram-mail-page')) },
  ...LEGACY_LOCALES.map((lang) => ({ path: `/${lang}/*`, element: <LegacyLocaleRedirect /> })),
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)
