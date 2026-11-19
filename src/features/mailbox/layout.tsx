import { Suspense, useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import {
  CloudIcon,
  InboxIcon,
  InfoIcon,
  MessageSquareReplyIcon,
  PenSquareIcon,
  SendIcon,
  SlidersHorizontalIcon,
  UserCogIcon,
  WebhookIcon,
} from 'lucide-react'
import { AppShell, type NavGroup } from '@/components/layout/app-shell'
import { CurrentAddressCredentialDialog } from '@/components/common/address-credential-dialog'
import { FullScreenFallback, RouteFallback } from '@/components/common/route-fallback'
import { Button } from '@/components/ui/button'
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { loadAddressSettings } from '@/lib/api'
import { useApp } from '@/store/app'
import { useAuth } from '@/store/auth'
import { AddressSwitcher } from './components/address-switcher'
import { MailboxLanding } from './landing'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    compose: '写邮件',
    inbox: '收件箱',
    sent: '已发送',
    mailboxSettings: '邮箱设置',
    addressSettings: '账户与安全',
    autoReply: '自动回复',
    webhook: 'Webhook',
    attachments: 'S3 附件',
    other: '其它',
    preferences: '偏好设置',
    about: '关于',
  },
  en: {
    compose: 'Compose',
    inbox: 'Inbox',
    sent: 'Sent',
    mailboxSettings: 'Mailbox',
    addressSettings: 'Account & security',
    autoReply: 'Auto reply',
    webhook: 'Webhook',
    attachments: 'S3 attachments',
    other: 'Other',
    preferences: 'Preferences',
    about: 'About',
  },
})

function ComposeButton() {
  const t = useT(messages)
  return (
    <SidebarGroup className="pb-0">
      <SidebarMenu>
        <SidebarMenuItem>
          <Button asChild className="w-full justify-start shadow-sm group-data-[collapsible=icon]:hidden">
            <Link to="/compose">
              <PenSquareIcon />
              {t('compose')}
            </Link>
          </Button>
          <SidebarMenuButton asChild tooltip={t('compose')} className="hidden group-data-[collapsible=icon]:flex">
            <Link to="/compose">
              <PenSquareIcon />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

export default function MailboxLayout() {
  const t = useT(messages)
  const jwt = useAuth((s) => s.jwt)
  const { fetched, address, jwt: settingsJwt } = useApp((s) => s.addressSettings)
  const openSettings = useApp((s) => s.openSettings)

  useEffect(() => {
    loadAddressSettings().catch(() => undefined)
    // reload whenever the address credential changes
  }, [jwt])

  if (!fetched) return <FullScreenFallback />
  if (!address) return <MailboxLanding />

  const nav: NavGroup[] = [
    {
      items: [
        { title: t('inbox'), url: '/', icon: InboxIcon },
        { title: t('sent'), url: '/sent', icon: SendIcon, hidden: !openSettings.enableSendMail },
        // Not shown in the menu (the compose button is above); only used for the header title.
        { title: t('compose'), url: '/compose', icon: PenSquareIcon, hidden: true },
      ],
    },
    {
      label: t('mailboxSettings'),
      items: [
        { title: t('addressSettings'), url: '/settings', icon: UserCogIcon },
        { title: t('autoReply'), url: '/auto-reply', icon: MessageSquareReplyIcon, hidden: !openSettings.enableAutoReply },
        { title: t('webhook'), url: '/webhook', icon: WebhookIcon, hidden: !openSettings.enableWebhook },
        { title: t('attachments'), url: '/attachments', icon: CloudIcon, hidden: !openSettings.isS3Enabled },
      ],
    },
    {
      label: t('other'),
      items: [
        { title: t('preferences'), url: '/preferences', icon: SlidersHorizontalIcon },
        { title: t('about'), url: '/about', icon: InfoIcon, hidden: !openSettings.enableIndexAbout },
      ],
    },
  ]

  return (
    <AppShell
      module="mailbox"
      nav={nav}
      sidebarTop={
        <>
          <AddressSwitcher />
          {openSettings.enableSendMail && <ComposeButton />}
        </>
      }
    >
      {/* While switching mailboxes, unmount the pages so the previous mailbox's mails are never shown */}
      {settingsJwt !== jwt ? (
        <RouteFallback />
      ) : (
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      )}
      <CurrentAddressCredentialDialog />
    </AppShell>
  )
}
