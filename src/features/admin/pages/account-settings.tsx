import { useId, useState } from 'react'
import { ForwardIcon, InfoIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
  FieldLegend,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Page, PageHeader, Section } from '@/components/common/page'
import { EmptyState } from '@/components/common/empty-state'
import { confirm } from '@/components/common/confirm'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { useApp } from '@/store/app'
import { defineMessages, useT, type TFunction } from '@/i18n'
import { NumberInput } from '../components/settings/number-input'
import { SaveBar, SaveButton } from '../components/settings/save-bar'
import { LoadError, SettingsSkeleton } from '../components/settings/settings-states'
import { StringListInput } from '../components/settings/string-list-input'
import { SwitchField } from '../components/settings/switch-field'
import { useSettingsDraft } from '../components/settings/use-settings-draft'

const messages = defineMessages({
  zh: {
    title: '邮箱设置',
    description: '地址屏蔽规则、发信限制、地址创建规则与邮件转发规则。',
    blockingSection: '屏蔽与收信',
    blockingSectionDesc: '限制可创建的地址与可接收的发件人。',
    sendingSection: '发信',
    sendingSectionDesc: '发信收件人限制、免余额地址与全局发信额度。',
    creationSection: '创建地址',
    forwardingSection: '邮件转发配置',
    forwardingSectionDesc: '按域名、来源地址与收件人地址将邮件转发到已验证的地址。',
    address_block_list: '邮件地址屏蔽关键词',
    address_block_list_desc: '包含这些关键词的地址无法被创建（管理员可跳过检查）。',
    address_block_list_placeholder: '请输入您想要屏蔽的关键词',
    fromBlockList: '接收邮件地址屏蔽关键词',
    fromBlockList_desc: '发件人包含这些关键词的邮件将被拒收，需要绑定 KV。受后端限制，清空列表后保存不会生效，请至少保留一项。',
    block_receive_unknow_address_email: '禁止接收未知地址邮件',
    block_receive_unknow_address_email_desc: '收件地址不存在于系统中时直接拒收。',
    send_address_block_list: '发送邮件地址屏蔽关键词',
    send_address_block_list_desc: '收件人包含这些关键词时禁止发送。',
    verified_address_list: '已验证地址列表',
    verified_address_list_desc: '可通过 cf 内部 api 发送邮件，需要绑定 SEND_MAIL。',
    noLimitSendAddressList: '无余额限制发送地址列表',
    noLimitSendAddressList_desc: '这些地址发信不消耗余额。',
    send_mail_limit: '发信额度',
    send_mail_limit_tip: '对全部发信渠道生效。-1 表示无限，0 表示禁止发送。',
    send_mail_daily_limit: '每日额度',
    send_mail_monthly_limit: '每月额度',
    send_mail_daily_limit_invalid: '每日额度必须是大于等于 -1 的整数',
    send_mail_monthly_limit_invalid: '每月额度必须是大于等于 -1 的整数',
    create_address_subdomain_match: '创建邮箱时允许子域名后缀匹配',
    create_address_subdomain_match_follow_env: '跟随环境变量',
    create_address_subdomain_match_force_enable: '强制开启',
    create_address_subdomain_match_force_disable: '强制关闭',
    create_address_subdomain_match_follow_env_note:
      '选择“跟随环境变量”会清空后台覆盖，恢复为未设置状态；最终是否开启仍由 Worker env 和优先级规则决定。',
    create_address_subdomain_match_force_enable_note: '允许 API 在已授权基础域名下指定子域名。',
    create_address_subdomain_match_force_disable_note: '只允许完全匹配已配置的域名。',
    create_address_subdomain_match_tip:
      '仅影响 /api/new_address 和 /admin/new_address 的域名校验。例如开启后，foo.example.com 可以匹配已配置的基础域名 example.com。',
    create_address_subdomain_match_note:
      'RANDOM_SUBDOMAIN_DOMAINS 已允许在所列基础域名下随机生成或手动输入子域名；此开关额外允许 API 在其他已授权基础域名下指定子域名。',
    create_address_subdomain_match_env_locked:
      '当前 Worker 环境变量 ENABLE_CREATE_ADDRESS_SUBDOMAIN_MATCH 为 false。后台开关仍可保存，但在 env 打开或移除前不会生效。',
    envValue: '环境变量',
    envNotSet: '未设置',
    effectiveStatus: '当前生效',
    on: '开启',
    off: '关闭',
    forwarding_rule_warning: '每条规则独立运行，转发地址需要为已验证的地址。',
    source_patterns_tip:
      '域名、来源正则和收件人正则需同时满足，留空则跳过该条件。正则不区分大小写，匹配完整的信封地址，而非邮件头。',
    addRule: '添加规则',
    noRules: '暂无转发规则',
    noRulesDesc: '添加规则后，符合条件的邮件会被转发到指定地址。',
    rule_index: '规则',
    domain_list: '域名列表（可选）',
    domain_list_desc: '留空表示所有域名。',
    select_domain: '选择域名',
    forward_address: '转发地址',
    forward_address_required: '转发地址不能为空',
    source_patterns: '来源地址正则（可选）',
    source_patterns_placeholder: '例如: gmail.com',
    recipient_patterns: '收件人地址正则（可选）',
    recipient_patterns_placeholder: '例如: admin',
    source_match_mode: '匹配模式',
    match_any: '任一',
    match_all: '全部',
    delete_original: '转发成功后删除原邮件',
    delete_rule: '删除',
    delete_rule_confirm: '确定要删除这条规则吗？',
    regex_invalid: '无效的正则表达式',
    regex_too_long: '正则表达式过长（最大200字符）',
  },
  en: {
    title: 'Mailbox settings',
    description: 'Address block rules, sending limits, address creation rules and mail forwarding rules.',
    blockingSection: 'Blocking & receiving',
    blockingSectionDesc: 'Restrict which addresses can be created and which senders are accepted.',
    sendingSection: 'Sending',
    sendingSectionDesc: 'Recipient restrictions, balance-free senders and global send limits.',
    creationSection: 'Address creation',
    forwardingSection: 'Email Forwarding Configuration',
    forwardingSectionDesc: 'Forward mail to verified addresses by domain, sender and recipient.',
    address_block_list: 'Address Block Keywords for Users',
    address_block_list_desc: 'Addresses containing these keywords cannot be created (admin can skip).',
    address_block_list_placeholder: 'Please enter the keywords you want to block',
    fromBlockList: 'Block Keywords for receive email',
    fromBlockList_desc: 'Mail from senders containing these keywords is rejected. Requires a KV binding. Due to a backend limitation, saving an empty list has no effect; keep at least one entry.',
    block_receive_unknow_address_email: 'Block receive unknow address email',
    block_receive_unknow_address_email_desc: 'Reject mail whose recipient address does not exist in the system.',
    send_address_block_list: 'Address Block Keywords for send email',
    send_address_block_list_desc: 'Sending is refused when the recipient contains one of these keywords.',
    verified_address_list: 'Verified Address List',
    verified_address_list_desc: 'Can send email by cf internal api. Requires the SEND_MAIL binding.',
    noLimitSendAddressList: 'No Balance Limit Send Address List',
    noLimitSendAddressList_desc: 'These addresses can send without consuming balance.',
    send_mail_limit: 'Send Mail Limit',
    send_mail_limit_tip: 'This applies to all send channels. Use -1 for unlimited and 0 to block sending.',
    send_mail_daily_limit: 'Daily Limit',
    send_mail_monthly_limit: 'Monthly Limit',
    send_mail_daily_limit_invalid: 'Daily limit must be an integer greater than or equal to -1',
    send_mail_monthly_limit_invalid: 'Monthly limit must be an integer greater than or equal to -1',
    create_address_subdomain_match: 'Allow Subdomain Suffix Match When Creating Address',
    create_address_subdomain_match_follow_env: 'Follow Environment Variable',
    create_address_subdomain_match_force_enable: 'Force Enable',
    create_address_subdomain_match_force_disable: 'Force Disable',
    create_address_subdomain_match_follow_env_note:
      'Choosing "Follow Environment Variable" clears the admin override and returns to the unset state. The effective result is still controlled by the Worker env and the precedence rules.',
    create_address_subdomain_match_force_enable_note: 'Allow API callers to specify subdomains under allowed base domains.',
    create_address_subdomain_match_force_disable_note: 'Only exact matches of configured domains are accepted.',
    create_address_subdomain_match_tip:
      'Only affects /api/new_address and /admin/new_address domain validation. Example: when enabled, foo.example.com can match configured base domain example.com.',
    create_address_subdomain_match_note:
      'RANDOM_SUBDOMAIN_DOMAINS already allows random or manual subdomains for listed base domains. This switch additionally allows API callers to specify subdomains under other allowed base domains.',
    create_address_subdomain_match_env_locked:
      'Worker env ENABLE_CREATE_ADDRESS_SUBDOMAIN_MATCH is currently false. The saved admin switch can be modified, but it will not take effect until env is enabled or removed.',
    envValue: 'Environment',
    envNotSet: 'Not set',
    effectiveStatus: 'Effective',
    on: 'On',
    off: 'Off',
    forwarding_rule_warning: 'Each rule will run independently. Forward address needs to be a verified address.',
    source_patterns_tip:
      'Domain, sender regex and recipient regex filters must all match. Empty filters are ignored. Regex matching is case-insensitive and uses the full envelope address, not the message headers.',
    addRule: 'Add rule',
    noRules: 'No forwarding rules',
    noRulesDesc: 'Mail matching a rule will be forwarded to its address.',
    rule_index: 'Rule',
    domain_list: 'Domain List (Optional)',
    domain_list_desc: 'Leave empty to match all domains.',
    select_domain: 'Select Domain',
    forward_address: 'Forward Address',
    forward_address_required: 'Forward address is required',
    source_patterns: 'Source Address Regex (Optional)',
    source_patterns_placeholder: 'e.g. gmail.com',
    recipient_patterns: 'Recipient Address Regex (Optional)',
    recipient_patterns_placeholder: 'e.g. admin',
    source_match_mode: 'Match Mode',
    match_any: 'Any',
    match_all: 'All',
    delete_original: 'Delete original after forwarding',
    delete_rule: 'Delete',
    delete_rule_confirm: 'Are you sure you want to delete this rule?',
    regex_invalid: 'Invalid regex pattern',
    regex_too_long: 'Regex pattern too long (max 200 characters)',
  },
})

type T = TFunction<Extract<keyof typeof messages.zh, string>>

type MatchMode = 'any' | 'all'

type ForwardRule = {
  domains: string[]
  forward: string
  deleteOriginal: boolean
  sourcePatterns: string[]
  sourceMatchMode: MatchMode
  recipientPatterns: string[]
  recipientMatchMode: MatchMode
}

type SubdomainMode = 'follow_env' | 'force_enable' | 'force_disable'

type SubdomainStatus = {
  envConfigured: boolean
  envEnabled: boolean
  storedEnabled: boolean | undefined
  effectiveEnabled: boolean
}

type AccountSettings = {
  blockList: string[]
  sendBlockList: string[]
  noLimitSendAddressList: string[]
  verifiedAddressList: string[]
  fromBlockList: string[]
  blockReceiveUnknowAddressEmail: boolean
  emailForwardingList: ForwardRule[]
  subdomainMode: SubdomainMode
  /** Read-only, from the server. */
  subdomainStatus: SubdomainStatus
  dailyEnabled: boolean
  dailyLimit: number | null
  monthlyEnabled: boolean
  monthlyLimit: number | null
}

type RawRule = {
  domains?: string[] | null
  forward?: string
  deleteOriginal?: boolean
  sourcePatterns?: string[] | null
  sourceMatchMode?: MatchMode
  recipientPatterns?: string[] | null
  recipientMatchMode?: MatchMode
}

type RawAccountSettings = {
  blockList?: string[]
  sendBlockList?: string[]
  verifiedAddressList?: string[]
  fromBlockList?: string[] | null
  noLimitSendAddressList?: string[]
  emailRuleSettings?: { blockReceiveUnknowAddressEmail?: boolean; emailForwardingList?: RawRule[] }
  addressCreationSubdomainMatchStatus?: Partial<SubdomainStatus>
  sendMailLimitConfig?: { dailyEnabled: boolean; monthlyEnabled: boolean; dailyLimit: number | null; monthlyLimit: number | null } | null
}

const DEFAULT_SEND_MAIL_DAILY_LIMIT = 100
const DEFAULT_SEND_MAIL_MONTHLY_LIMIT = 3000
const MAX_REGEX_LENGTH = 200

const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [])

const normalizeRule = (rule: RawRule): ForwardRule => ({
  ...rule,
  domains: list(rule.domains),
  forward: rule.forward ?? '',
  deleteOriginal: rule.deleteOriginal === true,
  sourcePatterns: list(rule.sourcePatterns),
  sourceMatchMode: rule.sourceMatchMode === 'all' ? 'all' : 'any',
  recipientPatterns: list(rule.recipientPatterns),
  recipientMatchMode: rule.recipientMatchMode === 'all' ? 'all' : 'any',
})

const newRule = (): ForwardRule => ({
  domains: [],
  forward: '',
  deleteOriginal: false,
  sourcePatterns: [],
  sourceMatchMode: 'any',
  recipientPatterns: [],
  recipientMatchMode: 'any',
})

async function loadAccountSettings(): Promise<AccountSettings> {
  const res = (await api.get<RawAccountSettings | null>('/admin/account_settings')) ?? {}
  const status = res.addressCreationSubdomainMatchStatus
  const storedEnabled = typeof status?.storedEnabled === 'boolean' ? status.storedEnabled : undefined
  const limit = res.sendMailLimitConfig
  const dailyEnabled = !!limit?.dailyEnabled
  const monthlyEnabled = !!limit?.monthlyEnabled
  return {
    blockList: list(res.blockList),
    sendBlockList: list(res.sendBlockList),
    verifiedAddressList: list(res.verifiedAddressList),
    fromBlockList: list(res.fromBlockList),
    noLimitSendAddressList: list(res.noLimitSendAddressList),
    blockReceiveUnknowAddressEmail: res.emailRuleSettings?.blockReceiveUnknowAddressEmail || false,
    emailForwardingList: (res.emailRuleSettings?.emailForwardingList || []).map(normalizeRule),
    subdomainMode: storedEnabled === true ? 'force_enable' : storedEnabled === false ? 'force_disable' : 'follow_env',
    subdomainStatus: {
      envConfigured: !!status?.envConfigured,
      envEnabled: !!status?.envEnabled,
      storedEnabled,
      effectiveEnabled: !!status?.effectiveEnabled,
    },
    dailyEnabled,
    monthlyEnabled,
    dailyLimit: dailyEnabled ? (limit?.dailyLimit ?? null) : DEFAULT_SEND_MAIL_DAILY_LIMIT,
    monthlyLimit: monthlyEnabled ? (limit?.monthlyLimit ?? null) : DEFAULT_SEND_MAIL_MONTHLY_LIMIT,
  }
}

const isValidSendMailLimit = (value: number | null) => value !== null && Number.isInteger(value) && value >= -1

/** Returns the error message key for a forwarding regex, or null when valid. */
const patternError = (pattern: string): 'regex_too_long' | 'regex_invalid' | null => {
  if (pattern.length > MAX_REGEX_LENGTH) return 'regex_too_long'
  try {
    new RegExp(pattern, 'i')
    return null
  } catch {
    return 'regex_invalid'
  }
}

export default function AccountSettingsPage() {
  const t = useT(messages)
  const domains = useApp((s) => s.openSettings.domains)
  const settings = useSettingsDraft({ queryKey: ['admin', 'account-settings'], queryFn: loadAccountSettings })
  const { draft, update, dirty } = settings
  const [saving, setSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const validate = (d: AccountSettings) => {
    for (const [i, rule] of d.emailForwardingList.entries()) {
      if (!rule.forward || rule.forward.trim() === '') {
        toast.error(`${t('forward_address_required')} (${t('rule_index')} ${i + 1})`)
        return false
      }
      for (const pattern of [...rule.sourcePatterns, ...rule.recipientPatterns]) {
        const error = patternError(pattern)
        if (error === 'regex_too_long') {
          toast.error(`${t('regex_too_long')}: ${pattern.substring(0, 30)}...`)
          return false
        }
        if (error === 'regex_invalid') {
          toast.error(`${t('regex_invalid')}: ${pattern}`)
          return false
        }
      }
    }
    if (d.dailyEnabled && !isValidSendMailLimit(d.dailyLimit)) {
      toast.error(t('send_mail_daily_limit_invalid'))
      return false
    }
    if (d.monthlyEnabled && !isValidSendMailLimit(d.monthlyLimit)) {
      toast.error(t('send_mail_monthly_limit_invalid'))
      return false
    }
    return true
  }

  const save = async () => {
    if (!draft) return
    if (!validate(draft)) {
      setShowErrors(true)
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/account_settings', {
        blockList: draft.blockList,
        sendBlockList: draft.sendBlockList,
        verifiedAddressList: draft.verifiedAddressList,
        fromBlockList: draft.fromBlockList,
        noLimitSendAddressList: draft.noLimitSendAddressList,
        emailRuleSettings: {
          blockReceiveUnknowAddressEmail: draft.blockReceiveUnknowAddressEmail,
          emailForwardingList: draft.emailForwardingList,
        },
        addressCreationSettings: {
          enableSubdomainMatch:
            draft.subdomainMode === 'force_enable' ? true : draft.subdomainMode === 'force_disable' ? false : null,
        },
        sendMailLimitConfig: {
          dailyEnabled: draft.dailyEnabled,
          monthlyEnabled: draft.monthlyEnabled,
          dailyLimit: draft.dailyEnabled ? draft.dailyLimit : null,
          monthlyLimit: draft.monthlyEnabled ? draft.monthlyLimit : null,
        },
      })
      toast.success(t('saved'))
      setShowErrors(false)
      // keep `saving` until the fresh settings are in, so the form can't be re-submitted meanwhile
      const refreshed = await settings.refetch()
      if (refreshed.error) toast.warning(errorMessage(refreshed.error))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const updateRule = (index: number, patch: Partial<ForwardRule>) =>
    draft && update({ emailForwardingList: draft.emailForwardingList.map((r, i) => (i === index ? { ...r, ...patch } : r)) })

  const removeRule = async (index: number) => {
    if (!draft) return
    if (!(await confirm({ title: t('delete_rule_confirm'), destructive: true, confirmText: t('delete_rule') }))) return
    update({ emailForwardingList: draft.emailForwardingList.filter((_, i) => i !== index) })
  }

  const addRule = () => draft && update({ emailForwardingList: [...draft.emailForwardingList, newRule()] })

  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={draft && <SaveButton dirty={dirty} saving={saving} onSave={save} />}
      />
      {!draft ? (
        settings.error ? (
          <LoadError error={settings.error} onRetry={() => settings.refetch()} />
        ) : (
          <SettingsSkeleton sections={3} />
        )
      ) : (
        <>
          <Section title={t('blockingSection')} description={t('blockingSectionDesc')}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="address-block-list">{t('address_block_list')}</FieldLabel>
                <StringListInput
                  id="address-block-list"
                  value={draft.blockList}
                  onChange={(blockList) => update({ blockList })}
                  placeholder={t('address_block_list_placeholder')}
                />
                <FieldDescription>{t('address_block_list_desc')}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="from-block-list">{t('fromBlockList')}</FieldLabel>
                <StringListInput
                  id="from-block-list"
                  value={draft.fromBlockList}
                  onChange={(fromBlockList) => update({ fromBlockList })}
                  placeholder={t('address_block_list_placeholder')}
                />
                <FieldDescription>{t('fromBlockList_desc')}</FieldDescription>
              </Field>
              <FieldSeparator />
              <SwitchField
                label={t('block_receive_unknow_address_email')}
                description={t('block_receive_unknow_address_email_desc')}
                checked={draft.blockReceiveUnknowAddressEmail}
                onCheckedChange={(blockReceiveUnknowAddressEmail) => update({ blockReceiveUnknowAddressEmail })}
              />
            </FieldGroup>
          </Section>

          <Section title={t('sendingSection')} description={t('sendingSectionDesc')}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="send-block-list">{t('send_address_block_list')}</FieldLabel>
                <StringListInput
                  id="send-block-list"
                  value={draft.sendBlockList}
                  onChange={(sendBlockList) => update({ sendBlockList })}
                  placeholder={t('address_block_list_placeholder')}
                />
                <FieldDescription>{t('send_address_block_list_desc')}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="verified-address-list">{t('verified_address_list')}</FieldLabel>
                <StringListInput
                  id="verified-address-list"
                  value={draft.verifiedAddressList}
                  onChange={(verifiedAddressList) => update({ verifiedAddressList })}
                  placeholder={t('verified_address_list')}
                />
                <FieldDescription>{t('verified_address_list_desc')}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="no-limit-send-list">{t('noLimitSendAddressList')}</FieldLabel>
                <StringListInput
                  id="no-limit-send-list"
                  value={draft.noLimitSendAddressList}
                  onChange={(noLimitSendAddressList) => update({ noLimitSendAddressList })}
                  placeholder={t('noLimitSendAddressList')}
                />
                <FieldDescription>{t('noLimitSendAddressList_desc')}</FieldDescription>
              </Field>
              <FieldSeparator />
              <FieldSet>
                <FieldLegend variant="label">{t('send_mail_limit')}</FieldLegend>
                <FieldDescription>{t('send_mail_limit_tip')}</FieldDescription>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LimitCard
                    label={t('send_mail_daily_limit')}
                    enabled={draft.dailyEnabled}
                    value={draft.dailyLimit}
                    invalid={draft.dailyEnabled && !isValidSendMailLimit(draft.dailyLimit)}
                    invalidText={t('send_mail_daily_limit_invalid')}
                    onEnabledChange={(dailyEnabled) => update({ dailyEnabled })}
                    onValueChange={(dailyLimit) => update({ dailyLimit })}
                  />
                  <LimitCard
                    label={t('send_mail_monthly_limit')}
                    enabled={draft.monthlyEnabled}
                    value={draft.monthlyLimit}
                    invalid={draft.monthlyEnabled && !isValidSendMailLimit(draft.monthlyLimit)}
                    invalidText={t('send_mail_monthly_limit_invalid')}
                    onEnabledChange={(monthlyEnabled) => update({ monthlyEnabled })}
                    onValueChange={(monthlyLimit) => update({ monthlyLimit })}
                  />
                </div>
              </FieldSet>
            </FieldGroup>
          </Section>

          <Section title={t('creationSection')} description={t('create_address_subdomain_match_tip')}>
            <SubdomainMatchField
              t={t}
              mode={draft.subdomainMode}
              status={draft.subdomainStatus}
              onChange={(subdomainMode) => update({ subdomainMode })}
            />
          </Section>

          <Section
            title={t('forwardingSection')}
            description={t('forwardingSectionDesc')}
            actions={
              draft.emailForwardingList.length > 0 && (
                <Button variant="outline" size="sm" onClick={addRule}>
                  <PlusIcon />
                  {t('addRule')}
                </Button>
              )
            }
          >
            <div className="flex flex-col gap-4">
              <Alert>
                <InfoIcon />
                <AlertTitle>{t('forwarding_rule_warning')}</AlertTitle>
                <AlertDescription>{t('source_patterns_tip')}</AlertDescription>
              </Alert>
              {draft.emailForwardingList.length === 0 ? (
                <EmptyState icon={<ForwardIcon />} title={t('noRules')} description={t('noRulesDesc')}>
                  <Button variant="outline" onClick={addRule}>
                    <PlusIcon />
                    {t('addRule')}
                  </Button>
                </EmptyState>
              ) : (
                draft.emailForwardingList.map((rule, index) => (
                  <ForwardRuleCard
                    key={index}
                    t={t}
                    index={index}
                    rule={rule}
                    domainOptions={domains}
                    showErrors={showErrors}
                    onChange={(patch) => updateRule(index, patch)}
                    onRemove={() => removeRule(index)}
                  />
                ))
              )}
            </div>
          </Section>

          <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={settings.reset} />
        </>
      )}
    </Page>
  )
}

function LimitCard({
  label,
  enabled,
  value,
  invalid,
  invalidText,
  onEnabledChange,
  onValueChange,
}: {
  label: string
  enabled: boolean
  value: number | null
  invalid: boolean
  invalidText: string
  onEnabledChange: (enabled: boolean) => void
  onValueChange: (value: number | null) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${id}-switch`}>{label}</Label>
        <Switch id={`${id}-switch`} checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
      <NumberInput
        aria-label={label}
        min={-1}
        step={1}
        value={value}
        onChange={onValueChange}
        disabled={!enabled}
        aria-invalid={invalid || undefined}
      />
      {invalid && <FieldError>{invalidText}</FieldError>}
    </div>
  )
}

function SubdomainMatchField({
  t,
  mode,
  status,
  onChange,
}: {
  t: T
  mode: SubdomainMode
  status: SubdomainStatus
  onChange: (mode: SubdomainMode) => void
}) {
  const id = useId()
  const envLocked = status.envConfigured && !status.envEnabled
  const options: { value: SubdomainMode; label: string; note: string }[] = [
    {
      value: 'follow_env',
      label: t('create_address_subdomain_match_follow_env'),
      note: t('create_address_subdomain_match_follow_env_note'),
    },
    {
      value: 'force_enable',
      label: t('create_address_subdomain_match_force_enable'),
      note: t('create_address_subdomain_match_force_enable_note'),
    },
    {
      value: 'force_disable',
      label: t('create_address_subdomain_match_force_disable'),
      note: t('create_address_subdomain_match_force_disable_note'),
    },
  ]
  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend variant="label">{t('create_address_subdomain_match')}</FieldLegend>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{t('envValue')}</span>
          <Badge variant="outline" className="font-mono">
            {status.envConfigured ? String(status.envEnabled) : t('envNotSet')}
          </Badge>
          <span className="ml-2">{t('effectiveStatus')}</span>
          <Badge variant={status.effectiveEnabled ? 'default' : 'secondary'}>
            {status.effectiveEnabled ? t('on') : t('off')}
          </Badge>
        </div>
        <RadioGroup
          value={mode}
          onValueChange={(v) => onChange(v as SubdomainMode)}
          className="grid gap-2 md:grid-cols-3"
        >
          {options.map((option) => (
            <FieldLabel key={option.value} htmlFor={`${id}-${option.value}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{option.label}</FieldTitle>
                  <FieldDescription className="text-xs">{option.note}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
        <FieldDescription>{t('create_address_subdomain_match_note')}</FieldDescription>
      </FieldSet>
      {envLocked && (
        <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
          <TriangleAlertIcon />
          <AlertDescription className="text-current">{t('create_address_subdomain_match_env_locked')}</AlertDescription>
        </Alert>
      )}
    </FieldGroup>
  )
}

function ForwardRuleCard({
  t,
  index,
  rule,
  domainOptions,
  showErrors,
  onChange,
  onRemove,
}: {
  t: T
  index: number
  rule: ForwardRule
  domainOptions: { label: string; value: string }[]
  showErrors: boolean
  onChange: (patch: Partial<ForwardRule>) => void
  onRemove: () => void
}) {
  const id = useId()
  const forwardMissing = showErrors && !rule.forward.trim()
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-medium">
            {t('rule_index')} {index + 1}
          </span>
          {rule.forward.trim() && (
            <span className="truncate text-xs text-muted-foreground">→ {rule.forward.trim()}</span>
          )}
          {rule.deleteOriginal && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {t('delete_original')}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={onRemove} aria-label={t('delete_rule')}>
          <Trash2Icon />
        </Button>
      </div>
      <FieldGroup className="gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={forwardMissing || undefined}>
            <FieldLabel htmlFor={`${id}-forward`}>{t('forward_address')}</FieldLabel>
            <Input
              id={`${id}-forward`}
              type="email"
              placeholder="forward@example.com"
              value={rule.forward}
              aria-invalid={forwardMissing || undefined}
              onChange={(e) => onChange({ forward: e.target.value })}
            />
            {forwardMissing && <FieldError>{t('forward_address_required')}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-domains`}>{t('domain_list')}</FieldLabel>
            <StringListInput
              id={`${id}-domains`}
              value={rule.domains}
              onChange={(domains) => onChange({ domains })}
              suggestions={domainOptions}
              placeholder={t('select_domain')}
            />
            <FieldDescription>{t('domain_list_desc')}</FieldDescription>
          </Field>
          <PatternField
            t={t}
            id={`${id}-source`}
            label={t('source_patterns')}
            placeholder={t('source_patterns_placeholder')}
            patterns={rule.sourcePatterns}
            mode={rule.sourceMatchMode}
            onPatternsChange={(sourcePatterns) => onChange({ sourcePatterns })}
            onModeChange={(sourceMatchMode) => onChange({ sourceMatchMode })}
          />
          <PatternField
            t={t}
            id={`${id}-recipient`}
            label={t('recipient_patterns')}
            placeholder={t('recipient_patterns_placeholder')}
            patterns={rule.recipientPatterns}
            mode={rule.recipientMatchMode}
            onPatternsChange={(recipientPatterns) => onChange({ recipientPatterns })}
            onModeChange={(recipientMatchMode) => onChange({ recipientMatchMode })}
          />
        </div>
        <SwitchField
          label={t('delete_original')}
          checked={rule.deleteOriginal}
          onCheckedChange={(deleteOriginal) => onChange({ deleteOriginal })}
        />
      </FieldGroup>
    </div>
  )
}

function PatternField({
  t,
  id,
  label,
  placeholder,
  patterns,
  mode,
  onPatternsChange,
  onModeChange,
}: {
  t: T
  id: string
  label: string
  placeholder: string
  patterns: string[]
  mode: MatchMode
  onPatternsChange: (patterns: string[]) => void
  onModeChange: (mode: MatchMode) => void
}) {
  const invalid = patterns.filter((p) => patternError(p) !== null)
  return (
    <div className="flex flex-col gap-2">
      <Field data-invalid={invalid.length > 0 || undefined}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <StringListInput
          id={id}
          mono
          value={patterns}
          onChange={onPatternsChange}
          placeholder={placeholder}
          invalidItems={invalid}
          aria-invalid={invalid.length > 0 || undefined}
        />
        {invalid.length > 0 && (
          <FieldError className="whitespace-pre-line">
            {invalid.map((p) => `${t(patternError(p) ?? 'regex_invalid')}: ${p.length > 30 ? `${p.slice(0, 30)}...` : p}`).join('\n')}
          </FieldError>
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">{t('source_match_mode')}</span>
        <RadioGroup value={mode} onValueChange={(v) => onModeChange(v as MatchMode)} className="flex w-auto gap-4">
          {(['any', 'all'] as const).map((value) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`${id}-${value}`} />
              <Label htmlFor={`${id}-${value}`} className="font-normal">
                {value === 'any' ? t('match_any') : t('match_all')}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}
