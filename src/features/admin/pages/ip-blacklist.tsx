import { useState } from 'react'
import { InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Page, PageHeader, Section } from '@/components/common/page'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { defineMessages, useT } from '@/i18n'
import { NumberInput } from '../components/settings/number-input'
import { SaveBar, SaveButton } from '../components/settings/save-bar'
import { LoadError, SettingsSkeleton } from '../components/settings/settings-states'
import { StringListInput } from '../components/settings/string-list-input'
import { SwitchField } from '../components/settings/switch-field'
import { useSettingsDraft } from '../components/settings/use-settings-draft'

const messages = defineMessages({
  zh: {
    title: 'IP 黑名单设置',
    description: '限制可访问限流 API 的 IP、运营商与浏览器指纹。',
    tip_scope: '作用范围：创建邮箱地址、发送邮件、外部发送邮件 API、用户注册、验证码验证',
    whitelistSection: 'IP 白名单',
    blacklistSection: '黑名单',
    dailyLimitSection: '每日限流',
    enable_ip_whitelist: '启用 IP 白名单（严格模式）',
    enable_whitelist_tip: '严格模式：仅允许匹配白名单的 IP 访问限流 API，其他所有 IP 将被拒绝',
    ip_whitelist: 'IP 白名单匹配模式',
    ip_whitelist_placeholder: '精确 IP(如 1.2.3.4)或锚定正则(如 ^192\\.168\\.1\\.\\d+$)',
    tip_whitelist:
      'IP 白名单: 严格放行名单——纯文本必须是精确 IP(不支持子串匹配), 批量放行请用锚定正则 ^...$. 命中白名单的 IP 将跳过黑名单检查.',
    whitelist_empty_warning:
      'IP 白名单已启用但列表为空，服务端将忽略该开关以防止锁死。请先添加至少一条白名单条目再启用。',
    enable_ip_blacklist: '启用 IP 黑名单',
    enable_tip: '阻止匹配黑名单的 IP 访问限流 API',
    ip_blacklist: 'IP 黑名单匹配模式',
    ip_blacklist_placeholder: '输入匹配模式（例如：192.168.1 或 ^10\\.0\\.0\\.5$）',
    tip_ip: 'IP 黑名单：支持文本匹配（如 "192.168.1"）或正则表达式（如 "^10\\.0\\.0\\.5$"）。',
    asn_blacklist: 'ASN 组织（运营商）黑名单',
    asn_blacklist_placeholder: '输入 ASN 组织名称（例如：Google, Amazon）',
    tip_asn: 'ASN 组织：根据运营商/ISP 拉黑。支持不区分大小写的文本匹配或正则表达式。',
    fingerprint_blacklist: '浏览器指纹黑名单',
    fingerprint_blacklist_placeholder: '输入指纹 ID（例如：a1b2c3d4e5f6g7h8）',
    tip_fingerprint: '浏览器指纹：根据浏览器指纹拉黑。支持完全匹配或正则表达式。',
    enable_daily_limit: '启用每日请求限流',
    enable_daily_limit_tip: '限制每个 IP 地址每天的 API 请求次数',
    daily_request_limit: '每日请求次数上限',
    daily_request_limit_placeholder: '输入限制次数（例如：1000）',
    tip_daily_limit: '每日限流：限制单个 IP 地址每天最多请求次数（1-1000000）。',
    dailyLimitInvalid: '每日请求次数上限必须在 1 - 1000000 之间',
    manualInputPrompt: '输入匹配模式后按回车键添加',
    tooMany: '最多 {max} 条',
  },
  en: {
    title: 'IP Blacklist Settings',
    description: 'Restrict which IPs, providers and browser fingerprints can access rate-limited APIs.',
    tip_scope: 'Applies to: Create Address, Send Mail, External Send Mail API, User Registration, Verify Code',
    whitelistSection: 'IP whitelist',
    blacklistSection: 'Blacklists',
    dailyLimitSection: 'Daily limit',
    enable_ip_whitelist: 'Enable IP Whitelist (Strict)',
    enable_whitelist_tip:
      'Strict mode: ONLY IPs matching the whitelist can access rate-limited APIs. All other IPs will be denied.',
    ip_whitelist: 'IP Whitelist Patterns',
    ip_whitelist_placeholder: 'Exact IP (e.g., 1.2.3.4) or anchored regex (e.g., ^192\\.168\\.1\\.\\d+$)',
    tip_whitelist:
      'IP Whitelist: Strict allowlist — plain entries must be EXACT IP matches (no substring). Use anchored regex (^...$) for ranges. Whitelisted IPs skip blacklist checks.',
    whitelist_empty_warning:
      'IP whitelist is enabled but the list is empty. This is ignored by the server to prevent lockout. Please add at least one entry before enabling.',
    enable_ip_blacklist: 'Enable IP Blacklist',
    enable_tip: 'Block IPs matching blacklist patterns from accessing rate-limited APIs',
    ip_blacklist: 'IP Blacklist Patterns',
    ip_blacklist_placeholder: 'Enter pattern (e.g., 192.168.1 or ^10\\.0\\.0\\.5$)',
    tip_ip: 'IP Blacklist: Supports text matching (e.g., "192.168.1") or regex (e.g., "^10\\.0\\.0\\.5$").',
    asn_blacklist: 'ASN Organization Blacklist',
    asn_blacklist_placeholder: 'Enter ASN organization (e.g., Google, Amazon)',
    tip_asn: 'ASN Organization: Block by ISP/provider. Case-insensitive text matching or regex.',
    fingerprint_blacklist: 'Browser Fingerprint Blacklist',
    fingerprint_blacklist_placeholder: 'Enter fingerprint ID (e.g., a1b2c3d4e5f6g7h8)',
    tip_fingerprint: 'Browser Fingerprint: Block by browser fingerprint. Supports exact matching or regex patterns.',
    enable_daily_limit: 'Enable Daily Request Limit',
    enable_daily_limit_tip: 'Limit the number of API requests per IP address per day',
    daily_request_limit: 'Daily Request Limit',
    daily_request_limit_placeholder: 'Enter limit (e.g., 1000)',
    tip_daily_limit: 'Daily Limit: Restrict the maximum number of requests per IP address per day (1-1000000).',
    dailyLimitInvalid: 'Daily request limit must be between 1 and 1000000',
    manualInputPrompt: 'Type pattern and press Enter to add',
    tooMany: 'At most {max} entries',
  },
})

type IpBlacklistSettings = {
  enabled: boolean
  blacklist: string[]
  asnBlacklist: string[]
  fingerprintBlacklist: string[]
  enableWhitelist: boolean
  whitelist: string[]
  enableDailyLimit: boolean
  dailyRequestLimit: number | null
}

/** Matches MAX_BLACKLIST_SIZE in the worker. */
const MAX_LIST_SIZE = 1000

async function loadIpBlacklistSettings(): Promise<IpBlacklistSettings> {
  const res = (await api.get<Partial<IpBlacklistSettings> | null>('/admin/ip_blacklist/settings')) ?? {}
  return {
    enabled: res.enabled || false,
    blacklist: res.blacklist || [],
    asnBlacklist: res.asnBlacklist || [],
    fingerprintBlacklist: res.fingerprintBlacklist || [],
    enableWhitelist: res.enableWhitelist || false,
    whitelist: res.whitelist || [],
    enableDailyLimit: res.enableDailyLimit || false,
    dailyRequestLimit: res.dailyRequestLimit || 1000,
  }
}

const isValidDailyLimit = (value: number | null) => value !== null && value >= 1 && value <= 1_000_000

export default function IpBlacklistPage() {
  const t = useT(messages)
  const settings = useSettingsDraft({ queryKey: ['admin', 'ip-blacklist-settings'], queryFn: loadIpBlacklistSettings })
  const { draft, update, dirty } = settings
  const [saving, setSaving] = useState(false)

  const whitelistEmpty = !!draft && draft.enableWhitelist && draft.whitelist.length === 0
  const dailyLimitInvalid = !!draft && !isValidDailyLimit(draft.dailyRequestLimit)

  const save = async () => {
    if (!draft) return
    if (whitelistEmpty) {
      toast.warning(t('whitelist_empty_warning'))
      return
    }
    if (dailyLimitInvalid) {
      toast.error(t('dailyLimitInvalid'))
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/ip_blacklist/settings', {
        enabled: draft.enabled,
        blacklist: draft.blacklist,
        asnBlacklist: draft.asnBlacklist,
        fingerprintBlacklist: draft.fingerprintBlacklist,
        enableWhitelist: draft.enableWhitelist,
        whitelist: draft.whitelist,
        enableDailyLimit: draft.enableDailyLimit,
        dailyRequestLimit: draft.dailyRequestLimit,
      })
      toast.success(t('saved'))
      await settings.refetch()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const listField = (
    key: 'whitelist' | 'blacklist' | 'asnBlacklist' | 'fingerprintBlacklist',
    label: string,
    placeholder: string,
    tip: string,
    disabled: boolean,
    mono = true,
  ) => {
    const items = draft?.[key] ?? []
    const tooMany = items.length > MAX_LIST_SIZE
    return (
      <Field data-invalid={tooMany || undefined}>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor={`ip-${key}`}>{label}</FieldLabel>
          {items.length > 0 && (
            <Badge variant={tooMany ? 'destructive' : 'secondary'} className="tabular-nums">
              {items.length} / {MAX_LIST_SIZE}
            </Badge>
          )}
        </div>
        <StringListInput
          id={`ip-${key}`}
          mono={mono}
          value={items}
          onChange={(value) => update({ [key]: value })}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={tooMany || undefined}
        />
        {tooMany ? <FieldError>{t('tooMany', { max: MAX_LIST_SIZE })}</FieldError> : <FieldDescription>{tip}</FieldDescription>}
      </Field>
    )
  }

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
          <SettingsSkeleton sections={3} rows={2} />
        )
      ) : (
        <>
          <Alert>
            <InfoIcon />
            <AlertTitle>{t('tip_scope')}</AlertTitle>
            <AlertDescription>{t('manualInputPrompt')}</AlertDescription>
          </Alert>

          <Section title={t('whitelistSection')}>
            <FieldGroup>
              <SwitchField
                label={t('enable_ip_whitelist')}
                description={t('enable_whitelist_tip')}
                checked={draft.enableWhitelist}
                onCheckedChange={(enableWhitelist) => update({ enableWhitelist })}
              />
              {listField('whitelist', t('ip_whitelist'), t('ip_whitelist_placeholder'), t('tip_whitelist'), !draft.enableWhitelist)}
              {whitelistEmpty && (
                <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
                  <TriangleAlertIcon />
                  <AlertDescription className="text-current">{t('whitelist_empty_warning')}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </Section>

          <Section title={t('blacklistSection')}>
            <FieldGroup>
              <SwitchField
                label={t('enable_ip_blacklist')}
                description={t('enable_tip')}
                checked={draft.enabled}
                onCheckedChange={(enabled) => update({ enabled })}
              />
              <FieldSeparator />
              {listField('blacklist', t('ip_blacklist'), t('ip_blacklist_placeholder'), t('tip_ip'), !draft.enabled)}
              {listField('asnBlacklist', t('asn_blacklist'), t('asn_blacklist_placeholder'), t('tip_asn'), !draft.enabled, false)}
              {listField(
                'fingerprintBlacklist',
                t('fingerprint_blacklist'),
                t('fingerprint_blacklist_placeholder'),
                t('tip_fingerprint'),
                !draft.enabled,
              )}
            </FieldGroup>
          </Section>

          <Section title={t('dailyLimitSection')}>
            <FieldGroup>
              <SwitchField
                label={t('enable_daily_limit')}
                description={t('enable_daily_limit_tip')}
                checked={draft.enableDailyLimit}
                onCheckedChange={(enableDailyLimit) => update({ enableDailyLimit })}
              />
              <Field data-invalid={dailyLimitInvalid || undefined} className="sm:max-w-xs">
                <FieldLabel htmlFor="ip-daily-limit">{t('daily_request_limit')}</FieldLabel>
                <NumberInput
                  id="ip-daily-limit"
                  min={1}
                  max={1_000_000}
                  step={1}
                  placeholder={t('daily_request_limit_placeholder')}
                  value={draft.dailyRequestLimit}
                  disabled={!draft.enableDailyLimit}
                  aria-invalid={dailyLimitInvalid || undefined}
                  onChange={(dailyRequestLimit) => update({ dailyRequestLimit })}
                />
                {dailyLimitInvalid ? (
                  <FieldError>{t('dailyLimitInvalid')}</FieldError>
                ) : (
                  <FieldDescription>{t('tip_daily_limit')}</FieldDescription>
                )}
              </Field>
            </FieldGroup>
          </Section>

          <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={settings.reset} />
        </>
      )}
    </Page>
  )
}
