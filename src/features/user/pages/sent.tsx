import { useSearchParams } from 'react-router'
import { SendboxWorkspace } from '@/components/mail/sendbox-workspace'
import { api, type ListResponse } from '@/lib/api'
import type { RawSentMail } from '@/lib/sendbox'
import { useApp } from '@/store/app'
import { BoundAddressPicker } from '../components/bound-address-picker'

/** `/user/sent` — mails sent from all bound addresses, `?address=` filters to one of them. */
export default function SentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const address = searchParams.get('address') || ''
  const enableDelete = useApp((s) => s.openSettings.enableUserDeleteEmail)
  return (
    <SendboxWorkspace
      queryKey={['user', 'sendbox', { address }]}
      fetchMails={(limit, offset) =>
        api.get<ListResponse<RawSentMail>>(
          `/user_api/sendbox?limit=${limit}&offset=${offset}${address ? `&address=${encodeURIComponent(address)}` : ''}`,
        )
      }
      deleteMail={enableDelete ? (id) => api.delete(`/user_api/sendbox/${id}`) : undefined}
      showSender
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
