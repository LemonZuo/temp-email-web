import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  CircleAlertIcon,
  DicesIcon,
  DownloadIcon,
  ListIcon,
  MailPlusIcon,
  ShieldAlertIcon,
  SquareIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersRoundIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddressCredentialDialog } from '@/components/common/address-credential-dialog'
import { confirm } from '@/components/common/confirm'
import { CopyButton } from '@/components/common/copy-button'
import { Page, PageHeader, Section } from '@/components/common/page'
import { api } from '@/lib/api'
import { EXPIRY_MODES, resolveExpiryPayload, type ExpiryMode } from '@/lib/expiry'
import { errorMessage } from '@/lib/format'
import { useApp } from '@/store/app'
import { BatchExportDialog, type BatchCredentialRow } from '@/features/admin/components/core/batch-export-dialog'
import { loginUrl } from '@/features/admin/components/core/helpers'
import { adminPath } from '@/features/admin/paths'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '创建地址',
    description: '以管理员身份创建邮箱地址，不受地址长度、允许域名和名称规则限制。',
    options: '地址选项',
    creationMode: '创建方式',
    singleMode: '单个创建',
    batchMode: '批量创建',
    enablePrefix: '启用前缀',
    enablePrefixDesc: '在地址名前加上站点前缀 {prefix}',
    address: '邮箱地址',
    domain: '域名',
    namePlaceholder: '邮箱名称',
    generateName: '生成随机名字',
    subdomain: '子域名',
    normalSubdomain: '普通域名',
    enableRandomSubdomain: '启用随机子域名',
    enableCustomSubdomain: '使用自定义子域名',
    randomSubdomainTip:
      '启用后，创建出来的地址会自动挂在随机子域名下，建议仅用于收件。需要在基础域名 DNS 中配置通配 MX 记录，详见随机子域名文档。',
    customSubdomainPlaceholder: '子域名',
    expiresAt: '过期时间（可选）',
    neverExpires: '永不过期',
    expiry1h: '1 小时',
    expiry24h: '24 小时',
    expiry3d: '3 天',
    expiry7d: '1 周',
    expiry30d: '30 天',
    expiryCustom: '自定义日期时间',
    invalidExpiryDateTime: '请选择将来的有效过期日期时间',
    fillInAllFields: '请填写完整信息',
    createEmailAddress: '创建邮箱',
    successTip: '创建成功',
    preview: '预览',
    viewList: '地址列表',
    // batch
    batchCount: '批量数量（1–100）',
    randomNameTip: '邮箱名称将随机生成。',
    createBatch: '批量创建',
    stop: '停止',
    batchValidation: '请选择域名并输入 1–100 的整数数量，自定义子域名不能为空。',
    batchNameError: '配置的地址规范化规则无法生成有效的随机名称。',
    batchProgress: '已完成：{completed} / {requested}',
    batchStopped: '批量创建已停止',
    batchStoppedDesc: '中断的请求可能已创建邮箱，结果未知。仍可导出已确认成功的记录。',
    results: '批量结果',
    batchTotal: '已保存结果：{count}',
    exportCsv: '导出 CSV',
    clearResults: '清空结果',
    clearResultsConfirm: '清空批量结果？',
    clearResultsDesc: '结果仅保存在内存中，清空后将无法再导出这些登录链接。',
    batchSecurity:
      '任何持有这些链接的人都可访问邮箱。私有部署仍需要站点访问凭据。结果仅保存在内存中，离开此页面或清空后即消失。',
    loginLink: '登录链接',
    noResults: '批量创建的邮箱会显示在这里',
  },
  en: {
    title: 'Create address',
    description: 'Create mailboxes as admin, without the length, allowed-domain and name rules applied to users.',
    options: 'Address options',
    creationMode: 'Creation mode',
    singleMode: 'Single creation',
    batchMode: 'Batch creation',
    enablePrefix: 'Enable prefix',
    enablePrefixDesc: 'Prepend the site prefix {prefix} to the name',
    address: 'Email Address',
    domain: 'Domain',
    namePlaceholder: 'Mailbox name',
    generateName: 'Generate Fake Name',
    subdomain: 'Subdomain',
    normalSubdomain: 'Normal Domain',
    enableRandomSubdomain: 'Use Random Subdomain',
    enableCustomSubdomain: 'Use Custom Subdomain',
    randomSubdomainTip:
      'When enabled, the created address will use a random subdomain. Recommended for receiving only. Requires a wildcard MX DNS record on the base domain — see the random subdomain docs.',
    customSubdomainPlaceholder: 'subdomain',
    expiresAt: 'Expiration (Optional)',
    neverExpires: 'Never expires',
    expiry1h: '1 hour',
    expiry24h: '24 hours',
    expiry3d: '3 days',
    expiry7d: '1 week',
    expiry30d: '30 days',
    expiryCustom: 'Custom date & time',
    invalidExpiryDateTime: 'Please select a valid future expiration date & time',
    fillInAllFields: 'Please fill in all fields',
    createEmailAddress: 'Create Email Address',
    successTip: 'Success Created',
    preview: 'Preview',
    viewList: 'Address list',
    batchCount: 'Batch count (1–100)',
    randomNameTip: 'Mailbox names are generated randomly.',
    createBatch: 'Create batch',
    stop: 'Stop',
    batchValidation: 'Choose a domain and an integer count from 1 to 100. Custom subdomains cannot be empty.',
    batchNameError: 'The configured address normalization cannot produce a valid random name.',
    batchProgress: 'Completed: {completed} / {requested}',
    batchStopped: 'Batch stopped',
    batchStoppedDesc:
      'Interrupted requests may have created a mailbox with an unknown outcome. Known successes can still be exported.',
    results: 'Batch results',
    batchTotal: 'Saved results: {count}',
    exportCsv: 'Export CSV',
    clearResults: 'Clear results',
    clearResultsConfirm: 'Clear batch results?',
    clearResultsDesc: 'Results only live in memory; the login links cannot be exported after clearing.',
    batchSecurity:
      'Anyone holding these links can access the mailboxes. Private deployments still require site-access credentials. Results stay in memory until you leave this view or clear them.',
    loginLink: 'Login link',
    noResults: 'Mailboxes created in a batch show up here',
  },
})

const EXPIRY_KEYS: Record<ExpiryMode, keyof typeof messages.zh> = {
  never: 'neverExpires',
  '1h': 'expiry1h',
  '24h': 'expiry24h',
  '3d': 'expiry3d',
  '7d': 'expiry7d',
  '30d': 'expiry30d',
  custom: 'expiryCustom',
}

const ADJECTIVES = ['quick', 'lazy', 'happy', 'brave', 'calm', 'eager', 'fancy', 'gentle', 'jolly', 'kind', 'lucky', 'mighty', 'proud', 'silly', 'sunny', 'witty', 'bold', 'cool', 'swift', 'quiet']
const FIRST_NAMES = ['alex', 'sam', 'jordan', 'taylor', 'morgan', 'casey', 'riley', 'jamie', 'avery', 'quinn', 'drew', 'blake', 'harper', 'logan', 'reese', 'skyler', 'emery', 'rowan', 'parker', 'sage']
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

const BATCH_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

type NewAddressResponse = { jwt: string; password?: string; address?: string }
type SubdomainMode = 'normal' | 'random' | 'custom'

/** `/console/accounts/new` — create one address or a batch of random ones. */
export default function CreateAccountPage() {
  const t = useT(messages)
  const openSettings = useApp((s) => s.openSettings)

  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [enablePrefix, setEnablePrefix] = useState(true)
  const [name, setName] = useState('')
  const [domainChoice, setDomain] = useState('')
  const [subdomainChoice, setSubdomainMode] = useState<SubdomainMode>('normal')
  const [customSubdomain, setCustomSubdomain] = useState('')
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>('never')
  const [customExpiry, setCustomExpiry] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<{ address: string; jwt: string; password: string } | null>(null)

  // batch state
  const [batchCount, setBatchCount] = useState('10')
  const [batchRows, setBatchRows] = useState<BatchCredentialRow[]>([])
  const [batchRequested, setBatchRequested] = useState(0)
  const [batchCompleted, setBatchCompleted] = useState(0)
  const [batchError, setBatchError] = useState('')
  const [batchRunning, setBatchRunning] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const stopRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const busy = creating || batchRunning

  const addressRegex = useMemo(() => {
    try {
      if (openSettings.addressRegex) return new RegExp(openSettings.addressRegex, 'g')
    } catch (error) {
      console.error(`Invalid addressRegex: ${openSettings.addressRegex}`, error)
    }
    return /[^a-z0-9]/g
  }, [openSettings.addressRegex])

  // Default to the first domain; random/custom subdomains only apply to allowed domains
  const domain = domainChoice || openSettings.domains[0]?.value || ''
  const canRandomSubdomain = !!domain && (openSettings.randomSubdomainDomains || []).includes(domain)
  const subdomainMode: SubdomainMode = canRandomSubdomain ? subdomainChoice : 'normal'

  const effectiveDomain = subdomainMode === 'custom' ? `${customSubdomain.trim()}.${domain}` : domain
  const invalidDomain = !domain || (subdomainMode === 'custom' && !customSubdomain.trim())
  const expiryEnabled = openSettings.enableAddressExpiry
  const customExpiryMs = customExpiry ? new Date(customExpiry).getTime() : null
  const invalidExpiry = expiryEnabled && expiryMode === 'custom' && resolveExpiryPayload('custom', customExpiryMs) === null
  const showPrefix = !!openSettings.prefix && enablePrefix
  const parsedCount = Number(batchCount)
  const validBatchCount = batchCount.trim() !== '' && Number.isInteger(parsedCount) && parsedCount >= 1 && parsedCount <= 100

  const baseBody = () => ({
    enablePrefix,
    enableRandomSubdomain: subdomainMode === 'random',
    domain: effectiveDomain,
  })

  const generateName = () => {
    let generated = `${pick(FIRST_NAMES)}.${pick(ADJECTIVES)}${Math.floor(Math.random() * 1000)}`
      .toLowerCase()
      .replace(/\.{2,}/g, '.')
      .replace(addressRegex, '')
    if (generated.length > openSettings.maxAddressLen) generated = generated.slice(0, openSettings.maxAddressLen)
    setName(generated)
  }

  const createSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!name || invalidDomain) return toast.error(t('fillInAllFields'))
    let expiryPayload: ReturnType<typeof resolveExpiryPayload> = {}
    if (expiryEnabled) {
      expiryPayload = resolveExpiryPayload(expiryMode, customExpiryMs)
      if (!expiryPayload) return toast.error(t('invalidExpiryDateTime'))
    }
    setCreating(true)
    try {
      const res = await api.post<NewAddressResponse>('/admin/new_address', { ...baseBody(), name, ...expiryPayload })
      toast.success(t('successTip'))
      setCreated({ address: res.address || '', jwt: res.jwt, password: res.password || '' })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setCreating(false)
    }
  }

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!validBatchCount || invalidDomain) return toast.error(t('batchValidation'))
    const body: Record<string, unknown> = baseBody()
    // Custom expiry is re-validated before every request: it must stay in the future.
    let customExpiresAt: string | null = null
    if (expiryEnabled) {
      const payload = resolveExpiryPayload(expiryMode, customExpiryMs)
      if (!payload) {
        setBatchError(t('invalidExpiryDateTime'))
        return toast.error(t('invalidExpiryDateTime'))
      }
      Object.assign(body, payload)
      if (expiryMode === 'custom') customExpiresAt = payload.expiresAt ?? null
    }
    const expiryStillValid = () =>
      !customExpiresAt || Math.floor(Date.parse(customExpiresAt) / 1000) > Math.floor(Date.now() / 1000)

    const count = parsedCount
    const normalization = addressRegex
    stopRef.current = false
    setBatchRequested(count)
    setBatchCompleted(0)
    setBatchError('')
    setBatchRunning(true)
    try {
      for (let i = 0; i < count; i++) {
        if (stopRef.current || !mountedRef.current) break
        if (!expiryStillValid()) throw new Error(t('invalidExpiryDateTime'))
        const random = Array.from(crypto.getRandomValues(new Uint8Array(30)), (byte) => BATCH_ALPHABET[byte % BATCH_ALPHABET.length]).join('')
        const batchName = random.replace(normalization, '').slice(0, 30)
        if (!batchName || !/^[a-z0-9]{1,30}$/.test(batchName)) throw new Error(t('batchNameError'))
        const res = await api.post<NewAddressResponse>('/admin/new_address', { ...body, name: batchName })
        if (!mountedRef.current) break
        setBatchRows((rows) => [...rows, { address: res.address || '', jwt: res.jwt }])
        setBatchCompleted((n) => n + 1)
      }
    } catch (error) {
      if (mountedRef.current) setBatchError(errorMessage(error))
    } finally {
      if (mountedRef.current) setBatchRunning(false)
    }
  }

  const clearBatch = async () => {
    if (batchRunning) return
    if (!(await confirm({ title: t('clearResultsConfirm'), description: t('clearResultsDesc'), destructive: true }))) return
    setBatchRows([])
    setBatchCompleted(0)
    setBatchRequested(0)
    setBatchError('')
  }

  const progressPercent = batchRequested ? Math.floor((batchCompleted / batchRequested) * 100) : 0

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="outline" asChild>
            <Link to={adminPath('accounts')}>
              <ListIcon />
              {t('viewList')}
            </Link>
          </Button>
        }
      />

      <Tabs value={mode} onValueChange={(v) => !busy && setMode(v as typeof mode)}>
        <TabsList className="w-full sm:w-auto" aria-label={t('creationMode')}>
          <TabsTrigger value="single" disabled={busy && mode !== 'single'}>
            <UserPlusIcon />
            {t('singleMode')}
          </TabsTrigger>
          <TabsTrigger value="batch" disabled={busy && mode !== 'batch'}>
            <UsersRoundIcon />
            {t('batchMode')}
          </TabsTrigger>
        </TabsList>

        <Section className="mt-4" title={t('options')}>
          <form onSubmit={mode === 'single' ? createSingle : createBatch}>
            <FieldGroup>
              {openSettings.prefix && (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="admin-enable-prefix">{t('enablePrefix')}</FieldLabel>
                    <FieldDescription>{t('enablePrefixDesc', { prefix: openSettings.prefix })}</FieldDescription>
                  </FieldContent>
                  <Switch id="admin-enable-prefix" checked={enablePrefix} onCheckedChange={setEnablePrefix} disabled={busy} />
                </Field>
              )}

              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor={mode === 'single' ? 'admin-new-name' : 'admin-new-domain'}>
                    {mode === 'single' ? t('address') : t('domain')}
                  </FieldLabel>
                  {mode === 'single' && (
                    <Button type="button" variant="ghost" size="xs" onClick={generateName} disabled={busy}>
                      <DicesIcon />
                      {t('generateName')}
                    </Button>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {mode === 'single' && (
                    <InputGroup className="sm:flex-1">
                      {showPrefix && (
                        <InputGroupAddon>
                          <InputGroupText>{openSettings.prefix}</InputGroupText>
                        </InputGroupAddon>
                      )}
                      <InputGroupInput
                        id="admin-new-name"
                        value={name}
                        disabled={busy}
                        placeholder={t('namePlaceholder')}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="off"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>@</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  )}
                  <Select value={domain} onValueChange={setDomain} disabled={busy}>
                    <SelectTrigger id="admin-new-domain" className={mode === 'single' ? 'w-full sm:w-auto sm:min-w-48' : 'w-full'}>
                      <SelectValue placeholder={t('domain')} />
                    </SelectTrigger>
                    <SelectContent>
                      {openSettings.domains.map((d) => (
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
                  <FieldLabel>{t('subdomain')}</FieldLabel>
                  <RadioGroup
                    value={subdomainMode}
                    onValueChange={(v) => setSubdomainMode(v as SubdomainMode)}
                    className="flex flex-wrap gap-4"
                    disabled={busy}
                  >
                    {(['normal', 'random', 'custom'] as const).map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <RadioGroupItem value={m} id={`admin-sub-${m}`} />
                        <Label htmlFor={`admin-sub-${m}`} className="font-normal">
                          {t(m === 'normal' ? 'normalSubdomain' : m === 'random' ? 'enableRandomSubdomain' : 'enableCustomSubdomain')}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {subdomainMode === 'random' && <FieldDescription>{t('randomSubdomainTip')}</FieldDescription>}
                  {subdomainMode === 'custom' && (
                    <InputGroup>
                      <InputGroupInput
                        value={customSubdomain}
                        disabled={busy}
                        placeholder={t('customSubdomainPlaceholder')}
                        onChange={(e) => setCustomSubdomain(e.target.value)}
                        aria-label={t('enableCustomSubdomain')}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>.{domain}</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  )}
                </Field>
              )}

              {expiryEnabled && (
                <Field data-invalid={invalidExpiry || undefined}>
                  <FieldLabel htmlFor="admin-expiry">{t('expiresAt')}</FieldLabel>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={expiryMode} onValueChange={(v) => setExpiryMode(v as ExpiryMode)} disabled={busy}>
                      <SelectTrigger id="admin-expiry" className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPIRY_MODES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {t(EXPIRY_KEYS[m])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {expiryMode === 'custom' && (
                      <Input
                        type="datetime-local"
                        step={1}
                        className="sm:flex-1"
                        value={customExpiry}
                        disabled={busy}
                        aria-invalid={invalidExpiry || undefined}
                        aria-label={t('expiryCustom')}
                        onChange={(e) => setCustomExpiry(e.target.value)}
                      />
                    )}
                  </div>
                  {invalidExpiry && customExpiry && <FieldDescription className="text-destructive">{t('invalidExpiryDateTime')}</FieldDescription>}
                </Field>
              )}

              <FieldSeparator />

              <TabsContent value="single" className="grid gap-4">
                {name && domain && (
                  <p className="truncate rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{t('preview')}: </span>
                    <span className="font-mono font-medium">
                      {showPrefix && openSettings.prefix}
                      {name}@{subdomainMode === 'random' ? `*.${domain}` : effectiveDomain}
                    </span>
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={busy || !name || invalidDomain || invalidExpiry}>
                  {creating ? <Spinner /> : <MailPlusIcon />}
                  {t('createEmailAddress')}
                </Button>
              </TabsContent>

              <TabsContent value="batch" className="grid gap-4">
                <Field data-invalid={!validBatchCount || undefined}>
                  <FieldLabel htmlFor="admin-batch-count">{t('batchCount')}</FieldLabel>
                  <Input
                    id="admin-batch-count"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    step={1}
                    value={batchCount}
                    disabled={busy}
                    aria-invalid={!validBatchCount || undefined}
                    onChange={(e) => setBatchCount(e.target.value)}
                  />
                  <FieldDescription>{t('randomNameTip')}</FieldDescription>
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={busy || !validBatchCount || invalidDomain || invalidExpiry}>
                    {batchRunning ? <Spinner /> : <MailPlusIcon />}
                    {t('createBatch')}
                  </Button>
                  {batchRunning && (
                    <Button type="button" variant="outline" onClick={() => (stopRef.current = true)}>
                      <SquareIcon />
                      {t('stop')}
                    </Button>
                  )}
                </div>
                {batchRequested > 0 && (
                  <div className="grid gap-1.5">
                    <Progress value={progressPercent} className="h-2" />
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {t('batchProgress', { completed: batchCompleted, requested: batchRequested })}
                    </span>
                  </div>
                )}
                {batchError && (
                  <Alert variant="destructive">
                    <CircleAlertIcon />
                    <AlertTitle>{t('batchStopped')}</AlertTitle>
                    <AlertDescription>
                      {t('batchStoppedDesc')} {batchError}
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </FieldGroup>
          </form>
        </Section>
      </Tabs>

      {mode === 'batch' && (
        <Section
          title={t('results')}
          description={t('batchTotal', { count: batchRows.length })}
          actions={
            <>
              <Button variant="outline" size="sm" disabled={batchRunning || !batchRows.length} onClick={() => setShowExport(true)}>
                <DownloadIcon />
                {t('exportCsv')}
              </Button>
              <Button variant="ghost" size="sm" disabled={batchRunning || !batchRows.length} onClick={() => void clearBatch()}>
                <Trash2Icon />
                <span className="hidden sm:inline">{t('clearResults')}</span>
              </Button>
            </>
          }
          contentClassName="grid gap-4"
        >
          <Alert>
            <ShieldAlertIcon />
            <AlertDescription>{t('batchSecurity')}</AlertDescription>
          </Alert>
          {batchRows.length > 0 ? (
            <div className="max-h-96 overflow-auto rounded-xl border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('address')}</TableHead>
                    <TableHead className="w-24 text-right">{t('loginLink')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchRows.map((row, i) => (
                    <TableRow key={`${row.address}-${i}`}>
                      <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      <TableCell className="font-mono text-[13px] break-all">{row.address}</TableCell>
                      <TableCell className="text-right">
                        <CopyButton value={loginUrl(row.jwt)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t('noResults')}</p>
          )}
        </Section>
      )}

      <BatchExportDialog open={showExport} onOpenChange={setShowExport} rows={batchRows} />
      <AddressCredentialDialog
        open={!!created}
        onOpenChange={(open) => !open && setCreated(null)}
        address={created?.address || ''}
        jwt={created?.jwt || ''}
        addressPassword={created?.password}
      />
    </Page>
  )
}
