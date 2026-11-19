import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { SearchIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { MailWorkspace } from '@/components/mail/mail-workspace'
import { api, type ListResponse } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { buildForwardDraft, buildReplyDraft } from '@/lib/mail-actions'
import type { MailAttachment, RawMail } from '@/lib/mail-parser'
import { useApp } from '@/store/app'
import { useCompose } from '@/store/compose'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    reply: '回复',
    forward: '转发',
    mailId: '邮件 ID',
    showAll: '显示全部邮件',
    saveToS3Success: '已保存到 S3',
    emptyTitle: '收件箱是空的',
    emptyDesc: '把上方的地址填到需要接收邮件的地方，新邮件会自动出现在这里',
  },
  en: {
    reply: 'Re',
    forward: 'Fwd',
    mailId: 'Mail ID',
    showAll: 'Show all mails',
    saveToS3Success: 'Saved to S3',
    emptyTitle: 'Your inbox is empty',
    emptyDesc: 'Use the address above anywhere you need to receive mail — new mails show up here',
  },
})

/** `/` — inbox of the current address. Supports `?mail_id=` to show a single mail. */
export default function InboxPage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const address = useApp((s) => s.addressSettings.address)
  const openSettings = useApp((s) => s.openSettings)
  const replaceDraft = useCompose((s) => s.replaceDraft)
  const mailId = searchParams.get('mail_id') || ''
  const [mailIdInput, setMailIdInput] = useState(mailId)

  const fetchMails = async (limit: number, offset: number): Promise<ListResponse<RawMail>> => {
    if (mailId) {
      const mail = await api.get<RawMail | null>(`/api/mail/${encodeURIComponent(mailId)}`)
      return mail ? { results: [mail], count: 1 } : { results: [], count: 0 }
    }
    return api.get<ListResponse<RawMail>>(`/api/mails?limit=${limit}&offset=${offset}`)
  }

  const saveToS3 = async (id: number, attachment: MailAttachment) => {
    try {
      const { url } = await api.post<{ url: string }>('/api/attachment/put_url', { key: `${id}/${attachment.filename}` })
      const form = new FormData()
      form.append(attachment.filename, attachment.blob)
      const res = await fetch(url, { method: 'PUT', body: form })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(t('saveToS3Success'))
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <MailWorkspace
      queryKey={['mailbox', address, 'inbox', { mailId }]}
      fetchMails={fetchMails}
      deleteMail={openSettings.enableUserDeleteEmail ? (id) => api.delete(`/api/mails/${id}`) : undefined}
      markRead={
        openSettings.enableMailReadStatus ? (id, isUnread) => api.patch(`/api/mails/${id}/read`, { isUnread }) : undefined
      }
      onReply={
        openSettings.enableSendMail
          ? (mail) => {
              replaceDraft(buildReplyDraft(mail, t('reply')))
              navigate('/compose')
            }
          : undefined
      }
      onForward={
        openSettings.enableSendMail
          ? (mail) => {
              replaceDraft(buildForwardDraft(mail, t('forward')))
              navigate('/compose')
            }
          : undefined
      }
      saveToS3={openSettings.isS3Enabled ? saveToS3 : undefined}
      emptyTitle={t('emptyTitle')}
      emptyDescription={t('emptyDesc')}
      listHeader={
        mailId ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (mailIdInput.trim()) setSearchParams({ mail_id: mailIdInput.trim() })
            }}
          >
            <InputGroup className="h-8">
              <InputGroupAddon>{t('mailId')}</InputGroupAddon>
              <InputGroupInput value={mailIdInput} onChange={(e) => setMailIdInput(e.target.value)} inputMode="numeric" />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="submit" size="icon-xs" aria-label={t('query')}>
                  <SearchIcon />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSearchParams({})}>
              <XIcon />
              {t('showAll')}
            </Button>
          </form>
        ) : undefined
      }
    />
  )
}
