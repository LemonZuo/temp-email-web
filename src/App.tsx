import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfirmHost } from '@/components/common/confirm'
import { SiteAuthDialog } from '@/components/common/auth-dialogs'
import { AnnouncementToast } from '@/components/common/announcement'
import { FullScreenFallback } from '@/components/common/route-fallback'
import { loadOpenSettings, loadUserSettings } from '@/lib/api'
import { queryClient } from '@/lib/query-client'
import { useApp } from '@/store/app'
import { useLocale } from '@/i18n'
import { router } from './router'

function Bootstrap() {
  const fetched = useApp((s) => s.openSettings.fetched)
  const title = useApp((s) => s.openSettings.title)
  const locale = useLocale()

  useEffect(() => {
    loadOpenSettings().then(() => loadUserSettings())
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <Bootstrap />
          <SiteAuthDialog />
          <ConfirmHost />
          <AnnouncementToast />
          <Toaster position="top-center" richColors closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
