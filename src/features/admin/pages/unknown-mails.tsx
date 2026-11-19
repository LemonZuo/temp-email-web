import { MailWorkspace } from '@/components/mail/mail-workspace'
import { api, type ListResponse } from '@/lib/api'
import type { RawMail } from '@/lib/mail-parser'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    emptyTitle: '没有无收件人邮件',
    emptyDesc: '发往不存在地址的邮件会显示在这里',
  },
  en: {
    emptyTitle: 'No mails for unknown recipients',
    emptyDesc: 'Mails sent to addresses that do not exist show up here',
  },
})

/** `/console/mails/unknown` — mails whose recipient address does not exist. */
export default function AdminUnknownMailsPage() {
  const t = useT(messages)
  return (
    <MailWorkspace
      queryKey={['admin', 'mails-unknown']}
      fetchMails={(limit, offset) => api.get<ListResponse<RawMail>>(`/admin/mails_unknow?limit=${limit}&offset=${offset}`)}
      deleteMail={(id) => api.delete(`/admin/mails/${id}`)}
      showRecipient
      emptyTitle={t('emptyTitle')}
      emptyDescription={t('emptyDesc')}
    />
  )
}
