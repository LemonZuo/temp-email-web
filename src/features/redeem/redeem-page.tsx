import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import {
  ArrowLeftIcon,
  AtSignIcon,
  CircleCheckBigIcon,
  DicesIcon,
  ExternalLinkIcon,
  GiftIcon,
  MailOpenIcon,
  SearchIcon,
  SendIcon,
  TicketIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { AddressCredentialContent } from '@/components/common/address-credential-dialog'
import { LanguageToggle, ThemeToggle } from '@/components/layout/header-controls'
import { Logo } from '@/components/layout/module-switcher'
import { api, loadAddressSettings, loadUserSettings } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { switchAddress } from '@/lib/session'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app'
import { useAuth } from '@/store/auth'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    address: '邮箱地址',
    addressSuccess: '兑换成功，请妥善保存以下邮箱凭证。',
    autoName: '自动生成',
    back: '返回邮箱',
    balanceDescription: '为指定邮箱兑换 {amount} 次发信额度。',
    balanceSuccess: '已为 {address} 增加 {amount} 次发信额度。',
    balanceTitle: '发信额度',
    checkCode: '查询兑换码',
    codeLabel: '兑换码',
    codePlaceholder: '输入你的兑换码',
    categoryTitle: '可兑换权益',
    confirmBalance: '确认兑换',
    confirmRole: '确认兑换',
    createAddress: '兑换邮箱地址',
    customSubdomain: '自定义子域名',
    expired: '已过期',
    expiredTip: '此兑换码已过期，无法继续兑换。',
    getCode: '获取兑换码',
    noPrefixDescription: '可兑换 1 个无前缀邮箱地址。',
    normalDomain: '普通域名',
    openAddress: '打开邮箱',
    prefixDescription: '可兑换 1 个以 {prefix} 开头的邮箱地址。',
    prefixTitle: '专属邮箱',
    randomName: '随机生成',
    randomSubdomain: '随机子域名',
    redeemAnother: '继续兑换',
    redeemed: '已使用',
    redeemNow: '立即兑换',
    roleDescription: '为指定账号开通 {role} 角色权益。',
    roleSuccess: '已为 {email} 开通 {role} 角色权益。',
    roleTitle: '角色权益',
    targetAddress: '目标邮箱地址',
    unused: '未使用',
    success: '兑换成功',
    title: '兑换权益',
    subtitle: '输入兑换码，解锁角色权益、发信额度或专属邮箱。',
    userEmail: '接收账号',
    viewResult: '查看兑换结果',
    userEmailPlaceholder: '请输入账号邮箱',
    domain: '域名',
    preview: '将创建',
  },
  en: {
    address: 'Email address',
    addressSuccess: 'Redemption complete. Keep the mailbox credentials below secure.',
    autoName: 'Generated automatically',
    back: 'Back to mailbox',
    balanceDescription: 'Redeem {amount} sending credits for a mailbox.',
    balanceSuccess: 'Added {amount} sending credits to {address}.',
    balanceTitle: 'Sending credits',
    checkCode: 'Look up code',
    codeLabel: 'Redemption code',
    codePlaceholder: 'Enter your code',
    categoryTitle: 'Available benefits',
    confirmBalance: 'Confirm redemption',
    confirmRole: 'Confirm redemption',
    createAddress: 'Redeem mailbox',
    customSubdomain: 'Custom subdomain',
    expired: 'Expired',
    expiredTip: 'This code has expired and can no longer be redeemed.',
    getCode: 'Get a redemption code',
    noPrefixDescription: 'Redeem one mailbox without a prefix.',
    normalDomain: 'Normal domain',
    openAddress: 'Open mailbox',
    prefixDescription: 'Redeem one mailbox beginning with {prefix}.',
    prefixTitle: 'Custom mailbox',
    randomName: 'Generate name',
    randomSubdomain: 'Random subdomain',
    redeemAnother: 'Redeem another code',
    redeemed: 'Used',
    redeemNow: 'Redeem now',
    roleDescription: 'Grant the {role} benefits to a specified account.',
    roleSuccess: 'The {role} benefits are now active for {email}.',
    roleTitle: 'Role benefits',
    targetAddress: 'Target email address',
    unused: 'Unused',
    success: 'Redemption complete',
    title: 'Redeem benefits',
    subtitle: 'Enter a code to unlock role benefits, sending credits or a custom mailbox.',
    userEmail: 'Recipient account',
    viewResult: 'View redemption result',
    userEmailPlaceholder: 'Enter the account email',
    domain: 'Domain',
    preview: 'Will create',
  },
})

type RedeemType = 'role' | 'send_balance' | 'address_prefix_once'
type CodeStatus = 'unused' | 'redeemed' | 'expired'

/** `POST /redeem_api/query` */
type CodeInfo = { redeem_type: RedeemType; value: string; status: CodeStatus }

/** `POST /redeem_api/redeem` and `/redeem_api/result` */
type RedeemResult =
  | { type: 'role'; role: string; user_email: string }
  | { type: 'send_balance'; address: string; amount: number; balance?: number }
  | { type: 'address_prefix_once'; address: string; jwt: string; password?: string | null }

const TYPE_ICONS = { role: GiftIcon, send_balance: SendIcon, address_prefix_once: AtSignIcon } as const
const TYPE_TITLES = { role: 'roleTitle', send_balance: 'balanceTitle', address_prefix_once: 'prefixTitle' } as const
const REDEEM_TYPES: RedeemType[] = ['role', 'send_balance', 'address_prefix_once']

const STATUS_CLASS: Record<CodeStatus, string> = {
  unused: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  redeemed: 'bg-secondary text-secondary-foreground',
  expired: 'bg-destructive/10 text-destructive',
}

const NAME_CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** `/redeem` — look up a redemption code and redeem it (role / send balance / prefixed address). */
export default function RedeemPage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const openSettings = useApp((s) => s.openSettings)
  const userEmail = useApp((s) => s.userSettings.user_email)
  const currentAddress = useApp((s) => s.addressSettings.address)
  const jwt = useAuth((s) => s.jwt)

  const [code, setCode] = useState('')
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null)
  const [started, setStarted] = useState(false)
  const [completed, setCompleted] = useState<RedeemResult | null>(null)
  // `null` = untouched: follow the logged-in user / current mailbox once they load.
  const [targetUserEmailInput, setTargetUserEmail] = useState<string | null>(null)
  const [targetAddressInput, setTargetAddress] = useState<string | null>(null)
  const targetUserEmail = targetUserEmailInput ?? userEmail ?? ''
  const targetAddress = targetAddressInput ?? currentAddress ?? ''
  const [emailName, setEmailName] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [subdomainMode, setSubdomainMode] = useState<'normal' | 'random' | 'custom'>('normal')
  const [customSubdomain, setCustomSubdomain] = useState('')
  const [loading, setLoading] = useState<'' | 'query' | 'redeem' | 'result' | 'open'>('')
  const latestQuery = useRef(0)

  // The mailbox shell is not mounted here; load the current address so it can prefill the target.
  useEffect(() => {
    if (jwt && !useApp.getState().addressSettings.address) loadAddressSettings().catch(console.error)
  }, [jwt])

  const redeemCodeUrl = useMemo(() => {
    try {
      const url = new URL(openSettings.redeemCodeUrl)
      return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
    } catch {
      return ''
    }
  }, [openSettings.redeemCodeUrl])

  const domainOptions = useMemo(() => {
    const allowed = openSettings.defaultDomains?.length ? openSettings.defaultDomains : openSettings.domains.map((d) => d.value)
    return openSettings.domains.filter((d) => allowed.includes(d.value))
  }, [openSettings.domains, openSettings.defaultDomains])

  const domain = domainOptions.some((d) => d.value === emailDomain) ? emailDomain : domainOptions[0]?.value || ''
  const canRandomSubdomain = !!domain && openSettings.randomSubdomainDomains?.includes(domain)
  const mode = canRandomSubdomain ? subdomainMode : 'normal'
  const prefix = codeInfo?.redeem_type === 'address_prefix_once' ? codeInfo.value || '' : ''
  const nameMaxLength = Math.max((openSettings.maxAddressLen || 30) - prefix.length, 1)
  const nameMinLength = Math.min(nameMaxLength, Math.max((openSettings.minAddressLen || 1) - prefix.length, 1))
  const name = emailName.slice(0, nameMaxLength)
  const customName = !openSettings.disableCustomAddressName

  if (!openSettings.enableRedeemCode) return <Navigate to="/" replace />

  const activeType = completed?.type || codeInfo?.redeem_type || ''

  const changeCode = (value: string) => {
    latestQuery.current += 1
    setCode(value)
    setCodeInfo(null)
    setStarted(false)
  }

  const queryCode = async () => {
    const queried = code.trim()
    if (!queried || loading) return
    const requestId = ++latestQuery.current
    setLoading('query')
    try {
      const result = await api.post<CodeInfo>('/redeem_api/query', { code: queried })
      if (requestId !== latestQuery.current) return
      setCodeInfo(result)
      setStarted(false)
      setCompleted(null)
    } catch (error) {
      if (requestId !== latestQuery.current) return
      setCodeInfo(null)
      toast.error(errorMessage(error))
    } finally {
      setLoading('')
    }
  }

  const reset = () => {
    latestQuery.current += 1
    setCode('')
    setCodeInfo(null)
    setStarted(false)
    setCompleted(null)
  }

  const redeem = async () => {
    if (!codeInfo || loading) return
    let body: Record<string, unknown>
    if (codeInfo.redeem_type === 'role') {
      if (!targetUserEmail.trim()) return
      body = { code: code.trim(), user_email: targetUserEmail.trim() }
    } else if (codeInfo.redeem_type === 'send_balance') {
      if (!targetAddress.trim()) return
      body = { code: code.trim(), address: targetAddress.trim() }
    } else {
      if (!domain || (mode === 'custom' && !customSubdomain.trim())) return
      body = {
        code: code.trim(),
        name: customName ? name : '',
        domain: mode === 'custom' ? `${customSubdomain.trim()}.${domain}` : domain,
        enableRandomSubdomain: mode === 'random',
      }
    }
    setLoading('redeem')
    try {
      const result = await api.post<RedeemResult>('/redeem_api/redeem', body)
      setCompleted(result)
      setCodeInfo(null)
      if (result?.type === 'role' && result.user_email?.toLowerCase() === userEmail?.trim().toLowerCase()) {
        await loadUserSettings()
      }
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading('')
    }
  }

  const showResult = async () => {
    if (loading) return
    setLoading('result')
    try {
      setCompleted(await api.post<RedeemResult>('/redeem_api/result', { code: code.trim() }))
      setCodeInfo(null)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading('')
    }
  }

  const openRedeemedAddress = async () => {
    if (completed?.type !== 'address_prefix_once') return
    setLoading('open')
    try {
      await switchAddress(completed.jwt)
      useAuth.getState().setAddressPassword(completed.password || '')
      useApp.getState().set({ showCredential: true })
      navigate('/')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading('')
    }
  }

  const generateName = () => {
    const length = Math.min(nameMaxLength, Math.max(nameMinLength, 8))
    const bytes = crypto.getRandomValues(new Uint8Array(length))
    setEmailName(Array.from(bytes, (b) => NAME_CHARSET[b % NAME_CHARSET.length]).join(''))
  }

  const spin = (key: typeof loading, icon: React.ReactNode) => (loading === key ? <Spinner /> : icon)

  const detailHeading = (info: CodeInfo) => {
    const Icon = TYPE_ICONS[info.redeem_type]
    const description =
      info.redeem_type === 'role'
        ? t('roleDescription', { role: info.value })
        : info.redeem_type === 'send_balance'
          ? t('balanceDescription', { amount: info.value })
          : info.value
            ? t('prefixDescription', { prefix: info.value })
            : t('noPrefixDescription')
    return (
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t(TYPE_TITLES[info.redeem_type])}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge className={cn('shrink-0', STATUS_CLASS[info.status])}>{t(info.status)}</Badge>
      </div>
    )
  }

  const redeemedButton = (
    <Button className="w-full" onClick={showResult} disabled={!!loading} data-testid="redeem-result">
      {spin('result', <CircleCheckBigIcon />)}
      {t('viewResult')}
    </Button>
  )
  const startButton = (
    <Button className="w-full" onClick={() => setStarted(true)} data-testid="redeem-now">
      <GiftIcon />
      {t('redeemNow')}
    </Button>
  )
  const expiredNote = <p className="rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">{t('expiredTip')}</p>

  const renderDetail = (info: CodeInfo) => {
    if (info.status === 'expired') return expiredNote
    if (info.status === 'redeemed') return redeemedButton
    if (info.redeem_type === 'role' || info.redeem_type === 'send_balance') {
      if (!started) return startButton
      const isRole = info.redeem_type === 'role'
      const value = isRole ? targetUserEmail : targetAddress
      return (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            redeem()
          }}
        >
          <Field>
            <FieldLabel htmlFor="redeem-target">{isRole ? t('userEmail') : t('targetAddress')}</FieldLabel>
            <Input
              id="redeem-target"
              type="email"
              autoFocus
              data-testid={isRole ? 'redeem-user-email' : 'redeem-target-address'}
              value={value}
              placeholder={isRole ? t('userEmailPlaceholder') : t('targetAddress')}
              onChange={(e) => (isRole ? setTargetUserEmail(e.target.value) : setTargetAddress(e.target.value))}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={!value.trim() || !!loading}>
            {spin('redeem', <GiftIcon />)}
            {isRole ? t('confirmRole') : t('confirmBalance')}
          </Button>
        </form>
      )
    }
    // address_prefix_once
    return (
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          redeem()
        }}
      >
        <FieldGroup>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="redeem-address-name">{t('address')}</FieldLabel>
              {customName && (
                <Button type="button" variant="ghost" size="xs" onClick={generateName}>
                  <DicesIcon />
                  {t('randomName')}
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <InputGroup className="sm:flex-1">
                {prefix && (
                  <InputGroupAddon>
                    <InputGroupText className="font-mono text-foreground">{prefix}</InputGroupText>
                  </InputGroupAddon>
                )}
                <InputGroupInput
                  id="redeem-address-name"
                  data-testid="redeem-address-name"
                  autoComplete="off"
                  value={customName ? name : ''}
                  disabled={!customName}
                  placeholder={customName ? undefined : t('autoName')}
                  minLength={nameMinLength}
                  maxLength={nameMaxLength}
                  onChange={(e) => setEmailName(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>@</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <Select value={domain} onValueChange={setEmailDomain}>
                <SelectTrigger className="w-full sm:w-auto sm:min-w-44" aria-label={t('domain')}>
                  <SelectValue placeholder={t('domain')} />
                </SelectTrigger>
                <SelectContent>
                  {domainOptions.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Field>
          {canRandomSubdomain && (
            <Field>
              <RadioGroup value={mode} onValueChange={(v) => setSubdomainMode(v as typeof subdomainMode)} className="flex flex-wrap gap-4">
                {(['normal', 'random', 'custom'] as const).map((m) => (
                  <div key={m} className="flex items-center gap-2">
                    <RadioGroupItem value={m} id={`redeem-sub-${m}`} />
                    <Label htmlFor={`redeem-sub-${m}`} className="font-normal">
                      {t(m === 'normal' ? 'normalDomain' : m === 'random' ? 'randomSubdomain' : 'customSubdomain')}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {mode === 'custom' && (
                <InputGroup>
                  <InputGroupInput value={customSubdomain} onChange={(e) => setCustomSubdomain(e.target.value)} aria-label={t('customSubdomain')} />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>.{domain}</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              )}
            </Field>
          )}
        </FieldGroup>
        {customName && name && domain && (
          <p className="truncate rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t('preview')}: </span>
            <span className="font-mono font-medium">
              {prefix}
              {name}@{mode === 'random' ? `*.${domain}` : mode === 'custom' ? `${customSubdomain.trim()}.${domain}` : domain}
            </span>
          </p>
        )}
        <Button type="submit" className="w-full" disabled={!domain || (mode === 'custom' && !customSubdomain.trim()) || !!loading}>
          {spin('redeem', <AtSignIcon />)}
          {t('createAddress')}
        </Button>
      </form>
    )
  }

  const renderSuccess = (result: RedeemResult) => (
    <div className="grid gap-5">
      <div className="grid justify-items-center gap-2 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CircleCheckBigIcon className="size-7" />
        </span>
        <h2 className="text-lg font-semibold">{t('success')}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {result.type === 'role'
            ? t('roleSuccess', { role: result.role, email: result.user_email })
            : result.type === 'send_balance'
              ? t('balanceSuccess', { amount: result.amount, address: result.address })
              : t('addressSuccess')}
        </p>
      </div>
      {result.type === 'address_prefix_once' && (
        <>
          <div className="rounded-xl border p-3 sm:p-4">
            <AddressCredentialContent address={result.address} jwt={result.jwt} addressPassword={result.password || undefined} />
          </div>
          <Button className="w-full" onClick={openRedeemedAddress} disabled={!!loading}>
            {spin('open', <MailOpenIcon />)}
            {t('openAddress')}
          </Button>
        </>
      )}
      <Button variant="secondary" className="w-full" onClick={reset}>
        <TicketIcon />
        {t('redeemAnother')}
      </Button>
    </div>
  )

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <Logo className="size-7" />
          <span className="truncate font-semibold">{openSettings.title || t('title')}</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-6 sm:py-10">
        <div className="grid w-full max-w-xl content-start gap-3">
          <Button variant="ghost" size="sm" className="w-fit" asChild>
            <Link to="/">
              <ArrowLeftIcon />
              {t('back')}
            </Link>
          </Button>

          <Card>
            <CardContent className="grid gap-6">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GiftIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('title')}</h1>
                  <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">{t('categoryTitle')}</div>
                <div className="grid grid-cols-3 gap-2">
                  {REDEEM_TYPES.map((type) => {
                    const Icon = TYPE_ICONS[type]
                    const active = activeType === type
                    return (
                      <div
                        key={type}
                        className={cn(
                          'flex min-w-0 flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center text-xs transition-colors sm:flex-row sm:p-3 sm:text-left sm:text-sm',
                          active ? 'border-primary/50 bg-primary/5 text-primary' : 'text-muted-foreground',
                        )}
                      >
                        <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="min-w-0">{t(TYPE_TITLES[type])}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {completed ? (
                renderSuccess(completed)
              ) : (
                <div className="grid gap-4">
                  <form
                    className="grid gap-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      queryCode()
                    }}
                  >
                    <Field>
                      <FieldLabel htmlFor="redeem-code">{t('codeLabel')}</FieldLabel>
                      <Input
                        id="redeem-code"
                        data-testid="redeem-code-input"
                        className={cn('h-10', code && 'font-mono')}
                        autoComplete="off"
                        spellCheck={false}
                        value={code}
                        placeholder={t('codePlaceholder')}
                        onChange={(e) => changeCode(e.target.value)}
                      />
                    </Field>
                    {!codeInfo && (
                      <Button type="submit" size="lg" className="w-full" disabled={!code.trim() || !!loading}>
                        {spin('query', <SearchIcon />)}
                        {t('checkCode')}
                      </Button>
                    )}
                    {redeemCodeUrl && (
                      <Button variant="link" size="sm" className="mx-auto w-fit" asChild>
                        <a href={redeemCodeUrl} target="_blank" rel="noopener noreferrer" data-testid="redeem-code-link">
                          {t('getCode')}
                          <ExternalLinkIcon />
                        </a>
                      </Button>
                    )}
                  </form>

                  {codeInfo && (
                    <div className="grid gap-4 rounded-xl border bg-muted/20 p-4">
                      {detailHeading(codeInfo)}
                      {renderDetail(codeInfo)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
