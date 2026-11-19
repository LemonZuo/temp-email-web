import { useMemo } from 'react'
import { BotIcon, KeyRoundIcon, ServerIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyButton } from './copy-button'
import { decodeAddressToken, isPasswordLoginToken } from '@/lib/address-token'
import { APP_CONFIG } from '@/lib/config'
import { useApp } from '@/store/app'
import { useAuth } from '@/store/auth'
import { defineMessages, useLocale, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '邮箱凭证',
    tip: '请妥善保存邮箱凭证，可用于在其它设备登录此邮箱。凭证一旦丢失将无法找回。',
    passwordOnlyTip: '请使用邮箱密码登录后查看当前会话 Token。',
    credential: '凭证',
    currentAddress: '邮箱地址',
    addressCredentialLabel: '邮箱访问凭证',
    sessionToken: '会话 Token',
    expiresAt: '到期时间',
    sessionTokenTip: '此 Token 在上述时间到期，过期后请重新登录。自动登录链接和二维码使用同一个 Token，并在同一时间失效。',
    addressPassword: '邮箱密码',
    autoLoginLink: '自动登录链接',
    autoLoginQrCode: '手机扫码打开',
    autoLoginQrCodeTip: '任何获取此二维码的人都可以访问该邮箱，请勿分享。',
    smtpImap: 'SMTP / IMAP',
    smtpHost: 'SMTP 主机',
    smtpPort: 'SMTP 端口',
    imapHost: 'IMAP 主机',
    imapPort: 'IMAP 端口',
    security: '加密方式',
    starttls: 'STARTTLS',
    plainOrProxyTls: '明文 / 由代理提供 TLS',
    username: '用户名',
    copyAll: '复制全部',
    docs: '文档',
    agent: 'AI Agent',
    agentAccessTip: 'AI Agent 可使用 Address JWT 和 parsed-mail API 读取这个邮箱。',
    apiBase: 'API 地址',
    agentSkill: 'Agent skill',
    agentConfig: 'Agent 配置',
  },
  en: {
    title: 'Mailbox Credential',
    tip: 'Keep this credential safe. It lets you sign in to this mailbox from other devices and cannot be recovered if lost.',
    passwordOnlyTip: 'Sign in with the mailbox password to view a session token.',
    credential: 'Credential',
    currentAddress: 'Email address',
    addressCredentialLabel: 'Mailbox access credential',
    sessionToken: 'Session Token',
    expiresAt: 'Expires at',
    sessionTokenTip:
      'This token expires at the time shown above. Sign in again after expiry. Auto-login links and QR codes use the same token and expire with it.',
    addressPassword: 'Mailbox Password',
    autoLoginLink: 'Auto-login link',
    autoLoginQrCode: 'Scan to open on mobile',
    autoLoginQrCodeTip: 'Anyone with this QR code can access this mailbox. Do not share it.',
    smtpImap: 'SMTP / IMAP',
    smtpHost: 'SMTP host',
    smtpPort: 'SMTP port',
    imapHost: 'IMAP host',
    imapPort: 'IMAP port',
    security: 'Security',
    starttls: 'STARTTLS',
    plainOrProxyTls: 'Plain / TLS via proxy',
    username: 'Username',
    copyAll: 'Copy all',
    docs: 'Docs',
    agent: 'AI Agent',
    agentAccessTip: 'Use this mailbox from an AI agent with the Address JWT and parsed-mail APIs.',
    apiBase: 'API Base',
    agentSkill: 'Agent skill',
    agentConfig: 'Agent config',
  },
})

const AGENT_SKILL_URL =
  'https://github.com/dreamhunter2333/cloudflare_temp_email/blob/main/skills/cf-temp-mail-agent-mail/SKILL.md'

function CodeField({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-2">
        <code className="min-w-0 flex-1 font-mono text-xs leading-relaxed break-all">{value}</code>
        <CopyButton value={value} className="-my-0.5" />
      </div>
      {children}
    </div>
  )
}

export function AddressCredentialContent({
  address,
  jwt,
  addressPassword,
}: {
  address: string
  jwt: string
  addressPassword?: string
}) {
  const t = useT(messages)
  const locale = useLocale()
  const openSettings = useApp((s) => s.openSettings)
  const siteAuth = useAuth((s) => s.siteAuth)
  const payload = useMemo(() => decodeAddressToken(jwt), [jwt])
  const showToken = !openSettings.addressPasswordLoginOnly || isPasswordLoginToken(payload)
  const expiresAt = typeof payload?.exp === 'number' ? new Date(payload.exp * 1000) : null
  const apiBase = (APP_CONFIG.API_BASE || window.location.origin).replace(/\/$/, '')
  const autoLoginUrl = `${window.location.origin}/?jwt=${encodeURIComponent(jwt)}`
  const docLocale = locale === 'zh' ? 'zh' : 'en'
  const { smtp, imap } = openSettings.smtpImapProxyConfig
  const showSmtpImap = !!smtp?.host || !!imap?.host
  const security = smtp?.starttls || imap?.starttls ? t('starttls') : t('plainOrProxyTls')
  const smtpImapText = [
    `${t('smtpHost')}: ${smtp?.host || '-'}`,
    `${t('smtpPort')}: ${smtp?.port || 8025}`,
    `${t('imapHost')}: ${imap?.host || '-'}`,
    `${t('imapPort')}: ${imap?.port || 11143}`,
    `${t('security')}: ${security}`,
    `${t('username')}: ${address || '-'}`,
    `${t('password')}: ${jwt}`,
  ].join('\n')
  const agentConfig = JSON.stringify({ base: apiBase, jwt, site_password: siteAuth || '' }, null, 2)
  const agentText = [
    `${t('currentAddress')}: ${address || '-'}`,
    `${t('apiBase')}: ${apiBase}`,
    `${t('agentSkill')}: ${AGENT_SKILL_URL}`,
    `${t('agentConfig')}:`,
    agentConfig,
  ].join('\n')

  const credentialTab = (
    <div className="grid gap-4">
      <Alert>
        <KeyRoundIcon />
        <AlertDescription>{showToken ? t('tip') : t('passwordOnlyTip')}</AlertDescription>
      </Alert>
      {address && <CodeField label={t('currentAddress')} value={address} />}
      {showToken && (
        <CodeField label={expiresAt ? t('sessionToken') : t('addressCredentialLabel')} value={jwt}>
          {expiresAt && (
            <p className="text-xs text-muted-foreground">
              {t('expiresAt')}: <time dateTime={expiresAt.toISOString()}>{expiresAt.toLocaleString()}</time> · {t('sessionTokenTip')}
            </p>
          )}
        </CodeField>
      )}
      {addressPassword && <CodeField label={t('addressPassword')} value={addressPassword} />}
      {showToken && (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <CodeField label={t('autoLoginLink')} value={autoLoginUrl} />
          <div className="flex flex-col items-center gap-1.5">
            <div className="rounded-lg border bg-white p-2">
              <QRCodeSVG value={autoLoginUrl} size={112} />
            </div>
            <span className="text-xs text-muted-foreground">{t('autoLoginQrCode')}</span>
          </div>
          <p className="text-xs text-destructive sm:col-span-2">{t('autoLoginQrCodeTip')}</p>
        </div>
      )}
    </div>
  )

  if (!showToken || (!showSmtpImap && !openSettings.enableAgentEmailInfo)) return credentialTab

  return (
    <Tabs defaultValue="credential">
      <TabsList>
        <TabsTrigger value="credential">
          <KeyRoundIcon />
          {t('credential')}
        </TabsTrigger>
        {showSmtpImap && (
          <TabsTrigger value="smtp">
            <ServerIcon />
            {t('smtpImap')}
          </TabsTrigger>
        )}
        {openSettings.enableAgentEmailInfo && (
          <TabsTrigger value="agent">
            <BotIcon />
            {t('agent')}
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="credential" className="pt-2">
        {credentialTab}
      </TabsContent>
      {showSmtpImap && (
        <TabsContent value="smtp" className="grid gap-3 pt-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border p-3 text-sm">
            <dt className="text-muted-foreground">{t('smtpHost')}</dt>
            <dd className="font-mono">{smtp?.host || '-'}:{smtp?.port || 8025}</dd>
            <dt className="text-muted-foreground">{t('imapHost')}</dt>
            <dd className="font-mono">{imap?.host || '-'}:{imap?.port || 11143}</dd>
            <dt className="text-muted-foreground">{t('security')}</dt>
            <dd>{security}</dd>
            <dt className="text-muted-foreground">{t('username')}</dt>
            <dd className="font-mono break-all">{address}</dd>
          </dl>
          <div className="flex items-center justify-between">
            <a
              className="text-sm text-primary underline-offset-4 hover:underline"
              href={`https://temp-mail-docs.awsl.uk/${docLocale}/guide/feature/config-smtp-proxy.html`}
              target="_blank"
              rel="noreferrer"
            >
              {t('docs')}
            </a>
            <CopyButton value={smtpImapText} label={t('copyAll')} variant="outline" />
          </div>
        </TabsContent>
      )}
      {openSettings.enableAgentEmailInfo && (
        <TabsContent value="agent" className="grid gap-3 pt-2">
          <p className="text-sm text-muted-foreground">{t('agentAccessTip')}</p>
          <CodeField label={t('agentConfig')} value={agentConfig} />
          <div className="flex items-center justify-between">
            <a
              className="text-sm text-primary underline-offset-4 hover:underline"
              href={`https://temp-mail-docs.awsl.uk/${docLocale}/guide/feature/agent-email.html`}
              target="_blank"
              rel="noreferrer"
            >
              {t('docs')}
            </a>
            <CopyButton value={agentText} label={t('copyAll')} variant="outline" />
          </div>
        </TabsContent>
      )}
    </Tabs>
  )
}

export function AddressCredentialDialog({
  open,
  onOpenChange,
  address,
  jwt,
  addressPassword,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  address: string
  jwt: string
  addressPassword?: string
}) {
  const t = useT(messages)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* no autofocus: it would pop the first copy button's tooltip and eat the first Esc */}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="font-mono">{address}</DialogDescription>
        </DialogHeader>
        <AddressCredentialContent address={address} jwt={jwt} addressPassword={addressPassword} />
      </DialogContent>
    </Dialog>
  )
}

/** Dialog bound to the global `showCredential` flag for the current address. */
export function CurrentAddressCredentialDialog() {
  const open = useApp((s) => s.showCredential)
  const address = useApp((s) => s.addressSettings.address)
  const jwt = useAuth((s) => s.jwt)
  const addressPassword = useAuth((s) => s.addressPassword)
  return (
    <AddressCredentialDialog
      open={open && !!address}
      onOpenChange={(o) => useApp.getState().set({ showCredential: o })}
      address={address}
      jwt={jwt}
      addressPassword={addressPassword}
    />
  )
}
