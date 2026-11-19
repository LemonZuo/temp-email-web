import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef } from 'react'
import { RotateCwIcon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { useApp } from '@/store/app'
import { useLocale, useT } from '@/i18n'

declare global {
  interface Window {
    turnstile?: {
      render: (el: string | HTMLElement, options: Record<string, unknown>) => string
      remove: (id: string) => void
      reset: (id: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null
const loadScript = () => {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SCRIPT_SRC
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        scriptPromise = null
        reject(new Error('Failed to load Turnstile'))
      }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

export type TurnstileHandle = { refresh: () => void }

/**
 * Cloudflare Turnstile widget. Renders nothing when the site has no `cfTurnstileSiteKey`.
 * `onToken('')` is called whenever the widget is reset.
 */
export const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string) => void; className?: string }>(
  function Turnstile({ onToken, className }, ref) {
    const siteKey = useApp((s) => s.openSettings.cfTurnstileSiteKey)
    const { resolvedTheme } = useTheme()
    const locale = useLocale()
    const t = useT()
    const id = `cf-turnstile-${useId().replace(/:/g, '')}`
    const widgetId = useRef<string | null>(null)
    const onTokenRef = useRef(onToken)
    onTokenRef.current = onToken

    const render = useCallback(async () => {
      if (!siteKey) return
      onTokenRef.current('')
      await loadScript()
      const ts = window.turnstile
      const el = document.getElementById(id)
      if (!ts || !el) return
      if (widgetId.current) {
        try {
          ts.remove(widgetId.current)
        } catch {
          // already removed
        }
      }
      widgetId.current = ts.render(el, {
        sitekey: siteKey,
        theme: resolvedTheme === 'dark' ? 'dark' : 'light',
        language: locale === 'zh' ? 'zh-cn' : 'en',
        callback: (token: string) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(''),
      })
    }, [siteKey, resolvedTheme, locale, id])

    useEffect(() => {
      render().catch(console.error)
      return () => {
        if (widgetId.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetId.current)
          } catch {
            // ignore
          }
          widgetId.current = null
        }
      }
    }, [render])

    useImperativeHandle(ref, () => ({ refresh: () => void render() }), [render])

    if (!siteKey) return null
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <div id={id} className="min-h-[65px]" />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => void render()} aria-label={t('refresh')}>
            <RotateCwIcon />
          </Button>
        </div>
      </div>
    )
  },
)
