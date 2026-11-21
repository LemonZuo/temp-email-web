import { useState } from 'react'
import { toast } from 'sonner'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
    title: '用户设置',
    description: '用户注册、邮箱验证与地址绑定数量。',
    registerSection: '注册',
    registerSectionDesc: '控制谁可以注册用户账号。',
    bindingSection: '地址绑定',
    enableUserRegister: '允许用户注册',
    enableMailVerify: '启用邮件验证',
    enableMailVerifyDesc: '发送地址必须是系统中能有余额且能正常发送邮件的地址。',
    verifyMailSender: '验证邮件发送地址',
    enableMailAllowList: '启用邮件地址白名单',
    enableMailAllowListDesc: '仅允许以下域名的邮箱注册，可手动输入, 回车增加。',
    mailAllowList: '邮件地址白名单',
    enableEmailCheckRegex: '启用邮箱正则校验',
    enableEmailCheckRegexDesc: '注册邮箱必须匹配该正则。',
    emailCheckRegex: '邮箱正则校验',
    emailCheckRegexExample: '例如 ^[^.]+@.+$ 禁止@前面有.',
    invalidRegex: '无效的正则表达式',
    maxAddressCount: '可绑定最大邮箱地址数量',
    maxAddressCountDesc: '0 为不限制。角色地址配置优先于此设置。',
    maxAddressCountInvalid: '请输入大于等于 0 的整数',
  },
  en: {
    title: 'User settings',
    description: 'User registration, mail verification and address binding limits.',
    registerSection: 'Registration',
    registerSectionDesc: 'Control who can register a user account.',
    bindingSection: 'Address binding',
    enableUserRegister: 'Allow User Register',
    enableMailVerify: 'Enable Mail Verify',
    enableMailVerifyDesc: 'Send address must be an address in the system with a balance and can send mail normally.',
    verifyMailSender: 'Verify Mail Sender',
    enableMailAllowList: 'Enable Mail Address Allow List',
    enableMailAllowListDesc: 'Only emails from these domains can register (manually enterable).',
    mailAllowList: 'Mail Address Allow List',
    enableEmailCheckRegex: 'Enable Email Check Regex',
    enableEmailCheckRegexDesc: 'Registration emails must match this regex.',
    emailCheckRegex: 'Email Check Regex',
    emailCheckRegexExample: 'e.g. ^[^.]+@.+$ to disallow dots before @',
    invalidRegex: 'Invalid regex pattern',
    maxAddressCount: 'Maximum number of email addresses that can be binded',
    maxAddressCountDesc: '0 = Unlimited. Role address configs take priority over this setting.',
    maxAddressCountInvalid: 'Please enter an integer greater than or equal to 0',
  },
})

const COMMON_MAIL = ['gmail.com', '163.com', '126.com', 'qq.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'yahoo.com', 'foxmail.com']

type UserSettings = {
  enable: boolean
  enableMailVerify: boolean
  verifyMailSender: string
  enableMailAllowList: boolean
  mailAllowList: string[]
  maxAddressCount: number | null
  enableEmailCheckRegex: boolean
  emailCheckRegex: string
}

const DEFAULTS: UserSettings = {
  enable: false,
  enableMailVerify: false,
  verifyMailSender: '',
  enableMailAllowList: false,
  mailAllowList: COMMON_MAIL,
  maxAddressCount: 5,
  enableEmailCheckRegex: false,
  emailCheckRegex: '',
}

async function loadUserSettings(): Promise<UserSettings> {
  const res = (await api.get<Partial<Record<keyof UserSettings, unknown>> | null>('/admin/user_settings')) ?? {}
  // Same as the old page: server values override defaults, missing keys keep the default.
  const merged = { ...DEFAULTS }
  for (const [key, value] of Object.entries(res)) {
    if (value !== undefined && value !== null && key in DEFAULTS) (merged as Record<string, unknown>)[key] = value
  }
  return merged
}

const isValidRegex = (value: string) => {
  try {
    new RegExp(value)
    return true
  } catch {
    return false
  }
}

export default function UserSettingsPage() {
  const t = useT(messages)
  const settings = useSettingsDraft({ queryKey: ['admin', 'user-settings'], queryFn: loadUserSettings })
  const { draft, update, dirty } = settings
  const [saving, setSaving] = useState(false)

  const maxCountInvalid =
    !!draft && (draft.maxAddressCount === null || !Number.isInteger(draft.maxAddressCount) || draft.maxAddressCount < 0)
  const regexInvalid = !!draft && draft.enableEmailCheckRegex && !!draft.emailCheckRegex && !isValidRegex(draft.emailCheckRegex)

  const save = async () => {
    if (!draft) return
    if (maxCountInvalid) {
      toast.error(t('maxAddressCountInvalid'))
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/user_settings', draft)
      toast.success(t('saved'))
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
        actions={draft && <SaveButton dirty={dirty} saving={saving} onSave={save} />}
      />
      {!draft ? (
        settings.error ? (
          <LoadError error={settings.error} onRetry={() => settings.refetch()} />
        ) : (
          <SettingsSkeleton sections={2} />
        )
      ) : (
        <>
          <Section title={t('registerSection')} description={t('registerSectionDesc')}>
            <FieldGroup>
              <SwitchField
                label={t('enableUserRegister')}
                checked={draft.enable}
                onCheckedChange={(enable) => update({ enable })}
              />
              <FieldSeparator />
              <SwitchField
                label={t('enableMailVerify')}
                description={t('enableMailVerifyDesc')}
                checked={draft.enableMailVerify}
                onCheckedChange={(enableMailVerify) => update({ enableMailVerify })}
              />
              {draft.enableMailVerify && (
                <Field>
                  <FieldLabel htmlFor="verify-mail-sender">{t('verifyMailSender')}</FieldLabel>
                  <Input
                    id="verify-mail-sender"
                    type="email"
                    placeholder={t('verifyMailSender')}
                    value={draft.verifyMailSender}
                    onChange={(e) => update({ verifyMailSender: e.target.value })}
                  />
                </Field>
              )}
              <FieldSeparator />
              <SwitchField
                label={t('enableMailAllowList')}
                description={t('enableMailAllowListDesc')}
                checked={draft.enableMailAllowList}
                onCheckedChange={(enableMailAllowList) => update({ enableMailAllowList })}
              />
              {draft.enableMailAllowList && (
                <Field>
                  <FieldLabel htmlFor="mail-allow-list">{t('mailAllowList')}</FieldLabel>
                  <StringListInput
                    id="mail-allow-list"
                    value={draft.mailAllowList}
                    onChange={(mailAllowList) => update({ mailAllowList })}
                    suggestions={COMMON_MAIL}
                    placeholder={t('mailAllowList')}
                  />
                </Field>
              )}
              <FieldSeparator />
              <SwitchField
                label={t('enableEmailCheckRegex')}
                description={t('enableEmailCheckRegexDesc')}
                checked={draft.enableEmailCheckRegex}
                onCheckedChange={(enableEmailCheckRegex) => update({ enableEmailCheckRegex })}
              />
              {draft.enableEmailCheckRegex && (
                <Field data-invalid={regexInvalid || undefined}>
                  <FieldLabel htmlFor="email-check-regex">{t('emailCheckRegex')}</FieldLabel>
                  <Input
                    id="email-check-regex"
                    className="font-mono"
                    placeholder="^[^.]+@.+$"
                    value={draft.emailCheckRegex}
                    aria-invalid={regexInvalid || undefined}
                    onChange={(e) => update({ emailCheckRegex: e.target.value })}
                  />
                  {regexInvalid ? (
                    <FieldError>{t('invalidRegex')}</FieldError>
                  ) : (
                    <FieldDescription>{t('emailCheckRegexExample')}</FieldDescription>
                  )}
                </Field>
              )}
            </FieldGroup>
          </Section>

          <Section title={t('bindingSection')}>
            <Field data-invalid={maxCountInvalid || undefined} className="sm:max-w-xs">
              <FieldLabel htmlFor="max-address-count">{t('maxAddressCount')}</FieldLabel>
              <NumberInput
                id="max-address-count"
                min={0}
                step={1}
                value={draft.maxAddressCount}
                aria-invalid={maxCountInvalid || undefined}
                onChange={(maxAddressCount) => update({ maxAddressCount })}
              />
              {maxCountInvalid ? (
                <FieldError>{t('maxAddressCountInvalid')}</FieldError>
              ) : (
                <FieldDescription>{t('maxAddressCountDesc')}</FieldDescription>
              )}
            </Field>
          </Section>

          <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={settings.reset} />
        </>
      )}
    </Page>
  )
}
