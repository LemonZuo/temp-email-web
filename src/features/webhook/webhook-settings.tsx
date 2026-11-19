import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useQuery, type QueryKey } from '@tanstack/react-query'
import { ChevronDownIcon, FilterIcon, FlaskConicalIcon, LayoutTemplateIcon, RotateCwIcon, SaveIcon, WebhookIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/common/empty-state'
import { Page, PageHeader, Section } from '@/components/common/page'
import { errorMessage } from '@/lib/format'
import { queryClient } from '@/lib/query-client'
import { defineMessages, useT } from '@/i18n'
import { FilterEditor } from './filter-editor'
import type { FilterOperator } from './filter'
import type { WebhookApi, WebhookSettings } from './webhook-api'

const messages = defineMessages({
  zh: {
    enable: '启用',
    enableTitle: '启用 Webhook',
    filter: '过滤条件',
    filterHelp: '可输入 header.List-ID 等字段。文本默认忽略大小写；正则使用 JavaScript 语法，flags 可选 i、m、s。',
    filter_from: '发件人',
    filter_to: '实际收件邮箱',
    filter_subject: '主题',
    filter_text: '纯文本正文',
    filter_html: 'HTML 正文',
    filter_equals: '等于',
    filter_contains: '包含',
    filter_startsWith: '开头匹配',
    filter_endsWith: '结尾匹配',
    filter_regex: '正则匹配',
    filter_caseSensitive: '区分大小写',
    filter_flags: '正则标志',
    filterSkipped: '条件不匹配，未发送 Webhook',
    filterMatched: '条件匹配（仅检查，未发送）',
    checkFilter: '仅检查规则',
    filterCheckTip: '仅检查是否匹配，不发送 Webhook。“测试”按原配置真实发送，不检查过滤条件。',
    randomMail: '随机邮件',
    specifiedMail: '指定 ID',
    mailId: '邮件 ID',
    invalidMailId: '请输入有效的正整数邮件 ID',
    fillInDemoTip: '请修改URL和其他设置为您自己的配置',
    notEnabled: 'Webhook 未开启，请联系管理员开启',
    presets: '示例模板',
    successTip: '成功',
    test: '测试',
    testTip: '使用所选邮件按当前配置真实发送一次请求，不检查过滤条件。',
    urlMissing: 'URL 不能为空',
    request: '请求配置',
    requestDesc: '收到邮件时按以下配置发送 HTTP 请求。',
    method: '请求方法',
    headers: '请求头（JSON）',
    headersInvalid: '请求头必须是合法的 JSON 对象：{error}',
    body: '请求体模板',
    bodyHelp: '点击变量插入到光标处，发送时会替换为对应的邮件内容。',
    docs: '查看文档',
    disabledHint: 'Webhook 已关闭，开启后可配置请求地址和过滤条件。',
    retry: '重试',
    unsaved: '有未保存的修改',
  },
  en: {
    enable: 'Enable',
    enableTitle: 'Enable webhook',
    filter: 'Filter',
    filterHelp: 'Custom headers: e.g. header.List-ID. Text ignores case by default; regex uses JavaScript syntax with optional i, m, s flags.',
    filter_from: 'Sender',
    filter_to: 'Delivery address',
    filter_subject: 'Subject',
    filter_text: 'Plain text',
    filter_html: 'HTML body',
    filter_equals: 'Equals',
    filter_contains: 'Contains',
    filter_startsWith: 'Starts with',
    filter_endsWith: 'Ends with',
    filter_regex: 'Regular expression',
    filter_caseSensitive: 'Case sensitive',
    filter_flags: 'Regex flags',
    filterSkipped: 'Conditions did not match; webhook not sent',
    filterMatched: 'Conditions match (check only; not sent)',
    checkFilter: 'Check only',
    filterCheckTip: 'Checks matching only; no webhook is sent. Test sends using the existing settings without applying filters.',
    randomMail: 'Random email',
    specifiedMail: 'Specify ID',
    mailId: 'Email ID',
    invalidMailId: 'Enter a valid positive integer email ID',
    fillInDemoTip: 'Please modify the URL and other settings to your own',
    notEnabled: 'Webhook is not enabled for you',
    presets: 'Presets',
    successTip: 'Success',
    test: 'Test',
    testTip: 'Sends one real request with the selected email and the current settings, without applying filters.',
    urlMissing: 'URL is required',
    request: 'Request',
    requestDesc: 'The HTTP request sent when an email arrives.',
    method: 'Method',
    headers: 'Headers (JSON)',
    headersInvalid: 'Headers must be a valid JSON object: {error}',
    body: 'Body template',
    bodyHelp: 'Click a variable to insert it at the cursor; it is replaced with the email content when sending.',
    docs: 'View docs',
    disabledHint: 'Webhook is off. Turn it on to configure the request and filters.',
    retry: 'Retry',
    unsaved: 'Unsaved changes',
  },
})

const DEFAULT_SETTINGS: WebhookSettings = {
  enabled: false,
  url: '',
  method: 'POST',
  headers: JSON.stringify({}, null, 2),
  body: JSON.stringify({}, null, 2),
}

const JSON_HEADERS = JSON.stringify({ 'Content-Type': 'application/json' }, null, 2)
const json = (value: unknown) => JSON.stringify(value, null, 2)

type Preset = { name: string; doc: string; settings: Omit<WebhookSettings, 'filter'> }

const PRESETS: Preset[] = [
  {
    name: 'Message Pusher',
    doc: 'https://github.com/songquanpeng/message-pusher',
    settings: {
      enabled: true,
      url: 'https://msgpusher.com/push/username',
      method: 'POST',
      headers: JSON_HEADERS,
      body: json({
        token: 'token',
        title: '${subject}',
        description: '${subject}',
        content: '*${subject}*\n\nFrom: ${from}\nTo: ${to}\n\n${parsedText}\n',
      }),
    },
  },
  {
    name: 'Bark',
    doc: 'https://github.com/Finb/Bark',
    settings: {
      enabled: true,
      url: 'https://api.day.app/YOUR_KEY',
      method: 'POST',
      headers: JSON_HEADERS,
      body: json({ title: '${subject}', body: 'From: ${from}\nTo: ${to}\n\n${parsedText}', group: 'email' }),
    },
  },
  {
    name: 'ntfy',
    doc: 'https://docs.ntfy.sh/publish/',
    settings: {
      enabled: true,
      url: 'https://ntfy.sh/YOUR_TOPIC',
      method: 'POST',
      headers: JSON_HEADERS,
      body: json({
        topic: 'YOUR_TOPIC',
        title: '${subject}',
        message: 'From: ${from}\nTo: ${to}\n\n${parsedText}',
        tags: ['envelope'],
      }),
    },
  },
  {
    name: 'Telegram Bot',
    doc: 'https://core.telegram.org/bots/api#sendmessage',
    settings: {
      enabled: true,
      url: 'https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage',
      method: 'POST',
      headers: JSON_HEADERS,
      body: json({ chat_id: 'YOUR_CHAT_ID', text: 'New Email\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\nURL: ${url}' }),
    },
  },
  {
    name: 'WeChat Work',
    doc: 'https://developer.work.weixin.qq.com/document/path/91770',
    settings: {
      enabled: true,
      url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY',
      method: 'POST',
      headers: JSON_HEADERS,
      body: json({
        msgtype: 'text',
        text: { content: 'New Email\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\nURL: ${url}' },
      }),
    },
  },
  {
    name: 'Discord',
    doc: 'https://discord.com/developers/docs/resources/webhook',
    settings: {
      enabled: true,
      url: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
      method: 'POST',
      headers: JSON_HEADERS,
      body: json({ content: '**New Email**\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\nURL: ${url}' }),
    },
  },
]

/** Placeholders understood by the worker's `formatWebhookBody`. */
const BODY_VARIABLES = [
  'id',
  'url',
  'from',
  'to',
  'subject',
  'raw',
  'parsedText',
  'parsedHtml',
  'aiExtractType',
  'aiExtractResult',
  'aiExtractResultText',
  'attachments',
  'attachmentLinks',
  'attachmentMarkdownLinks',
]

const FILTER_FIELDS = ['from', 'to', 'subject', 'text', 'html'] as const
const isFieldAllowed = (field: string) =>
  (FILTER_FIELDS as readonly string[]).includes(field) || /^header\.[a-zA-Z0-9!#$%&'*+.^_`|~-]+$/.test(field)

const headersError = (headers: string): string => {
  try {
    const parsed: unknown = JSON.parse(headers)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? '' : 'not an object'
  } catch (error) {
    return errorMessage(error)
  }
}

export type WebhookSettingsPageProps = {
  queryKey: QueryKey
  webhookApi: WebhookApi
  title: React.ReactNode
  description?: React.ReactNode
  /** Description under the enable switch */
  enableDescription?: React.ReactNode
}

/** Full webhook settings page shared by the mailbox (`/webhook`) and admin (`/console/mail-webhook`). */
export function WebhookSettingsPage({ queryKey, webhookApi, title, description, enableDescription }: WebhookSettingsPageProps) {
  const t = useT(messages)
  const query = useQuery({
    queryKey,
    queryFn: async () => ({ ...DEFAULT_SETTINGS, ...(await webhookApi.fetchSettings()) }),
  })

  if (query.isLoading) {
    return (
      <Page>
        <PageHeader title={title} description={description} />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </Page>
    )
  }

  if (query.isError || !query.data) {
    return (
      <Page>
        <PageHeader title={title} description={description} />
        <EmptyState
          icon={<WebhookIcon />}
          title={t('notEnabled')}
          description={query.error ? errorMessage(query.error) : undefined}
          className="rounded-xl border border-dashed"
        >
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? <Spinner /> : <RotateCwIcon />}
            {t('retry')}
          </Button>
        </EmptyState>
      </Page>
    )
  }

  return (
    <WebhookForm
      initial={query.data}
      queryKey={queryKey}
      webhookApi={webhookApi}
      title={title}
      description={description}
      enableDescription={enableDescription}
    />
  )
}

function WebhookForm({
  initial,
  queryKey,
  webhookApi,
  title,
  description,
  enableDescription,
}: Omit<WebhookSettingsPageProps, 'queryKey'> & { initial: WebhookSettings; queryKey: QueryKey }) {
  const t = useT(messages)
  const [settings, setSettings] = useState<WebhookSettings>(initial)
  const [saved, setSaved] = useState<WebhookSettings>(initial)
  const [filterValid, setFilterValid] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [checkOpen, setCheckOpen] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const savedFilter = saved.filter ?? null
  const headersInvalid = settings.enabled ? headersError(settings.headers) : ''
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved)

  const fields = useMemo(() => FILTER_FIELDS.map((value) => ({ value, label: t(`filter_${value}`) })), [t])
  const operators = useMemo<FilterOperator[]>(
    () => [
      ...(['equals', 'contains', 'startsWith', 'endsWith'] as const).flatMap((value) => [
        { value, label: t(`filter_${value}`) },
        { value: `${value}CaseSensitive`, label: `${t(`filter_${value}`)} (${t('filter_caseSensitive')})` },
      ]),
      { value: 'regex', label: t('filter_regex'), options: [{ key: 'flags', label: t('filter_flags'), placeholder: 'i / m / s' }] },
    ],
    [t],
  )

  const update = (patch: Partial<WebhookSettings>) => setSettings((s) => ({ ...s, ...patch }))
  const onFilterValidity = useCallback((valid: boolean) => setFilterValid(valid), [])

  const save = async () => {
    if (settings.enabled && !filterValid) return
    if (!settings.url) {
      toast.error(t('urlMissing'))
      return
    }
    // A hidden (disabled) editor must not persist its draft: keep the last saved filter.
    const payload: WebhookSettings = { ...settings, filter: settings.enabled ? settings.filter : savedFilter }
    setSaving(true)
    try {
      await webhookApi.saveSettings(payload)
      setSaved(payload)
      setSettings(payload)
      queryClient.setQueryData(queryKey, payload)
      toast.success(t('successTip'))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const runTest = async (mailId: number | undefined) => {
    if (!settings.url) {
      toast.error(t('urlMissing'))
      return false
    }
    try {
      await webhookApi.testSettings({ ...settings, ...(mailId !== undefined ? { mail_id: mailId } : {}) })
      toast.success(t('successTip'))
      return true
    } catch (error) {
      toast.error(errorMessage(error))
      return false
    }
  }

  const runCheck = async (mailId: number | undefined) => {
    if (!filterValid) return false
    try {
      const result = await webhookApi.checkFilter({
        filter: settings.filter,
        ...(mailId !== undefined ? { mail_id: mailId } : {}),
      })
      if (result?.matched) toast.success(t('filterMatched'))
      else toast.info(t('filterSkipped'))
      return true
    } catch (error) {
      toast.error(errorMessage(error))
      return false
    }
  }

  const applyPreset = (preset: Preset) => {
    update(preset.settings)
    toast.success(t('fillInDemoTip'), {
      action: { label: t('docs'), onClick: () => window.open(preset.doc, '_blank', 'noopener,noreferrer') },
    })
  }

  const insertVariable = (name: string) => {
    const token = `\${${name}}`
    const el = bodyRef.current
    const start = el?.selectionStart ?? settings.body.length
    const end = el?.selectionEnd ?? settings.body.length
    update({ body: settings.body.slice(0, start) + token + settings.body.slice(end) })
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <Page>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <LayoutTemplateIcon />
                  {t('presets')}
                  <ChevronDownIcon className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t('presets')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PRESETS.map((preset) => (
                  <DropdownMenuItem key={preset.name} onSelect={() => applyPreset(preset)}>
                    {preset.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {settings.enabled && (
              <Button variant="outline" onClick={() => setTestOpen(true)} disabled={!!headersInvalid}>
                <FlaskConicalIcon />
                {t('test')}
              </Button>
            )}
            <Button onClick={save} disabled={saving || (settings.enabled && (!filterValid || !!headersInvalid))}>
              {saving ? <Spinner /> : <SaveIcon />}
              {t('save')}
              {dirty && (
                <span className="size-1.5 rounded-full bg-current opacity-80" title={t('unsaved')}>
                  <span className="sr-only">{t('unsaved')}</span>
                </span>
              )}
            </Button>
          </>
        }
      />

      <Section>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="webhook-enabled">{t('enableTitle')}</FieldLabel>
            <FieldDescription>{settings.enabled ? enableDescription : t('disabledHint')}</FieldDescription>
          </FieldContent>
          <Switch id="webhook-enabled" checked={settings.enabled} onCheckedChange={(enabled) => update({ enabled })} />
        </Field>
      </Section>

      {settings.enabled && (
        <>
          <Section title={t('request')} description={t('requestDesc')}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
                <Field>
                  <FieldLabel htmlFor="webhook-url">URL</FieldLabel>
                  <Input
                    id="webhook-url"
                    type="url"
                    inputMode="url"
                    placeholder="https://example.com/webhook"
                    value={settings.url}
                    aria-invalid={!settings.url || undefined}
                    onChange={(e) => update({ url: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="webhook-method">{t('method')}</FieldLabel>
                  <Input
                    id="webhook-method"
                    list="webhook-methods"
                    className="font-mono uppercase"
                    value={settings.method}
                    onChange={(e) => update({ method: e.target.value.toUpperCase() })}
                  />
                  <datalist id="webhook-methods">
                    {['POST', 'PUT', 'PATCH'].map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </Field>
              </div>
              <Field data-invalid={!!headersInvalid || undefined}>
                <FieldLabel htmlFor="webhook-headers">{t('headers')}</FieldLabel>
                <Textarea
                  id="webhook-headers"
                  rows={4}
                  spellCheck={false}
                  className="font-mono text-xs"
                  value={settings.headers}
                  aria-invalid={!!headersInvalid || undefined}
                  onChange={(e) => update({ headers: e.target.value })}
                />
                {headersInvalid && <FieldError>{t('headersInvalid', { error: headersInvalid })}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="webhook-body">{t('body')}</FieldLabel>
                <Textarea
                  id="webhook-body"
                  ref={bodyRef}
                  rows={10}
                  spellCheck={false}
                  className="font-mono text-xs"
                  value={settings.body}
                  onChange={(e) => update({ body: e.target.value })}
                />
                <FieldDescription>{t('bodyHelp')}</FieldDescription>
                <div className="flex flex-wrap gap-1.5">
                  {BODY_VARIABLES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => insertVariable(name)}
                      className="rounded-md border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    >
                      {`\${${name}}`}
                    </button>
                  ))}
                </div>
              </Field>
            </FieldGroup>
          </Section>

          <Section
            title={t('filter')}
            description={t('filterHelp')}
            actions={
              <Button variant="outline" size="sm" disabled={!filterValid} onClick={() => setCheckOpen(true)}>
                <FilterIcon />
                <span className="hidden sm:inline">{t('checkFilter')}</span>
              </Button>
            }
          >
            <FilterEditor
              value={settings.filter}
              onChange={(filter) => update({ filter })}
              fields={fields}
              operators={operators}
              allowCustomFields
              isFieldAllowed={isFieldAllowed}
              onValidityChange={onFilterValidity}
            />
          </Section>
        </>
      )}

      <MailPickerDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        title={t('test')}
        description={t('testTip')}
        confirmText={t('test')}
        onConfirm={runTest}
      />
      <MailPickerDialog
        open={checkOpen}
        onOpenChange={setCheckOpen}
        title={t('checkFilter')}
        description={t('filterCheckTip')}
        confirmText={t('checkFilter')}
        disabled={!filterValid}
        onConfirm={runCheck}
      />
    </Page>
  )
}

/** Pick a random mail or a specific mail ID, then run `onConfirm`; closes when it resolves `true`. */
function MailPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  disabled,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText: string
  disabled?: boolean
  onConfirm: (mailId: number | undefined) => Promise<boolean>
}) {
  const t = useT(messages)
  const [mode, setMode] = useState<'random' | 'specified'>('random')
  const [mailIdText, setMailIdText] = useState('')
  const [busy, setBusy] = useState(false)
  const mailId = mailIdText.trim() ? Number(mailIdText.trim()) : NaN
  const mailIdValid = Number.isSafeInteger(mailId) && mailId > 0
  const radioId = useId()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || disabled) return
    if (mode === 'specified' && !mailIdValid) {
      toast.error(t('invalidMailId'))
      return
    }
    setBusy(true)
    try {
      if (await onConfirm(mode === 'specified' ? mailId : undefined)) onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as typeof mode)}
            disabled={busy}
            className="grid grid-cols-2 gap-2"
          >
            {(['random', 'specified'] as const).map((value) => (
              <Label
                key={value}
                htmlFor={`${radioId}-${value}`}
                className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
              >
                <RadioGroupItem id={`${radioId}-${value}`} value={value} />
                {t(value === 'random' ? 'randomMail' : 'specifiedMail')}
              </Label>
            ))}
          </RadioGroup>
          {mode === 'specified' && (
            <Field data-invalid={(!!mailIdText && !mailIdValid) || undefined}>
              <FieldLabel htmlFor={`${radioId}-mail-id`}>{t('mailId')}</FieldLabel>
              <Input
                id={`${radioId}-mail-id`}
                inputMode="numeric"
                autoFocus
                placeholder={t('mailId')}
                value={mailIdText}
                disabled={busy}
                aria-invalid={(!!mailIdText && !mailIdValid) || undefined}
                onChange={(e) => setMailIdText(e.target.value)}
              />
              {!!mailIdText && !mailIdValid && <FieldError>{t('invalidMailId')}</FieldError>}
            </Field>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={busy || disabled}>
              {busy && <Spinner />}
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
