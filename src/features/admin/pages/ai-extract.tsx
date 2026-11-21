import { useState } from 'react'
import { InfoIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Page, PageHeader, Section } from '@/components/common/page'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { defineMessages, useT } from '@/i18n'
import { SaveBar, SaveButton } from '../components/settings/save-bar'
import { LoadError, SettingsSkeleton } from '../components/settings/settings-states'
import { StringListInput } from '../components/settings/string-list-input'
import { SwitchField } from '../components/settings/switch-field'
import { useSettingsDraft } from '../components/settings/use-settings-draft'

const messages = defineMessages({
  zh: {
    title: 'AI 邮件提取设置',
    description: '控制哪些邮箱地址可以使用 AI 提取验证码、链接等信息。',
    section: '地址白名单',
    enableAllowList: '启用地址白名单',
    enableAllowListTip: '启用后，AI 提取功能仅对白名单中的邮箱地址生效',
    disabledTip: '未启用时，所有邮箱地址都可使用 AI 提取功能',
    allowList: '地址白名单',
    allowListPlaceholder: '请输入地址并回车，支持通配符',
    allowListTip: '通配符 * 可匹配任意字符，如 *@example.com 可匹配 example.com 域名下的所有地址',
  },
  en: {
    title: 'AI Email Extraction Settings',
    description: 'Control which addresses can use AI extraction of codes, links and more.',
    section: 'Address allowlist',
    enableAllowList: 'Enable Address Allowlist',
    enableAllowListTip: 'When enabled, AI extraction will only process emails sent to addresses in the allowlist',
    disabledTip: 'When disabled, AI extraction will process all email addresses',
    allowList: 'Address Allowlist',
    allowListPlaceholder: 'Enter address and press Enter, wildcards supported',
    allowListTip: 'Wildcard * matches any characters, e.g. *@example.com matches all addresses under example.com domain',
  },
})

type AiExtractSettings = {
  enableAllowList: boolean
  allowList: string[]
}

async function loadAiExtractSettings(): Promise<AiExtractSettings> {
  const res = await api.get<Partial<AiExtractSettings> | null>('/admin/ai_extract/settings')
  return {
    ...res,
    enableAllowList: !!res?.enableAllowList,
    allowList: Array.isArray(res?.allowList) ? res.allowList : [],
  }
}

export default function AiExtractPage() {
  const t = useT(messages)
  const settings = useSettingsDraft({ queryKey: ['admin', 'ai-extract-settings'], queryFn: loadAiExtractSettings })
  const { draft, update, dirty } = settings
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      await api.post('/admin/ai_extract/settings', draft)
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
          <SettingsSkeleton sections={1} rows={2} />
        )
      ) : (
        <>
          <Section title={t('section')}>
            <FieldGroup>
              <SwitchField
                label={t('enableAllowList')}
                description={t('enableAllowListTip')}
                checked={draft.enableAllowList}
                onCheckedChange={(enableAllowList) => update({ enableAllowList })}
              />
              {draft.enableAllowList ? (
                <Field>
                  <FieldLabel htmlFor="ai-allow-list">{t('allowList')}</FieldLabel>
                  <StringListInput
                    id="ai-allow-list"
                    mono
                    value={draft.allowList}
                    onChange={(allowList) => update({ allowList })}
                    placeholder={t('allowListPlaceholder')}
                  />
                  <FieldDescription>{t('allowListTip')}</FieldDescription>
                </Field>
              ) : (
                <Alert>
                  <InfoIcon />
                  <AlertDescription>{t('disabledTip')}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </Section>
          <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={settings.reset} />
        </>
      )}
    </Page>
  )
}
