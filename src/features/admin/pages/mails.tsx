import { MailWorkspace } from '@/components/mail/mail-workspace'
import { api, type ListResponse } from '@/lib/api'
import type { RawMail } from '@/lib/mail-parser'
import { AddressFilter } from '@/features/admin/components/core/address-filter'
import { useAddressParam } from '@/features/admin/components/core/helpers'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    addressQueryTip: '留空查询所有地址',
    emptyTitle: '没有邮件',
    emptyFiltered: '{address} 暂无邮件',
    emptyDesc: '所有地址收到的邮件都会显示在这里',
  },
  en: {
    addressQueryTip: 'Leave blank to query all addresses',
    emptyTitle: 'No mails',
    emptyFiltered: 'No mails for {address}',
    emptyDesc: 'Mails received by every address show up here',
  },
})

/** `/console/mails` — every received mail, optionally filtered by `?address=`. */
export default function AdminMailsPage() {
  const t = useT(messages)
  const [address, setAddress] = useAddressParam()

  return (
    <MailWorkspace
      queryKey={['admin', 'mails', { address }]}
      fetchMails={(limit, offset) =>
        api.get<ListResponse<RawMail>>(
          `/admin/mails?limit=${limit}&offset=${offset}${address ? `&address=${encodeURIComponent(address)}` : ''}`,
        )
      }
      deleteMail={(id) => api.delete(`/admin/mails/${id}`)}
      showRecipient
      emptyTitle={address ? t('emptyFiltered', { address }) : t('emptyTitle')}
      emptyDescription={address ? undefined : t('emptyDesc')}
      listHeader={<AddressFilter value={address} onChange={setAddress} placeholder={t('addressQueryTip')} />}
    />
  )
}
