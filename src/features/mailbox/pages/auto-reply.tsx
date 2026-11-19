import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SaveIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Page, PageHeader, Section } from '@/components/common/page'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '自动回复',
    description: '收到邮件时自动回复一封邮件。',
    enable: '启用自动回复',
    enableDesc: '开启后，符合发件人过滤条件的来信会收到下面的回复。',
    name: '发件人名称',
    sourcePrefix: '发件人过滤',
    sourcePrefixPlaceholder: '留空=全部匹配，前缀匹配，或 /正则/',
    subject: '主题',
    message: '回复内容',
    required: '启用时主题和回复内容不能为空',
  },
  en: {
    title: 'Auto reply',
    description: 'Automatically answer incoming mail.',
    enable: 'Enable auto reply',
    enableDesc: 'Incoming mail matching the sender filter receives the reply below.',
    name: 'Sender name',
    sourcePrefix: 'Sender filter',
    sourcePrefixPlaceholder: 'Empty = all, prefix match, or /regex/',
    subject: 'Subject',
    message: 'Reply message',
    required: 'Subject and message are required when enabled',
  },
})

type AutoReply = { enabled: boolean; source_prefix: string; name: string; subject: string; message: string }
const EMPTY: AutoReply = { enabled: false, source_prefix: '', name: '', subject: '', message: '' }

/** `/auto-reply` */
export default function AutoReplyPage() {
  const t = useT(messages)
  const address = useApp((s) => s.addressSettings.address)
  const query = useQuery({
    queryKey: ['mailbox', address, 'auto_reply'],
    queryFn: () => api.get<Partial<AutoReply>>('/api/auto_reply'),
  })
  const [draft, setDraft] = useState<AutoReply>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (query.data) setDraft({ ...EMPTY, ...query.data, enabled: !!query.data.enabled })
  }, [query.data])

  const set = (patch: Partial<AutoReply>) => setDraft((d) => ({ ...d, ...patch }))

  const save = async () => {
    if (draft.enabled && (!draft.subject.trim() || !draft.message.trim())) return toast.error(t('required'))
    setSaving(true)
    try {
      await api.post('/api/auto_reply', { auto_reply: draft })
      toast.success(t('saved'))
      await query.refetch()
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
          <Button onClick={save} disabled={saving || query.isLoading}>
            {saving ? <Spinner /> : <SaveIcon />}
            {t('save')}
          </Button>
        }
      />
      {query.isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <Section>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="ar-enabled">{t('enable')}</FieldLabel>
                <FieldDescription>{t('enableDesc')}</FieldDescription>
              </FieldContent>
              <Switch id="ar-enabled" checked={draft.enabled} onCheckedChange={(enabled) => set({ enabled })} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-disabled={!draft.enabled || undefined}>
                <FieldLabel htmlFor="ar-name">{t('name')}</FieldLabel>
                <Input id="ar-name" disabled={!draft.enabled} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field data-disabled={!draft.enabled || undefined}>
                <FieldLabel htmlFor="ar-prefix">{t('sourcePrefix')}</FieldLabel>
                <Input
                  id="ar-prefix"
                  disabled={!draft.enabled}
                  value={draft.source_prefix}
                  placeholder={t('sourcePrefixPlaceholder')}
                  onChange={(e) => set({ source_prefix: e.target.value })}
                />
              </Field>
            </div>
            <Field data-disabled={!draft.enabled || undefined}>
              <FieldLabel htmlFor="ar-subject">{t('subject')}</FieldLabel>
              <Input id="ar-subject" disabled={!draft.enabled} value={draft.subject} onChange={(e) => set({ subject: e.target.value })} />
            </Field>
            <Field data-disabled={!draft.enabled || undefined}>
              <FieldLabel htmlFor="ar-message">{t('message')}</FieldLabel>
              <Textarea
                id="ar-message"
                rows={8}
                disabled={!draft.enabled}
                value={draft.message}
                onChange={(e) => set({ message: e.target.value })}
              />
            </Field>
          </FieldGroup>
        </Section>
      )}
    </Page>
  )
}
