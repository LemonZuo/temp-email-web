import { useNavigate } from 'react-router'
import { CheckIcon, ChevronsUpDownIcon, InboxIcon, ShieldIcon, UserRoundIcon, type LucideIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { useApp, useFlags } from '@/store/app'
import { defineMessages, useT } from '@/i18n'

export type ModuleKey = 'mailbox' | 'user' | 'admin' | 'other'

const messages = defineMessages({
  zh: { switchTo: '切换到', defaultTitle: '临时邮箱', other: '临时邮箱' },
  en: { switchTo: 'Switch to', defaultTitle: 'Temp Email', other: 'Temp Email' },
})

export function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <div className={`flex aspect-square items-center justify-center rounded-lg bg-primary text-primary-foreground ${className}`}>
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
  const { isMobile } = useSidebar()
  const title = useApp((s) => s.openSettings.title) || t('defaultTitle')
  const { showUserSystem, showAdminPage } = useFlags()
  const modules: { key: ModuleKey; label: string; icon: LucideIcon; url: string; show: boolean }[] = [
    { key: 'mailbox', label: t('mailbox'), icon: InboxIcon, url: '/', show: true },
    { key: 'user', label: t('userCenter'), icon: UserRoundIcon, url: '/user', show: showUserSystem },
    { key: 'admin', label: t('admin'), icon: ShieldIcon, url: '/admin', show: showAdminPage || current === 'admin' },
  ]
  const active = modules.find((m) => m.key === current)
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Logo />
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
