import { SendboxWorkspace } from '@/components/mail/sendbox-workspace'
import { api, type ListResponse } from '@/lib/api'
import type { RawSentMail } from '@/lib/sendbox'
import { AddressFilter } from '@/features/admin/components/core/address-filter'
import { useAddressParam } from '@/features/admin/components/core/helpers'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: { queryTip: '请输入地址查询, 留空则查询所有' },
  en: { queryTip: 'Please input address to query, leave blank to query all' },
})

/** `/console/sendbox` — every sent mail, optionally filtered by `?address=`. */
export default function AdminSendboxPage() {
  const t = useT(messages)
  const [address, setAddress] = useAddressParam()

  return (
    <SendboxWorkspace
      queryKey={['admin', 'sendbox', { address }]}
      fetchMails={(limit, offset) =>
        api.get<ListResponse<RawSentMail>>(
          `/admin/sendbox?limit=${limit}&offset=${offset}${address ? `&address=${encodeURIComponent(address)}` : ''}`,
        )
      }
      deleteMail={(id) => api.delete(`/admin/sendbox/${id}`)}
      showSender
      listHeader={<AddressFilter value={address} onChange={setAddress} placeholder={t('queryTip')} />}
    />
  )
}
