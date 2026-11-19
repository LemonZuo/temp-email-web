import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import {
  BarChart3Icon,
  BotIcon,
  DatabaseIcon,
  FileCogIcon,
  GiftIcon,
  InboxIcon,
  KeyRoundIcon,
  LogOutIcon,
  MailPlusIcon,
  MailQuestionIcon,
  MailsIcon,
  SendIcon,
  SendHorizontalIcon,
  SettingsIcon,
  ShieldBanIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UsersIcon,
  WebhookIcon,
  WrenchIcon,
  SquareUserRoundIcon,
  MessageCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminPath } from './paths'
import { AppShell, type NavGroup } from '@/components/layout/app-shell'
import { AdminAuthDialog } from '@/components/common/auth-dialogs'
import { RouteFallback } from '@/components/common/route-fallback'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useApp, useFlags } from '@/store/app'
import { useAuth } from '@/store/auth'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    overview: '概览',
    statistics: '统计',
    addresses: '邮箱地址',
    accounts: '地址列表',
    createAccount: '创建地址',
    senderAccess: '发信权限',
    mails: '邮件',
    allMails: '所有邮件',
    unknownMails: '无收件人邮件',
    sendbox: '发件箱',
    sendMail: '发送邮件',
    mailWebhook: '邮件 Webhook',
    users: '用户',
    userManagement: '用户管理',
    userSettings: '用户设置',
    oauth2: 'OAuth2 登录',
    roles: '角色地址配置',
    settings: '设置',
    accountSettings: '邮箱设置',
    webhook: 'Webhook',
    telegram: 'Telegram',
    aiExtract: 'AI 提取',
    ipBlacklist: 'IP 黑名单',
    redeemCodes: '兑换码',
    system: '系统',
    database: '数据库',
    workerConfig: 'Worker 配置',
    maintenance: '维护',
    logoutAdmin: '退出管理员',
    loggedOut: '已退出管理员登录',
  },
  en: {
    overview: 'Overview',
    statistics: 'Statistics',
    addresses: 'Addresses',
    accounts: 'Address list',
    createAccount: 'Create address',
    senderAccess: 'Sender access',
    mails: 'Mails',
    allMails: 'All mails',
    unknownMails: 'Unknown recipients',
    sendbox: 'Sent',
    sendMail: 'Send mail',
    mailWebhook: 'Mail webhook',
    users: 'Users',
    userManagement: 'User management',
    userSettings: 'User settings',
    oauth2: 'OAuth2 login',
    roles: 'Role addresses',
    settings: 'Settings',
    accountSettings: 'Mailbox settings',
    webhook: 'Webhook',
    telegram: 'Telegram',
    aiExtract: 'AI extract',
    ipBlacklist: 'IP blacklist',
    redeemCodes: 'Redeem codes',
    system: 'System',
    database: 'Database',
    workerConfig: 'Worker config',
    maintenance: 'Maintenance',
    logoutAdmin: 'Log out admin',
    loggedOut: 'Logged out of admin',
  },
})

export default function AdminLayout() {
  const t = useT(messages)
  const navigate = useNavigate()
  const openSettings = useApp((s) => s.openSettings)
  const userSettingsFetched = useApp((s) => s.userSettings.fetched)
  const adminAuth = useAuth((s) => s.adminAuth)
  const { showAdminPage, showUserSystem } = useFlags()

  // Ask for the admin password when there is no other way in
  useEffect(() => {
    if (openSettings.fetched && userSettingsFetched && !showAdminPage) useApp.getState().set({ showAdminAuth: true })
  }, [openSettings.fetched, userSettingsFetched, showAdminPage])

  const nav: NavGroup[] = [
    {
      label: t('overview'),
      items: [{ title: t('statistics'), url: adminPath(), icon: BarChart3Icon }],
    },
    {
      label: t('addresses'),
      items: [
        { title: t('accounts'), url: adminPath('accounts'), icon: SquareUserRoundIcon },
        { title: t('createAccount'), url: adminPath('accounts/new'), icon: MailPlusIcon },
        { title: t('senderAccess'), url: adminPath('sender-access'), icon: SendHorizontalIcon },
      ],
    },
    {
      label: t('mails'),
      items: [
        { title: t('allMails'), url: adminPath('mails'), icon: InboxIcon },
        { title: t('unknownMails'), url: adminPath('mails/unknown'), icon: MailQuestionIcon },
        { title: t('sendbox'), url: adminPath('sendbox'), icon: MailsIcon },
        { title: t('sendMail'), url: adminPath('send'), icon: SendIcon },
        { title: t('mailWebhook'), url: adminPath('mail-webhook'), icon: WebhookIcon },
      ],
    },
    {
      label: t('users'),
      hidden: !showUserSystem,
      items: [
        { title: t('userManagement'), url: adminPath('users'), icon: UsersIcon },
        { title: t('userSettings'), url: adminPath('user-settings'), icon: UserCogIcon },
        { title: t('oauth2'), url: adminPath('oauth2'), icon: KeyRoundIcon },
        { title: t('roles'), url: adminPath('roles'), icon: ShieldCheckIcon },
      ],
    },
    {
      label: t('settings'),
      items: [
        { title: t('accountSettings'), url: adminPath('account-settings'), icon: SettingsIcon },
        { title: t('webhook'), url: adminPath('webhook'), icon: WebhookIcon },
        { title: t('telegram'), url: adminPath('telegram'), icon: MessageCircleIcon },
        { title: t('aiExtract'), url: adminPath('ai-extract'), icon: BotIcon },
        { title: t('ipBlacklist'), url: adminPath('ip-blacklist'), icon: ShieldBanIcon },
        { title: t('redeemCodes'), url: adminPath('redeem-codes'), icon: GiftIcon, hidden: !openSettings.enableRedeemCode },
      ],
    },
    {
      label: t('system'),
      items: [
        { title: t('database'), url: adminPath('database'), icon: DatabaseIcon },
        { title: t('workerConfig'), url: adminPath('worker'), icon: FileCogIcon },
        { title: t('maintenance'), url: adminPath('maintenance'), icon: WrenchIcon },
      ],
    },
  ]

  // Log out only once we have actually left the console: a settings page with unsaved changes may block the
  // navigation (and clearing the password first would unmount it before its confirm dialog could show).
  const { pathname } = useLocation()
  const logoutOnLeave = useRef(false)
  const loggedOutText = useRef(t('loggedOut'))
  loggedOutText.current = t('loggedOut')
  useEffect(() => {
    logoutOnLeave.current = false
  }, [pathname])
  useEffect(
    () => () => {
      if (!logoutOnLeave.current) return
      useAuth.getState().setAdminAuth('')
      toast.success(loggedOutText.current)
    },
    [],
  )
  const logout = adminAuth
    ? () => {
        logoutOnLeave.current = true
        navigate('/')
      }
    : undefined

  return (
    <AppShell
      module="admin"
      nav={nav}
      sidebarBottom={
        logout && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} tooltip={t('logoutAdmin')}>
                <LogOutIcon />
                <span>{t('logoutAdmin')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )
      }
    >
      <Suspense fallback={<RouteFallback />}>{showAdminPage ? <Outlet /> : null}</Suspense>
      <AdminAuthDialog />
    </AppShell>
  )
}

