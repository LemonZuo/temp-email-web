import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfirmHost } from '@/components/common/confirm'
import { SiteAuthDialog } from '@/components/common/auth-dialogs'
import { AnnouncementToast } from '@/components/common/announcement'
import { FullScreenFallback } from '@/components/common/route-fallback'
import { loadOpenSettings, loadUserSettings } from '@/lib/api'
import { APP_CONFIG } from '@/lib/config'
import { queryClient } from '@/lib/query-client'
import { useApp } from '@/store/app'
import { useLocale } from '@/i18n'
import { router } from './router'

/** Telegram Mini App builds need `window.Telegram.WebApp` before any page renders. */
const loadTelegramScript = () =>
  APP_CONFIG.IS_TELEGRAM
    ? new Promise<void>((resolve) => {
        const script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-web-app.js'
        script.onload = () => resolve()
        script.onerror = () => resolve()
        document.head.appendChild(script)
      })
    : Promise.resolve()

function Bootstrap() {
  const fetched = useApp((s) => s.openSettings.fetched)
  const title = useApp((s) => s.openSettings.title)
  const locale = useLocale()

  useEffect(() => {
    loadTelegramScript()
      .then(() => loadOpenSettings())
      .then(() => loadUserSettings())
  }, [])

  useEffect(() => {
    if (title) document.title = title
  }, [title])

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  }, [locale])

  return fetched ? <RouterProvider router={router} /> : <FullScreenFallback />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Bootstrap />
        <SiteAuthDialog />
        <ConfirmHost />
        <AnnouncementToast />
        <Toaster position="top-center" richColors closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
