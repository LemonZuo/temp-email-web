import { lazy, Suspense } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router'
import { ChevronsUpDownIcon, InboxIcon, LogOutIcon, MailsIcon, PenSquareIcon, SendIcon, SettingsIcon } from 'lucide-react'
import { AppShell, type NavGroup } from '@/components/layout/app-shell'
import { FullScreenFallback, RouteFallback } from '@/components/common/route-fallback'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { SenderAvatar } from '@/components/mail/mail-list'
import { useApp, useFlags } from '@/store/app'
import { useAuth } from '@/store/auth'
import { defineMessages, useT } from '@/i18n'
import { logoutUser } from './session'


const UserLoginPage = lazy(() => import('./pages/login'))

const messages = defineMessages({
  zh: {
    addresses: '我的邮箱',
    inbox: '收件箱',
    sent: '已发送',
    compose: '写邮件',
    account: '账户',
    settings: '账户设置',
    admin: '管理员',
  },
  en: {
    addresses: 'My addresses',
    inbox: 'Inbox',
    sent: 'Sent',
    compose: 'Compose',
    account: 'Account',
    settings: 'Account settings',
    admin: 'Admin',
  },
})

function NavUser() {
  const t = useT(messages)
  const navigate = useNavigate()
  const { isMobile } = useSidebar()
  const { user_email, is_admin, user_role } = useApp((s) => s.userSettings)
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <SenderAvatar name={user_email} className="size-8 rounded-lg" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user_email}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {is_admin ? t('admin') : user_role?.role || t('account')}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={4}>
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user_email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/user/settings')}>
              <SettingsIcon />
              {t('settings')}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                logoutUser()
                navigate('/user')
              }}
            >
              <LogOutIcon />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export default function UserLayout() {
  const t = useT(messages)
  const userJwt = useAuth((s) => s.userJwt)
  const openSettings = useApp((s) => s.openSettings)
  const { fetched: userFetched, user_email } = useApp((s) => s.userSettings)
  const { showUserSystem } = useFlags()

  if (openSettings.fetched && !showUserSystem) return <Navigate to="/" replace />
  if (userJwt && !userFetched) return <FullScreenFallback />
  // No session, or the stored JWT could not be verified (expired / deleted account / network error).
  if (!userJwt || !user_email) {
    return (
      <Suspense fallback={<FullScreenFallback />}>
        <UserLoginPage sessionExpired={!!userJwt} />
      </Suspense>
    )
  }

  const nav: NavGroup[] = [
    {
      items: [
        { title: t('addresses'), url: '/user', icon: MailsIcon },
        { title: t('inbox'), url: '/user/mails', icon: InboxIcon },
        { title: t('sent'), url: '/user/sent', icon: SendIcon, hidden: !openSettings.enableSendMail },
        { title: t('compose'), url: '/user/compose', icon: PenSquareIcon, hidden: !openSettings.enableSendMail },
      ],
    },
    {
      label: t('account'),
      items: [{ title: t('settings'), url: '/user/settings', icon: SettingsIcon }],
    },
  ]
  return (
    <AppShell module="user" nav={nav} sidebarBottom={<NavUser />}>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}
