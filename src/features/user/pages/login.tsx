import { useEffect, useRef, useState } from 'react'
import { startAuthentication, type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'
import { FingerprintIcon, LogInIcon, MailCheckIcon, TriangleAlertIcon, UserPlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PasswordInput } from '@/components/common/password-input'
import { Turnstile, type TurnstileHandle } from '@/components/common/turnstile'
import { api, loadUserOpenSettings } from '@/lib/api'
import { hashPassword } from '@/lib/crypto'
import { errorMessage } from '@/lib/format'
import { sanitizeHtml } from '@/lib/sanitize'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'
import { AuthShell } from '../components/auth-shell'
import { completeUserLogin, oauth2Session, randomState } from '../session'

const messages = defineMessages({
  zh: {
    signinTitle: '登录用户中心',
    signinDesc: '集中管理你绑定的邮箱地址与邮件',
    signupTitle: '创建账户',
    signupDesc: '注册后可将多个邮箱地址绑定到同一账户',
    login: '登录',
    register: '注册',
    email: '用户邮箱',
    password: '密码',
    newPassword: '新密码',
    forgotPassword: '忘记密码',
    resetPassword: '重置密码',
    resetPasswordDesc: '通过邮箱验证码设置新的密码',
    cannotForgotPassword: '未开启邮箱验证或未开启注册功能，无法重置密码，请联系管理员',
    or: '或',
    loginWith: '使用 {provider} 登录',
    loginWithPasskey: '使用 Passkey 登录',
    pleaseInput: '请输入用户邮箱和密码',
    pleaseInputEmail: '请输入用户邮箱',
    pleaseInputCode: '请输入验证码',
    pleaseCompleteTurnstile: '请完成人机验证',
    pleaseLogin: '注册成功，请登录',
    resetSuccess: '密码已重置，请使用新密码登录',
    verifyCode: '验证码',
    sendVerificationCode: '发送验证码',
    verifyCodeSent: '验证码已发送, {timeout} 秒后失效',
    waitforVerifyCode: '等待{timeout}秒',
    fetchUserSettingsError: '登录信息已过期或账号不存在，也可能是网络连接异常，请稍后再尝试。',
  },
  en: {
    signinTitle: 'Sign in to User Center',
    signinDesc: 'Manage all your bound addresses and mails in one place',
    signupTitle: 'Create an account',
    signupDesc: 'Bind multiple addresses to a single account',
    login: 'Login',
    register: 'Register',
    email: 'Account Email',
    password: 'Password',
    newPassword: 'New password',
    forgotPassword: 'Forgot Password',
    resetPassword: 'Reset Password',
    resetPasswordDesc: 'Set a new password with an email verification code',
    cannotForgotPassword:
      'Mail verification is disabled or register is disabled, cannot reset password, please contact administrator',
    or: 'or',
    loginWith: 'Login with {provider}',
    loginWithPasskey: 'Login with Passkey',
    pleaseInput: 'Please enter the account email and password',
    pleaseInputEmail: 'Please enter the account email',
    pleaseInputCode: 'Please input code',
    pleaseCompleteTurnstile: 'Please complete turnstile',
    pleaseLogin: 'Registered, please login',
    resetSuccess: 'Password reset, please login with the new password',
    verifyCode: 'Verification Code',
    sendVerificationCode: 'Send Verification Code',
    verifyCodeSent: 'Verification Code Sent, expires in {timeout} seconds',
    waitforVerifyCode: 'Wait for {timeout} seconds',
    fetchUserSettingsError:
      'Login password is invalid or account not exist, it may be network connection issue, please try again later.',
  },
})

/** Countdown shared by the register and reset forms (the worker keeps one code per email). */
function useCountdown() {
  const [expireAt, setExpireAt] = useState(0)
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (!expireAt) return
    const id = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= expireAt) window.clearInterval(id)
    }, 1000)
    return () => window.clearInterval(id)
  }, [expireAt])
  return {
    remaining: Math.max(0, Math.ceil((expireAt - now) / 1000)),
    start: (seconds: number) => {
      const current = Date.now()
      setNow(current)
      setExpireAt(current + seconds * 1000)
    },
  }
}
type Countdown = ReturnType<typeof useCountdown>

function SignInForm({
  email,
  setEmail,
  password,
  setPassword,
  onForgot,
}: {
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  onForgot: () => void
}) {
  const t = useT(messages)
  const enableGlobalTurnstileCheck = useApp((s) => s.openSettings.enableGlobalTurnstileCheck)
  const oauth2Clients = useApp((s) => s.userOpenSettings.oauth2ClientIDs) || []
  const [cfToken, setCfToken] = useState('')
  /** 'password' | 'passkey' | `oauth2:<clientID>` */
  const [busy, setBusy] = useState<string | null>(null)
  const turnstile = useRef<TurnstileHandle>(null)

  const emailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return toast.error(t('pleaseInput'))
    setBusy('password')
    try {
      const res = await api.post<{ jwt: string }>('/user_api/login', {
        email: email.trim(),
        password: await hashPassword(password),
        cf_token: cfToken,
      })
      await completeUserLogin(res.jwt)
    } catch (error) {
      toast.error(errorMessage(error))
      turnstile.current?.refresh()
    } finally {
      setBusy(null)
    }
  }

  const passkeyLogin = async () => {
    setBusy('passkey')
    try {
      const options = await api.post<PublicKeyCredentialRequestOptionsJSON>('/user_api/passkey/authenticate_request', {
        domain: window.location.hostname,
      })
      const credential = await startAuthentication({ optionsJSON: options })
      const res = await api.post<{ jwt: string }>('/user_api/passkey/authenticate_response', {
        origin: window.location.origin,
        domain: window.location.hostname,
        credential,
      })
      await completeUserLogin(res.jwt)
    } catch (error) {
      console.error(error)
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  const oauth2Login = async (clientID: string) => {
    setBusy(`oauth2:${clientID}`)
    try {
      const state = randomState()
      oauth2Session.set(state, clientID)
      const res = await api.get<{ url: string }>(
        `/user_api/oauth2/login_url?clientID=${encodeURIComponent(clientID)}&state=${encodeURIComponent(state)}`,
      )
      window.location.href = res.url
    } catch (error) {
      toast.error(errorMessage(error))
      setBusy(null)
    }
  }

  return (
    <form onSubmit={emailLogin}>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="user-login-email">{t('email')}</FieldLabel>
          <Input
            id="user-login-email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="user-login-password">{t('password')}</FieldLabel>
            <Button type="button" variant="link" size="xs" className="h-auto px-0" onClick={onForgot}>
              {t('forgotPassword')}
            </Button>
          </div>
          <PasswordInput
            id="user-login-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {enableGlobalTurnstileCheck && <Turnstile ref={turnstile} onToken={setCfToken} />}
        <Button type="submit" size="lg" className="w-full" disabled={!!busy}>
          {busy === 'password' ? <Spinner /> : <LogInIcon />}
          {t('login')}
        </Button>
        <FieldSeparator>{t('or')}</FieldSeparator>
        <div className="grid gap-2">
          <Button type="button" variant="outline" size="lg" className="w-full" disabled={!!busy} onClick={passkeyLogin}>
            {busy === 'passkey' ? <Spinner /> : <FingerprintIcon />}
            {t('loginWithPasskey')}
          </Button>
          {oauth2Clients.map((client) => (
            <Button
              key={client.clientID}
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={!!busy}
              onClick={() => oauth2Login(client.clientID)}
            >
              {busy === `oauth2:${client.clientID}` ? (
                <Spinner />
              ) : client.icon ? (
                <span
                  aria-hidden
                  className="inline-flex size-4 items-center justify-center [&_svg]:size-full"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(client.icon) }}
                />
              ) : null}
              {t('loginWith', { provider: client.name })}
            </Button>
          ))}
        </div>
      </FieldGroup>
    </form>
  )
}

/** Register a new account, or reset the password (same endpoint, upserts when mail verify is on). */
function RegisterForm({
  mode,
  email,
  setEmail,
  password,
  setPassword,
  countdown,
  onDone,
}: {
  mode: 'register' | 'reset'
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  countdown: Countdown
  onDone: () => void
}) {
  const t = useT(messages)
  const siteKey = useApp((s) => s.openSettings.cfTurnstileSiteKey)
  const enableMailVerify = useApp((s) => s.userOpenSettings.enableMailVerify)
  const [code, setCode] = useState('')
  const [cfToken, setCfToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const turnstile = useRef<TurnstileHandle>(null)
  const idPrefix = `user-${mode}`

  const sendCode = async () => {
    if (!email.trim()) return toast.error(t('pleaseInputEmail'))
    if (siteKey && !cfToken && enableMailVerify) return toast.error(t('pleaseCompleteTurnstile'))
    setSending(true)
    try {
      const res = await api.post<{ success?: boolean; expirationTtl?: number }>('/user_api/verify_code', {
        email: email.trim(),
        cf_token: cfToken,
      })
      if (res?.expirationTtl) {
        toast.success(t('verifyCodeSent', { timeout: res.expirationTtl }))
        countdown.start(res.expirationTtl)
      }
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSending(false)
      turnstile.current?.refresh()
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return toast.error(t('pleaseInput'))
    if (enableMailVerify && !code.trim()) return toast.error(t('pleaseInputCode'))
    setLoading(true)
    try {
      await api.post('/user_api/register', {
        email: email.trim(),
        password: await hashPassword(password),
        code: code.trim(),
        cf_token: cfToken,
      })
      toast.success(mode === 'reset' ? t('resetSuccess') : t('pleaseLogin'))
      setCode('')
      onDone()
    } catch (error) {
      toast.error(errorMessage(error))
      if (!enableMailVerify) turnstile.current?.refresh()
    } finally {
      setLoading(false)
    }
  }

  const turnstileWidget = <Turnstile ref={turnstile} onToken={setCfToken} />
  return (
    <form onSubmit={submit}>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-email`}>{t('email')}</FieldLabel>
          <Input
            id={`${idPrefix}-email`}
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-password`}>{mode === 'reset' ? t('newPassword') : t('password')}</FieldLabel>
          <PasswordInput
            id={`${idPrefix}-password`}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {/* With mail verify the Turnstile token is consumed by /verify_code, so it sits above the code field. */}
        {enableMailVerify && turnstileWidget}
        {enableMailVerify && (
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-code`}>{t('verifyCode')}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={`${idPrefix}-code`}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  variant="secondary"
                  disabled={sending || countdown.remaining > 0}
                  onClick={sendCode}
                >
                  {sending ? <Spinner /> : <MailCheckIcon />}
                  {countdown.remaining > 0
                    ? t('waitforVerifyCode', { timeout: countdown.remaining })
                    : t('sendVerificationCode')}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        )}
        {!enableMailVerify && turnstileWidget}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Spinner /> : <UserPlusIcon />}
          {mode === 'reset' ? t('resetPassword') : t('register')}
        </Button>
      </FieldGroup>
    </form>
  )
}

/** Shown by the user layout when there is no (valid) user session. */
export default function LoginPage({ sessionExpired }: { sessionExpired?: boolean }) {
  const t = useT(messages)
  const userOpenSettings = useApp((s) => s.userOpenSettings)
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const countdown = useCountdown()

  useEffect(() => {
    if (!useApp.getState().userOpenSettings.fetched) void loadUserOpenSettings()
  }, [])

  const canRegister = userOpenSettings.enable
  const canReset = userOpenSettings.enable && userOpenSettings.enableMailVerify
  const activeTab = canRegister ? tab : 'signin'

  return (
    <AuthShell>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{activeTab === 'signup' ? t('signupTitle') : t('signinTitle')}</CardTitle>
          <CardDescription>{activeTab === 'signup' ? t('signupDesc') : t('signinDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {sessionExpired && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{t('fetchUserSettingsError')}</AlertDescription>
            </Alert>
          )}
          {!userOpenSettings.fetched ? (
            <div className="grid gap-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-5">
              {canRegister && (
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">{t('login')}</TabsTrigger>
                  <TabsTrigger value="signup">{t('register')}</TabsTrigger>
                </TabsList>
              )}
              <TabsContent value="signin">
                <SignInForm
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  onForgot={() => setResetOpen(true)}
                />
              </TabsContent>
              {canRegister && (
                <TabsContent value="signup">
                  <RegisterForm
                    mode="register"
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    countdown={countdown}
                    onDone={() => setTab('signin')}
                  />
                </TabsContent>
              )}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('forgotPassword')}</DialogTitle>
            {canReset && <DialogDescription>{t('resetPasswordDesc')}</DialogDescription>}
          </DialogHeader>
          {canReset ? (
            <RegisterForm
              mode="reset"
              email={email}
              setEmail={setEmail}
              password={resetPassword}
              setPassword={setResetPassword}
              countdown={countdown}
              onDone={() => {
                setResetPassword('')
                setResetOpen(false)
                setTab('signin')
              }}
            />
          ) : (
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>{t('cannotForgotPassword')}</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </AuthShell>
  )
}
