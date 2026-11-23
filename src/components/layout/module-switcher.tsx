import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { CheckIcon, ChevronsUpDownIcon, InboxIcon, ShieldIcon, UserRoundIcon, type LucideIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { adminPath } from '@/features/admin/paths'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { useApp, useFlags } from '@/store/app'
import { defineMessages, useT } from '@/i18n'

export type ModuleKey = 'mailbox' | 'user' | 'admin' | 'other'

const messages = defineMessages({
  zh: { switchTo: '切换到', defaultTitle: '临时邮箱', other: '临时邮箱', tapsLeft: '再点击 {n} 次或长按进入管理后台', toAdmin: '进入管理后台' },
  en: {
    switchTo: 'Switch to',
    defaultTitle: 'Temp Email',
    other: 'Temp Email',
    tapsLeft: '{n} more taps, or press and hold, to open the admin console',
    toAdmin: 'Opening the admin console',
  },
})

const ADMIN_TAPS = 5
/** Taps further apart than this start a new count */
const TAP_WINDOW_MS = 3000
/** Holding the logo this long opens the console right away */
const LONG_PRESS_MS = 700

/**
 * Hidden admin entry on wide screens: clicking the site logo 5 times (kept from the old frontend) or pressing and
 * holding it opens the admin console, which asks for the admin password when needed. Phones use the footer's
 * 管理员登录 link instead, so taps on the logo do nothing there. Returns the logo's event handlers.
 */
// At the bottom, clear of the logo: a toast over it would catch the next clicks.
const tapToast = { id: 'admin-logo-tap', duration: 1500, position: 'bottom-center' } as const

function useAdminLogoGesture(isolate: boolean) {
  const t = useT(messages)
  const navigate = useNavigate()
  const taps = useRef({ count: 0, last: 0 })
  const pressTimer = useRef<number | undefined>(undefined)
  /** The current press already opened the console; ignore the click that ends it */
  const pressFired = useRef(false)
  useEffect(() => () => window.clearTimeout(pressTimer.current), [])

  const openConsole = () => {
    taps.current.count = 0
    toast(t('toAdmin'), tapToast)
    navigate(adminPath())
  }
  const cancelPress = () => window.clearTimeout(pressTimer.current)

  return {
    onPointerDown: (e: React.PointerEvent) => {
      // the module switcher opens its menu on pointerdown
      if (isolate) e.stopPropagation()
      if (e.button !== 0) return
      pressFired.current = false
      cancelPress()
      pressTimer.current = window.setTimeout(() => {
        pressFired.current = true
        openConsole()
      }, LONG_PRESS_MS)
    },
    onPointerUp: cancelPress,
    onPointerLeave: cancelPress,
    onPointerCancel: cancelPress,
    // a long press would otherwise open the browser's context menu
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: (e: React.MouseEvent) => {
      if (isolate) e.stopPropagation()
      if (pressFired.current) {
        pressFired.current = false
        return
      }
      const now = Date.now()
      const state = taps.current
      state.count = now - state.last > TAP_WINDOW_MS ? 1 : state.count + 1
      state.last = now
      if (state.count >= ADMIN_TAPS) openConsole()
      else toast(t('tapsLeft', { n: ADMIN_TAPS - state.count }), tapToast)
    },
  }
}

export function Logo({
  className = 'size-8',
  adminTap = true,
  isolate = false,
}: {
  className?: string
  /** Count clicks towards the hidden admin entry (off inside the admin console; always off on phones) */
  adminTap?: boolean
  /** Keep clicks from reaching a parent control (e.g. the module switcher's dropdown trigger) */
  isolate?: boolean
}) {
  const gesture = useAdminLogoGesture(isolate)
  // phones get the footer link (sidebar / landing) instead of the hidden gesture; `undefined` until measured
  const isMobile = useIsMobile()
  adminTap = adminTap && isMobile === false
  return (
    <div
      className={cn(
        'relative flex aspect-square items-center justify-center rounded-lg bg-primary text-primary-foreground select-none',
        // touch-manipulation: quick taps on a touch screen (tablets) must not be taken as double-tap zoom;
        // the invisible ::after grows a small logo's click area (not inside the module switcher button)
        adminTap && 'touch-manipulation [-webkit-touch-callout:none]',
        adminTap && !isolate && "after:absolute after:-inset-2 after:content-['']",
        className,
      )}
      {...(adminTap ? gesture : {})}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-1/2" aria-hidden>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
        <path d="m4.5 7 7.5 6 7.5-6" />
        <path d="M15 17h3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

/** Sidebar header: site logo + title, dropdown to jump between Mailbox / User center / Admin. */
export function ModuleSwitcher({ current }: { current: ModuleKey }) {
  const t = useT(messages)
  const navigate = useNavigate()
  const { isMobile, state } = useSidebar()
  const title = useApp((s) => s.openSettings.title) || t('defaultTitle')
  // When the sidebar is collapsed to icons the logo is the whole button, so it must keep opening the menu.
  // (On phones the logo ignores clicks anyway: the footer link is the way in.)
  const logoTap = current !== 'admin' && (isMobile || state === 'expanded')
  const { showUserSystem, showAdminPage } = useFlags()
  const modules: { key: ModuleKey; label: string; icon: LucideIcon; url: string; show: boolean }[] = [
    { key: 'mailbox', label: t('mailbox'), icon: InboxIcon, url: '/', show: true },
    { key: 'user', label: t('userCenter'), icon: UserRoundIcon, url: '/user', show: showUserSystem },
    { key: 'admin', label: t('admin'), icon: ShieldIcon, url: adminPath(), show: showAdminPage || current === 'admin' },
  ]
  const active = modules.find((m) => m.key === current)
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="select-none data-[state=open]:bg-sidebar-accent">
              <Logo adminTap={logoTap} isolate />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{title}</span>
                <span className="truncate text-xs text-muted-foreground">{active?.label || t('other')}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t('switchTo')}</DropdownMenuLabel>
            {modules
              .filter((m) => m.show)
              .map((m) => (
                <DropdownMenuItem key={m.key} onClick={() => navigate(m.url)} className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <m.icon className="size-3.5" />
                  </div>
                  {m.label}
                  {m.key === current && <CheckIcon className="ml-auto" />}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
