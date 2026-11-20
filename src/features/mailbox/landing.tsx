import { Link, useNavigate } from 'react-router'
import { GiftIcon, InboxIcon, LockKeyholeIcon, ShieldCheckIcon, ShieldIcon, SparklesIcon, TriangleAlertIcon, UserRoundIcon, ZapIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Logo } from '@/components/layout/module-switcher'
import { LanguageToggle, ThemeToggle } from '@/components/layout/header-controls'
import { sanitizeHtml } from '@/lib/sanitize'
import { useApp, useFlags } from '@/store/app'
import { useAuth } from '@/store/auth'
import { adminPath } from '@/features/admin/paths'
import { TelegramAddressPanel } from '@/features/telegram/telegram-address-panel'
import { isTelegramWebApp } from '@/features/telegram/telegram-web-app'
import { AddressLoginForm, CreateAddressForm } from './components/address-forms'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    defaultTitle: '临时邮箱',
    tagline: '即开即用的临时邮箱，保护你的真实邮箱地址。',
    feature1: '秒级创建，无需注册',
    feature2: '远程图片默认拦截，保护隐私',
    feature3: '验证码与链接 AI 自动提取',
    create: '创建邮箱',
    login: '登录邮箱',
    help: '帮助',
    fetchAddressError: '邮箱地址凭证无效或邮箱不存在，也可能是网络异常，请稍后再试。',
    bindUserInfo: '你已登录用户账户，登录或创建的邮箱将自动绑定到当前用户。',
    pickFromUser: '从我的邮箱中选择',
    userCenter: '用户中心',
    redeemTip: '使用兑换码可解锁高级权限',
    useRedeemCode: '使用兑换码',
    pleaseGetNewEmail: '请登录已有邮箱，或创建一个新的邮箱地址。',
    adminContact: '如需帮助请联系管理员：',
    createDisabled: '当前站点未开放创建邮箱，请登录已有邮箱。',
  },
  en: {
    defaultTitle: 'Temp Email',
    tagline: 'Disposable mailboxes in one click — keep your real address private.',
    feature1: 'Create instantly, no sign-up',
    feature2: 'Remote images blocked by default',
    feature3: 'AI extracts codes and links',
    create: 'Create',
    login: 'Log in',
    help: 'Help',
    fetchAddressError: 'The address credential is invalid or the mailbox no longer exists (or the network failed). Please try again later.',
    bindUserInfo: 'You are signed in; mailboxes you log in to or create will be bound to your account.',
    pickFromUser: 'Pick from my mailboxes',
    userCenter: 'User center',
    redeemTip: 'Use a redemption code to unlock advanced access.',
    useRedeemCode: 'Use redemption code',
    pleaseGetNewEmail: 'Log in to an existing mailbox or create a new address.',
    adminContact: 'Need help? Contact the admin: ',
    createDisabled: 'Creating mailboxes is disabled on this site. Please log in instead.',
  },
})

/** Shown at `/` when there is no current mailbox. */
export function MailboxLanding() {
  const t = useT(messages)
  const navigate = useNavigate()
  const openSettings = useApp((s) => s.openSettings)
  const userEmail = useApp((s) => s.userSettings.user_email)
  const jwt = useAuth((s) => s.jwt)
  const { showUserSystem, showUserMailboxes, showAdminPage } = useFlags()
  const title = openSettings.title || t('defaultTitle')
  const canCreate = openSettings.enableUserCreateEmail && !(openSettings.disableAnonymousUserCreateEmail && !userEmail)
  const telegram = isTelegramWebApp()

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      {/* hero */}
      <div className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -top-32 -right-32 size-[520px] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-[460px] rounded-full bg-black/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Logo className="size-10 bg-white/15 text-primary-foreground" />
          <span className="text-lg font-semibold">{title}</span>
        </div>
        <div className="relative max-w-md space-y-6">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight">{t('tagline')}</h1>
          <ul className="space-y-3 text-primary-foreground/85">
            {[
              [ZapIcon, t('feature1')],
              [ShieldCheckIcon, t('feature2')],
              [SparklesIcon, t('feature3')],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof ZapIcon
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-white/15">
                    <I className="size-4" />
                  </span>
                  {text as string}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="relative text-sm text-primary-foreground/70">© {new Date().getFullYear()} {openSettings.copyright}</div>
      </div>

      {/* form */}
      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between px-4 lg:justify-end">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo className="size-7" />
            <span className="font-semibold">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            {showUserSystem && !telegram && (
              <Button variant="ghost" size="sm" className="max-sm:size-9" asChild>
                <Link to="/user" aria-label={t('userCenter')}>
                  <UserRoundIcon />
                  <span className="hidden sm:inline">{t('userCenter')}</span>
                </Link>
              </Button>
            )}
            {showAdminPage && !telegram && (
              <Button variant="ghost" size="sm" className="max-sm:size-9" asChild>
                <Link to={adminPath()} aria-label={t('admin')}>
                  <ShieldIcon />
                  <span className="hidden sm:inline">{t('admin')}</span>
                </Link>
              </Button>
            )}
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 items-start justify-center px-4 pt-4 pb-12 sm:items-center">
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-1 text-center lg:text-left">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary lg:mx-0">
                <InboxIcon className="size-6" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground">{t('pleaseGetNewEmail')}</p>
            </div>

            {jwt && (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertDescription>{t('fetchAddressError')}</AlertDescription>
              </Alert>
            )}
            {userEmail && (
              <Alert>
                <LockKeyholeIcon />
                <AlertDescription>{t('bindUserInfo')}</AlertDescription>
              </Alert>
            )}

            {telegram ? (
              <Card>
                <CardContent>
                  <TelegramAddressPanel />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <Tabs defaultValue={canCreate ? 'create' : 'login'}>
                    <TabsList className="mb-4 w-full">
                      {canCreate && <TabsTrigger value="create">{t('create')}</TabsTrigger>}
                      <TabsTrigger value="login">{t('login')}</TabsTrigger>
                      <TabsTrigger value="help">{t('help')}</TabsTrigger>
                    </TabsList>
                    {canCreate && (
                      <TabsContent value="create">
                        <CreateAddressForm />
                      </TabsContent>
                    )}
                    <TabsContent value="login">
                      <AddressLoginForm />
                    </TabsContent>
                    <TabsContent value="help" className="space-y-3 text-sm text-muted-foreground">
                      <p>{t('pleaseGetNewEmail')}</p>
                      {!canCreate && <p>{t('createDisabled')}</p>}
                      {openSettings.adminContact && (
                        <p>
                          {t('adminContact')}
                          <span
                            className="font-medium text-foreground [&_a]:underline"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(openSettings.adminContact) }}
                          />
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {showUserMailboxes && !telegram && (
              <Button variant="outline" className="w-full" onClick={() => navigate('/user')}>
                <UserRoundIcon />
                {t('pickFromUser')}
              </Button>
            )}
            {openSettings.enableRedeemCode && (
              <>
                <Separator />
                <div className="space-y-2 text-center">
                  <p className="text-xs text-muted-foreground">{t('redeemTip')}</p>
                  <Button variant="secondary" className="w-full" onClick={() => navigate('/redeem')}>
                    <GiftIcon />
                    {t('useRedeemCode')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
