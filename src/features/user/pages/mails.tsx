import { useNavigate, useSearchParams } from 'react-router'
import { MailWorkspace } from '@/components/mail/mail-workspace'
import { api, type ListResponse } from '@/lib/api'
import { buildForwardDraft, buildReplyDraft } from '@/lib/mail-actions'
import type { ParsedMail, RawMail } from '@/lib/mail-parser'
import { useApp } from '@/store/app'
import { useCompose } from '@/store/compose'
import { defineMessages, useT } from '@/i18n'
import { BoundAddressPicker } from '../components/bound-address-picker'

const messages = defineMessages({
  zh: {
    reply: '回复',
    forward: '转发',
    emptyTitle: '还没有邮件',
    emptyDesc: '绑定到账户的所有邮箱收到的邮件都会显示在这里',
    emptyFilteredDesc: '{address} 还没有收到邮件',
  },
  en: {
    reply: 'Re',
    forward: 'Fwd',
    emptyTitle: 'No mails yet',
    emptyDesc: 'Mails received by every address bound to your account show up here',
    emptyFilteredDesc: '{address} has not received any mail yet',
  },
})

/** `/user/mails` — inbox across all bound addresses, `?address=` filters to one of them. */
export default function MailsPage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const address = searchParams.get('address') || ''
  const openSettings = useApp((s) => s.openSettings)
  const replaceDraft = useCompose((s) => s.replaceDraft)

  const fetchMails = (limit: number, offset: number) =>
    api.get<ListResponse<RawMail>>(
      `/user_api/mails?limit=${limit}&offset=${offset}${address ? `&address=${encodeURIComponent(address)}` : ''}`,
    )

  // Reply / forward open the user composer with the receiving address preselected as sender.
  const compose = (mail: ParsedMail, draft: ReturnType<typeof buildReplyDraft>) => {
    replaceDraft(draft)
    navigate(mail.address ? `/user/compose?from=${encodeURIComponent(mail.address)}` : '/user/compose')
  }

  return (
    <MailWorkspace
      queryKey={['user', 'mails', { address }]}
      fetchMails={fetchMails}
      deleteMail={openSettings.enableUserDeleteEmail ? (id) => api.delete(`/user_api/mails/${id}`) : undefined}
      onReply={openSettings.enableSendMail ? (mail) => compose(mail, buildReplyDraft(mail, t('reply'))) : undefined}
      onForward={
        openSettings.enableSendMail ? (mail) => compose(mail, buildForwardDraft(mail, t('forward'))) : undefined
      }
      showRecipient
      emptyTitle={t('emptyTitle')}
      emptyDescription={address ? t('emptyFilteredDesc', { address }) : t('emptyDesc')}
      listHeader={
        <BoundAddressPicker
          value={address}
          allowAll
          className="h-8 w-full"
          onChange={(a) => setSearchParams(a ? { address: a.name } : {}, { replace: true })}
        />
      }
    />
  )
}
