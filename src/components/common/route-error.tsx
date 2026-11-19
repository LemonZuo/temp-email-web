import { isRouteErrorResponse, useRouteError } from 'react-router'
import { HouseIcon, RotateCwIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '页面出错了',
    description: '页面渲染时发生错误。可能是站点刚刚更新，刷新页面通常可以解决。',
    reload: '刷新页面',
    home: '返回首页',
  },
  en: {
    title: 'Something went wrong',
    description: 'An error occurred while rendering this page. The site may have just been updated — reloading usually helps.',
    reload: 'Reload',
    home: 'Go home',
  },
})

/** Router `errorElement`: friendly fallback instead of react-router's developer screen. */
export function RouteError() {
  const t = useT(messages)
  const error = useRouteError()
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error)
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlertIcon className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        {detail && <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-left font-mono text-xs text-muted-foreground">{detail}</pre>}
        <div className="flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RotateCwIcon />
            {t('reload')}
          </Button>
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            <HouseIcon />
            {t('home')}
          </Button>
        </div>
      </div>
    </div>
  )
}
