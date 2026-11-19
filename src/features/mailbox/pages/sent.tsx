import { SendboxWorkspace } from '@/components/mail/sendbox-workspace'
import { api, type ListResponse } from '@/lib/api'
import type { RawSentMail } from '@/lib/sendbox'
import { useApp } from '@/store/app'

/** `/sent` — mails sent from the current address. */
export default function SentPage() {
  const address = useApp((s) => s.addressSettings.address)
  const enableDelete = useApp((s) => s.openSettings.enableUserDeleteEmail)
  return (
    <SendboxWorkspace
      queryKey={['mailbox', address, 'sendbox']}
      fetchMails={(limit, offset) => api.get<ListResponse<RawSentMail>>(`/api/sendbox?limit=${limit}&offset=${offset}`)}
      deleteMail={enableDelete ? (id) => api.delete(`/api/sendbox/${id}`) : undefined}
    />
  )
}
