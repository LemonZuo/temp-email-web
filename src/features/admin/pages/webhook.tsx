import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RotateCwIcon, SaveIcon, WebhookIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/common/empty-state'
import { Page, PageHeader, Section } from '@/components/common/page'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { queryClient } from '@/lib/query-client'
import { defineMessages, useT } from '@/i18n'
import { TagListInput } from '../components/integrations/tag-list-input'

const messages = defineMessages({
  zh: {
    title: 'Webhook',
    description: '控制哪些邮箱地址可以使用 Webhook 推送。',
    allowListTitle: '白名单',
    enableAllowList: '启用白名单',
    enableAllowListDesc: '限制 webhook 访问权限，只有白名单中的邮箱地址可以使用。',
    webhookAllowList: 'Webhook 白名单',
    webhookAllowListDesc: '请输入允许使用 webhook 的邮箱地址。',
    manualInputPrompt: '输入后按回车键添加',
    notEnabled: 'Webhook 未开启',
    retry: '重试',
    allowListOffHint: '白名单未启用时，所有邮箱地址都可以使用 Webhook。',
  },
  en: {
    title: 'Webhook',
    description: 'Control which addresses may use webhook push.',
    allowListTitle: 'Allow list',
    enableAllowList: 'Enable allow list',
    enableAllowListDesc: 'Restrict webhook access: only addresses in the allow list can use it.',
    webhookAllowList: 'Webhook allow list',
    webhookAllowListDesc: 'Mail addresses that are allowed to use webhook.',
    manualInputPrompt: 'Type and press Enter to add',
    notEnabled: 'Webhook is not enabled',
    retry: 'Retry',
    allowListOffHint: 'While the allow list is off, every address can use webhook.',
  },
})

/** Worker `AdminWebhookSettings`. */
type AdminWebhookSettings = { enableAllowList: boolean; allowList: string[] }

const QUERY_KEY = ['admin', 'webhook-settings']

/** `/console/webhook` — `GET|POST /admin/webhook/settings`. */
export default function AdminWebhookPage() {
  const t = useT(messages)
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<AdminWebhookSettings> => {
      const res = await api.get<Partial<AdminWebhookSettings>>('/admin/webhook/settings')
      return { enableAllowList: !!res?.enableAllowList, allowList: Array.isArray(res?.allowList) ? res.allowList : [] }
    },
  })

  return (
    <Page>
      {query.isLoading ? (
        <>
          <PageHeader title={t('title')} description={t('description')} />
          <Skeleton className="h-64 w-full rounded-xl" />
        </>
      ) : query.isError || !query.data ? (
        <>
          <PageHeader title={t('title')} description={t('description')} />
          <EmptyState
            icon={<WebhookIcon />}
            title={t('notEnabled')}
            description={errorMessage(query.error)}
            className="rounded-xl border border-dashed"
          >
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? <Spinner /> : <RotateCwIcon />}
              {t('retry')}
            </Button>
          </EmptyState>
        </>
      ) : (
        <AdminWebhookForm initial={query.data} />
      )}
    </Page>
  )
}

function AdminWebhookForm({ initial }: { initial: AdminWebhookSettings }) {
  const t = useT(messages)
  const [settings, setSettings] = useState(initial)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/admin/webhook/settings', settings)
      queryClient.setQueryData(QUERY_KEY, settings)
      toast.success(t('saved'))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner /> : <SaveIcon />}
            {t('save')}
          </Button>
        }
      />
      <Section title={t('allowListTitle')}>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="webhook-allow-list-enabled">{t('enableAllowList')}</FieldLabel>
              <FieldDescription>{settings.enableAllowList ? t('enableAllowListDesc') : t('allowListOffHint')}</FieldDescription>
            </FieldContent>
            <Switch
              id="webhook-allow-list-enabled"
              checked={settings.enableAllowList}
              onCheckedChange={(enableAllowList) => setSettings((s) => ({ ...s, enableAllowList }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="webhook-allow-list">{t('webhookAllowList')}</FieldLabel>
            <FieldDescription>{t('webhookAllowListDesc')}</FieldDescription>
            <TagListInput
              id="webhook-allow-list"
              value={settings.allowList}
              onChange={(allowList) => setSettings((s) => ({ ...s, allowList }))}
              placeholder={t('manualInputPrompt')}
            />
          </Field>
        </FieldGroup>
      </Section>
    </>
  )
}
