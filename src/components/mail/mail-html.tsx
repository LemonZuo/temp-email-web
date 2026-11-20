import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const BASE_STYLE = `
:host { all: initial; display: block; color-scheme: light; }
.mail-root {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px; line-height: 1.6; color: #1f2328; background: #fff;
  overflow-wrap: anywhere; word-break: break-word;
}
.mail-root img { max-width: 100%; height: auto; }
.mail-root table { max-width: 100%; }
.mail-root pre { white-space: pre-wrap; }
.mail-root a { color: #1a73e8; }
.mail-root blockquote { margin: 0 0 0 .8ex; border-left: 2px solid #d0d7de; padding-left: 1ex; color: #57606a; }
`

/**
 * Renders already-sanitized mail HTML inside a Shadow DOM so mail CSS cannot leak into the app
 * (and app CSS does not restyle the mail). Always light: most mail HTML assumes white paper.
 * Links open in a new tab.
 */
export function MailHtml({ html, className }: { html: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<ShadowRoot | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (!rootRef.current) {
      try {
        rootRef.current = host.attachShadow({ mode: 'open' })
      } catch {
        rootRef.current = null
      }
    }
    const root = rootRef.current
    const content = `<style>${BASE_STYLE}</style><div class="mail-root">${html}</div>`
    if (root) root.innerHTML = content
    else host.innerHTML = content
  }, [html])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const onClick = (event: Event) => {
      const path = event.composedPath() as HTMLElement[]
      const anchor = path.find((el) => el instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined
      if (!anchor) return
      const href = anchor.getAttribute('href') || ''
      if (!href || href.startsWith('#')) return
      event.preventDefault()
      window.open(anchor.href, '_blank', 'noopener,noreferrer')
    }
    host.addEventListener('click', onClick)
    return () => host.removeEventListener('click', onClick)
  }, [])

  // overflow-x: content that cannot shrink (fixed min-width layouts) scrolls inside the card instead of being clipped
  return <div ref={hostRef} className={cn('overflow-x-auto rounded-lg bg-white p-4 text-left', className)} />
}

/**
 * Frame for a mail body in a reader pane: a bordered card, except on phones where it runs to the screen edges
 * (cancelling the reader's `p-4`) so the mail gets the full width.
 */
export const READER_MAIL_FRAME = 'border max-md:-mx-4 max-md:rounded-none max-md:border-0'
