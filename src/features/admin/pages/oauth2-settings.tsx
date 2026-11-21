import { useId, useState } from 'react'
import { ChevronRightIcon, InfoIcon, KeyRoundIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Page, PageHeader } from '@/components/common/page'
import { EmptyState } from '@/components/common/empty-state'
import { CopyButton } from '@/components/common/copy-button'
import { PasswordInput } from '@/components/common/password-input'
import { confirm } from '@/components/common/confirm'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { sanitizeHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import { defineMessages, useT, type TFunction } from '@/i18n'
import { SaveBar, SaveButton } from '../components/settings/save-bar'
import { LoadError, SettingsSkeleton } from '../components/settings/settings-states'
import { StringListInput } from '../components/settings/string-list-input'
import { SwitchField } from '../components/settings/switch-field'
import { useSettingsDraft } from '../components/settings/use-settings-draft'

const messages = defineMessages({
  zh: {
    title: 'OAuth2 登录',
    description: '配置用户中心的第三方 OAuth2 登录提供方。',
    tip: '第三方登录会自动使用用户邮箱注册账号(邮箱相同将视为同一账号), 此账号和注册的账号相同, 也可以通过忘记密码设置密码',
    addOauth2: '添加 Oauth2',
    addOauth2Desc: '选择模板会预填常用的端点地址，之后仍可修改。',
    oauth2Type: 'Oauth2 类型',
    name: '名称',
    untitled: '未命名',
    icon: '图标 (SVG, 请确保来源可信)',
    iconPreview: '预览',
    enableEmailFormat: '启用邮箱格式转换',
    userEmailFormat: '邮箱正则表达式',
    userEmailFormatTip: '使用正则转换邮箱。示例: ^(.+)@old\\.com$ 配合 $1@new.com',
    userEmailReplace: '替换模板',
    userEmailKeyDesc: '支持 JSONPATH，如 $[0].email',
    redirectURLDesc: '在 OAuth2 提供方处填写此回调地址。',
    enableMailAllowList: '启用邮件地址白名单',
    enableMailAllowListDesc: '仅允许以下域名的邮箱登录，可手动输入, 回车增加。',
    mailAllowList: '邮件地址白名单',
    providerGroup: '提供方',
    endpointGroup: 'OAuth2 端点',
    emailGroup: '用户邮箱',
    noProviders: '暂无 OAuth2 提供方',
    noProvidersDesc: '添加 GitHub、Linux Do、Authentik 或自定义提供方。',
    missingFields: '缺少必填项',
    missingFieldsToast: '{name} 缺少必填项',
    missingAllowList: '{name} 缺少邮件地址白名单',
    deleteConfirm: '删除提供方“{name}”？',
    deleteConfirmDesc: '保存后生效。',
    custom: '自定义',
  },
  en: {
    title: 'OAuth2 login',
    description: 'Configure third-party OAuth2 login providers for the user center.',
    tip: "Third-party login will automatically use the user's email to register an account (the same email will be regarded as the same account), this account is the same as the registered account, and you can also set the password through the forget password",
    addOauth2: 'Add Oauth2',
    addOauth2Desc: 'Templates pre-fill the usual endpoints; you can still edit them afterwards.',
    oauth2Type: 'Oauth2 Type',
    name: 'Name',
    untitled: 'Untitled',
    icon: 'Icon (SVG, please ensure trusted source)',
    iconPreview: 'Preview',
    enableEmailFormat: 'Enable Email Format',
    userEmailFormat: 'Email Regex Pattern',
    userEmailFormatTip: 'Use regex to transform email. Example: ^(.+)@old\\.com$ with $1@new.com',
    userEmailReplace: 'Replace Template',
    userEmailKeyDesc: 'Supports JSONPATH like $[0].email',
    redirectURLDesc: 'Register this callback URL with the OAuth2 provider.',
    enableMailAllowList: 'Enable Mail Address Allow List',
    enableMailAllowListDesc: 'Only emails from these domains can log in (manually enterable).',
    mailAllowList: 'Mail Address Allow List',
    providerGroup: 'Provider',
    endpointGroup: 'OAuth2 endpoints',
    emailGroup: 'User email',
    noProviders: 'No OAuth2 providers',
    noProvidersDesc: 'Add GitHub, Linux Do, Authentik or a custom provider.',
    missingFields: 'Missing required fields',
    missingFieldsToast: '{name} is missing required fields',
    missingAllowList: '{name} is missing mail allow list',
    deleteConfirm: 'Delete provider "{name}"?',
    deleteConfirmDesc: 'Takes effect after saving.',
    custom: 'Custom',
  },
})

type T = TFunction<Extract<keyof typeof messages.zh, string>>

/** Mirrors `UserOauth2Settings` in the worker models. */
type Oauth2Provider = {
  name: string
  icon?: string
  clientID: string
  clientSecret: string
  authorizationURL: string
  accessTokenURL: string
  accessTokenFormat?: string
  userInfoURL: string
  redirectURL: string
  logoutURL?: string
  userEmailKey: string
  enableEmailFormat?: boolean
  userEmailFormat?: string
  userEmailReplace?: string
  scope: string
  enableMailAllowList?: boolean
  mailAllowList?: string[]
}

type TemplateKey = 'github' | 'linuxdo' | 'authentik' | 'custom'

const COMMON_MAIL = ['gmail.com', '163.com', '126.com', 'qq.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'yahoo.com', 'foxmail.com']

const OAUTH2_ICONS: Record<Exclude<TemplateKey, 'custom'>, string> = {
  github:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>',
  linuxdo:
    '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"><g><path d="m7.44,0s.09,0,.13,0c.09,0,.19,0,.28,0,.14,0,.29,0,.43,0,.09,0,.18,0,.27,0q.12,0,.25,0t.26.08c.15.03.29.06.44.08,1.97.38,3.78,1.47,4.95,3.11.04.06.09.12.13.18.67.96,1.15,2.11,1.3,3.28q0,.19.09.26c0,.15,0,.29,0,.44,0,.04,0,.09,0,.13,0,.09,0,.19,0,.28,0,.14,0,.29,0,.43,0,.09,0,.18,0,.27,0,.08,0,.17,0,.25q0,.19-.08.26c-.03.15-.06.29-.08.44-.38,1.97-1.47,3.78-3.11,4.95-.06.04-.12.09-.18.13-.96.67-2.11,1.15-3.28,1.3q-.19,0-.26.09c-.15,0-.29,0-.44,0-.04,0-.09,0-.13,0-.09,0-.19,0-.28,0-.14,0-.29,0-.43,0-.09,0-.18,0-.27,0-.08,0-.17,0-.25,0q-.19,0-.26-.08c-.15-.03-.29-.06-.44-.08-1.97-.38-3.78-1.47-4.95-3.11q-.07-.09-.13-.18c-.67-.96-1.15-2.11-1.3-3.28q0-.19-.09-.26c0-.15,0-.29,0-.44,0-.04,0-.09,0-.13,0-.09,0-.19,0-.28,0-.14,0-.29,0-.43,0-.09,0-.18,0-.27,0-.08,0-.17,0-.25q0-.19.08-.26c.03-.15.06-.29.08-.44.38-1.97,1.47-3.78,3.11-4.95.06-.04.12-.09.18-.13C4.42.73,5.57.26,6.74.1,7,.07,7.15,0,7.44,0Z" fill="#EFEFEF"/><path d="m1.27,11.33h13.45c-.94,1.89-2.51,3.21-4.51,3.88-1.99.59-3.96.37-5.8-.57-1.25-.7-2.67-1.9-3.14-3.3Z" fill="#FEB005"/><path d="m12.54,1.99c.87.7,1.82,1.59,2.18,2.68H1.27c.87-1.74,2.33-3.13,4.2-3.78,2.44-.79,5-.47,7.07,1.1Z" fill="#1D1D1F"/></g></svg>',
  authentik:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.83-3.23 9.36-7 10.57-3.77-1.21-7-5.74-7-10.57V6.3l7-3.12zM11 7v6h2V7h-2zm0 8v2h2v-2h-2z"/></svg>',
}

const TEMPLATES: Record<TemplateKey, Partial<Oauth2Provider>> = {
  github: {
    authorizationURL: 'https://github.com/login/oauth/authorize',
    accessTokenURL: 'https://github.com/login/oauth/access_token',
    accessTokenFormat: 'json',
    userInfoURL: 'https://api.github.com/user',
    userEmailKey: 'email',
    scope: 'user:email',
    icon: OAUTH2_ICONS.github,
  },
  linuxdo: {
    authorizationURL: 'https://connect.linux.do/oauth2/authorize',
    accessTokenURL: 'https://connect.linux.do/oauth2/token',
    accessTokenFormat: 'urlencoded',
    userInfoURL: 'https://connect.linux.do/api/user',
    userEmailKey: 'id',
    scope: 'user',
    enableEmailFormat: true,
    userEmailFormat: '^(.+)$',
    userEmailReplace: 'linux_do_$1@oauth.linux.do',
    icon: OAUTH2_ICONS.linuxdo,
  },
  authentik: {
    authorizationURL: 'https://youdomain/application/o/authorize/',
    accessTokenURL: 'https://youdomain/application/o/token/',
    accessTokenFormat: 'urlencoded',
    userInfoURL: 'https://youdomain/application/o/userinfo/',
    userEmailKey: 'email',
    scope: 'email openid',
    icon: OAUTH2_ICONS.authentik,
  },
  custom: {},
}

const TEMPLATE_OPTIONS: { value: TemplateKey; label: string }[] = [
  { value: 'github', label: 'Github' },
  { value: 'linuxdo', label: 'Linux Do' },
  { value: 'authentik', label: 'Authentik' },
  { value: 'custom', label: 'Custom' },
]

const REQUIRED_FIELDS = [
  'name',
  'clientID',
  'clientSecret',
  'authorizationURL',
  'accessTokenURL',
  'accessTokenFormat',
  'userInfoURL',
  'redirectURL',
  'userEmailKey',
  'scope',
] as const satisfies readonly (keyof Oauth2Provider)[]

const isMissing = (p: Oauth2Provider, key: (typeof REQUIRED_FIELDS)[number]) => !p[key]
const hasMissingFields = (p: Oauth2Provider) => REQUIRED_FIELDS.some((key) => isMissing(p, key))
const missingAllowList = (p: Oauth2Provider) => !!p.enableMailAllowList && (p.mailAllowList?.length || 0) < 1

const createProvider = (name: string, type: TemplateKey): Oauth2Provider => ({
  name,
  icon: '',
  clientID: '',
  clientSecret: '',
  authorizationURL: '',
  accessTokenURL: '',
  accessTokenFormat: '',
  userInfoURL: '',
  userEmailKey: '',
  redirectURL: `${window.location.origin}/user/oauth2/callback`,
  logoutURL: '',
  scope: '',
  enableEmailFormat: false,
  userEmailFormat: '',
  userEmailReplace: '',
  enableMailAllowList: false,
  mailAllowList: COMMON_MAIL,
  ...TEMPLATES[type],
})

async function loadProviders(): Promise<Oauth2Provider[]> {
  const res = await api.get<Oauth2Provider[] | null>('/admin/user_oauth2_settings')
  return Array.isArray(res) ? res : []
}

function SvgIcon({ svg, className }: { svg?: string; className?: string }) {
  const html = svg ? sanitizeHtml(svg) : ''
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md border bg-background p-1.5 text-foreground [&_svg]:size-full',
        className,
      )}
      aria-hidden
    >
      {html ? <span className="contents" dangerouslySetInnerHTML={{ __html: html }} /> : <KeyRoundIcon className="text-muted-foreground" />}
    </span>
  )
}

export default function Oauth2SettingsPage() {
  const t = useT(messages)
  const settings = useSettingsDraft({ queryKey: ['admin', 'oauth2-settings'], queryFn: loadProviders })
  const { draft, setDraft, dirty } = settings
  const [saving, setSaving] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [showErrors, setShowErrors] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const updateProvider = (index: number, patch: Partial<Oauth2Provider>) =>
    setDraft((d) => d?.map((p, i) => (i === index ? { ...p, ...patch } : p)))

  const removeProvider = async (index: number) => {
    const name = draft?.[index]?.name || t('untitled')
    if (!(await confirm({ title: t('deleteConfirm', { name }), description: t('deleteConfirmDesc'), destructive: true, confirmText: t('delete') }))) return
    setDraft((d) => d?.filter((_, i) => i !== index))
    setOpenIndex((open) => (open === null || open === index ? null : open > index ? open - 1 : open))
  }

  const addProvider = (name: string, type: TemplateKey) => {
    const next = [...(draft ?? []), createProvider(name, type)]
    setDraft(next)
    setOpenIndex(next.length - 1)
    setAddOpen(false)
  }

  const save = async () => {
    if (!draft) return
    const invalidIndex = draft.findIndex((p) => hasMissingFields(p) || missingAllowList(p))
    if (invalidIndex >= 0) {
      const provider = draft[invalidIndex]
      const name = provider.name || t('untitled')
      toast.error(hasMissingFields(provider) ? t('missingFieldsToast', { name }) : t('missingAllowList', { name }))
      setShowErrors(true)
      setOpenIndex(invalidIndex)
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/user_oauth2_settings', draft)
      toast.success(t('saved'))
      setShowErrors(false)
      await settings.refetch()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          draft && (
            <>
              <Button variant="outline" onClick={() => setAddOpen(true)}>
                <PlusIcon />
                {t('addOauth2')}
              </Button>
              <SaveButton dirty={dirty} saving={saving} onSave={save} />
            </>
          )
        }
      />
      {!draft ? (
        settings.error ? (
          <LoadError error={settings.error} onRetry={() => settings.refetch()} />
        ) : (
          <SettingsSkeleton sections={1} rows={4} />
        )
      ) : (
        <>
          <Alert>
            <InfoIcon />
            <AlertDescription>{t('tip')}</AlertDescription>
          </Alert>
          {draft.length === 0 ? (
            <div className="rounded-xl border border-dashed">
              <EmptyState icon={<KeyRoundIcon />} title={t('noProviders')} description={t('noProvidersDesc')}>
                <Button onClick={() => setAddOpen(true)}>
                  <PlusIcon />
                  {t('addOauth2')}
                </Button>
              </EmptyState>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {draft.map((provider, index) => (
                <ProviderCard
                  key={index}
                  t={t}
                  provider={provider}
                  open={openIndex === index}
                  showErrors={showErrors}
                  onOpenChange={(open) => setOpenIndex(open ? index : null)}
                  onChange={(patch) => updateProvider(index, patch)}
                  onRemove={() => removeProvider(index)}
                />
              ))}
            </div>
          )}
          <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={settings.reset} />
        </>
      )}
      <AddProviderDialog t={t} open={addOpen} onOpenChange={setAddOpen} onAdd={addProvider} />
    </Page>
  )
}

function ProviderCard({
  t,
  provider,
  open,
  showErrors,
  onOpenChange,
  onChange,
  onRemove,
}: {
  t: T
  provider: Oauth2Provider
  open: boolean
  showErrors: boolean
  onOpenChange: (open: boolean) => void
  onChange: (patch: Partial<Oauth2Provider>) => void
  onRemove: () => void
}) {
  const id = useId()
  const invalid = hasMissingFields(provider) || missingAllowList(provider)
  const fieldInvalid = (key: (typeof REQUIRED_FIELDS)[number]) => showErrors && isMissing(provider, key)

  const textField = (key: Exclude<(typeof REQUIRED_FIELDS)[number], 'accessTokenFormat' | 'clientSecret'>, label: string, description?: string) => (
    <Field data-invalid={fieldInvalid(key) || undefined}>
      <FieldLabel htmlFor={`${id}-${key}`}>
        {label}
        <span className="text-destructive">*</span>
      </FieldLabel>
      <Input
        id={`${id}-${key}`}
        value={provider[key] ?? ''}
        aria-invalid={fieldInvalid(key) || undefined}
        onChange={(e) => onChange({ [key]: e.target.value })}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="rounded-xl border bg-card text-card-foreground">
      <div className="flex items-center gap-2 p-3 pr-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronRightIcon className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
            <SvgIcon svg={provider.icon} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{provider.name || t('untitled')}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {provider.authorizationURL || provider.clientID || '—'}
              </span>
            </span>
            {invalid && (
              <Badge variant="destructive" className="hidden sm:inline-flex">
                {t('missingFields')}
              </Badge>
            )}
            {provider.accessTokenFormat && (
              <Badge variant="outline" className="hidden font-mono md:inline-flex">
                {provider.accessTokenFormat}
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
          aria-label={t('delete')}
        >
          <Trash2Icon />
        </Button>
      </div>
      <CollapsibleContent>
        <FieldGroup className="border-t p-4">
          <FieldSet>
            <FieldLegend variant="label">{t('providerGroup')}</FieldLegend>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              {textField('name', t('name'))}
              <Field className="md:w-auto">
                <FieldLabel>{t('iconPreview')}</FieldLabel>
                <SvgIcon svg={provider.icon} className="size-8" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${id}-icon`}>{t('icon')}</FieldLabel>
              <Textarea
                id={`${id}-icon`}
                rows={3}
                className="max-h-40 font-mono text-xs break-all"
                placeholder="<svg ...>...</svg>"
                value={provider.icon ?? ''}
                onChange={(e) => onChange({ icon: e.target.value })}
              />
            </Field>
          </FieldSet>

          <FieldSeparator />

          <FieldSet>
            <FieldLegend variant="label">{t('endpointGroup')}</FieldLegend>
            <div className="grid gap-4 md:grid-cols-2">
              {textField('clientID', 'Client ID')}
              <Field data-invalid={fieldInvalid('clientSecret') || undefined}>
                <FieldLabel htmlFor={`${id}-clientSecret`}>
                  Client Secret<span className="text-destructive">*</span>
                </FieldLabel>
                <PasswordInput
                  id={`${id}-clientSecret`}
                  autoComplete="off"
                  value={provider.clientSecret ?? ''}
                  aria-invalid={fieldInvalid('clientSecret') || undefined}
                  onChange={(e) => onChange({ clientSecret: e.target.value })}
                />
              </Field>
              {textField('authorizationURL', 'Authorization URL')}
              {textField('accessTokenURL', 'Access Token URL')}
              <Field data-invalid={fieldInvalid('accessTokenFormat') || undefined}>
                <FieldLabel htmlFor={`${id}-accessTokenFormat`}>
                  Access Token Params Format<span className="text-destructive">*</span>
                </FieldLabel>
                <Select value={provider.accessTokenFormat || undefined} onValueChange={(accessTokenFormat) => onChange({ accessTokenFormat })}>
                  <SelectTrigger
                    id={`${id}-accessTokenFormat`}
                    className="w-full"
                    aria-invalid={fieldInvalid('accessTokenFormat') || undefined}
                  >
                    <SelectValue placeholder="json / urlencoded" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">json</SelectItem>
                    <SelectItem value="urlencoded">urlencoded</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {textField('userInfoURL', 'User Info URL')}
              {textField('scope', 'Scope')}
            </div>
            <Field data-invalid={fieldInvalid('redirectURL') || undefined}>
              <FieldLabel htmlFor={`${id}-redirectURL`}>
                Redirect URL<span className="text-destructive">*</span>
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id={`${id}-redirectURL`}
                  value={provider.redirectURL ?? ''}
                  aria-invalid={fieldInvalid('redirectURL') || undefined}
                  onChange={(e) => onChange({ redirectURL: e.target.value })}
                />
                {provider.redirectURL && (
                  <InputGroupAddon align="inline-end">
                    <CopyButton value={provider.redirectURL} size="icon-xs" />
                  </InputGroupAddon>
                )}
              </InputGroup>
              <FieldDescription>{t('redirectURLDesc')}</FieldDescription>
            </Field>
          </FieldSet>

          <FieldSeparator />

          <FieldSet>
            <FieldLegend variant="label">{t('emailGroup')}</FieldLegend>
            {textField('userEmailKey', 'User Email Key', t('userEmailKeyDesc'))}
            <SwitchField
              label={t('enableEmailFormat')}
              description={t('userEmailFormatTip')}
              checked={!!provider.enableEmailFormat}
              onCheckedChange={(enableEmailFormat) => onChange({ enableEmailFormat })}
            />
            {provider.enableEmailFormat && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${id}-userEmailFormat`}>{t('userEmailFormat')}</FieldLabel>
                  <Input
                    id={`${id}-userEmailFormat`}
                    className="font-mono"
                    placeholder="^(.+)@old\.com$"
                    value={provider.userEmailFormat ?? ''}
                    onChange={(e) => onChange({ userEmailFormat: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-userEmailReplace`}>{t('userEmailReplace')}</FieldLabel>
                  <Input
                    id={`${id}-userEmailReplace`}
                    className="font-mono"
                    placeholder="$1@new.com"
                    value={provider.userEmailReplace ?? ''}
                    onChange={(e) => onChange({ userEmailReplace: e.target.value })}
                  />
                </Field>
              </div>
            )}
            <SwitchField
              label={t('enableMailAllowList')}
              description={t('enableMailAllowListDesc')}
              checked={!!provider.enableMailAllowList}
              onCheckedChange={(enableMailAllowList) => onChange({ enableMailAllowList })}
            />
            {provider.enableMailAllowList && (
              <Field data-invalid={(showErrors && missingAllowList(provider)) || undefined}>
                <FieldLabel htmlFor={`${id}-mailAllowList`}>{t('mailAllowList')}</FieldLabel>
                <StringListInput
                  id={`${id}-mailAllowList`}
                  value={provider.mailAllowList ?? []}
                  onChange={(mailAllowList) => onChange({ mailAllowList })}
                  suggestions={COMMON_MAIL}
                  placeholder={t('mailAllowList')}
                  aria-invalid={(showErrors && missingAllowList(provider)) || undefined}
                />
              </Field>
            )}
          </FieldSet>
        </FieldGroup>
      </CollapsibleContent>
    </Collapsible>
  )
}

function AddProviderDialog({
  t,
  open,
  onOpenChange,
  onAdd,
}: {
  t: T
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string, type: TemplateKey) => void
}) {
  const id = useId()
  const [name, setName] = useState('')
  const [type, setType] = useState<TemplateKey>('custom')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim(), type)
    setName('')
    setType('custom')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('addOauth2')}</DialogTitle>
            <DialogDescription>{t('addOauth2Desc')}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-name`}>{t('name')}</FieldLabel>
              <Input id={`${id}-name`} value={name} autoFocus onChange={(e) => setName(e.target.value)} />
            </Field>
            <FieldSet>
              <FieldLegend variant="label">{t('oauth2Type')}</FieldLegend>
              <RadioGroup value={type} onValueChange={(v) => setType(v as TemplateKey)} className="grid grid-cols-2 gap-2">
                {TEMPLATE_OPTIONS.map((option) => (
                  <FieldLabel key={option.value} htmlFor={`${id}-${option.value}`}>
                    {/* Title-only cards: center icon, name and radio (the default top-aligns rows with content) */}
                    <Field orientation="horizontal" className="has-[>[data-slot=field-content]]:items-center">
                      {option.value === 'custom' ? (
                        <SvgIcon />
                      ) : (
                        <SvgIcon svg={OAUTH2_ICONS[option.value]} />
                      )}
                      <FieldContent>
                        <FieldTitle>{option.value === 'custom' ? t('custom') : option.label}</FieldTitle>
                      </FieldContent>
                      <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            </FieldSet>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              <PlusIcon />
              {t('addOauth2')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
