import { useState } from 'react'
import { useNavigate } from 'react-router'
import { CoinsIcon, SendIcon, ShieldAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/common/empty-state'
import { ComposeForm } from '@/components/compose/compose-form'
import { api, loadAddressSettings } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { sanitizeHtml } from '@/lib/sanitize'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    balance: '剩余发信额度 {n}',
    balanceUnavailable: '当前地址暂无发信额度',
    requestAccessTip: '发信权限和额度按邮箱地址独立管理。当前地址 {address} 暂无可用额度，请为此地址申请发信权限或联系管理员。',
    requestAccess: '申请发信权限',
    requestSuccess: '已为当前地址提交发信权限申请',
    adminContact: '管理员联系方式：',
    sentTip: '请查看发件箱，如果发送失败，请检查额度或稍后重试。',
  },
  en: {
    balance: '{n} sends left',
    balanceUnavailable: 'No send balance for this address',
    requestAccessTip:
      'Send permission and balance are managed per address. {address} has no available balance. Request permission for this address or contact the admin.',
    requestAccess: 'Request send access',
    requestSuccess: 'Send permission requested for the current address',
    adminContact: 'Admin contact: ',
    sentTip: 'Check your sent box. If it failed, check your balance or try again later.',
  },
})

/** `/compose` — write a mail from the current address. */
export default function ComposePage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const { address, send_balance } = useApp((s) => s.addressSettings)
  const adminContact = useApp((s) => s.openSettings.adminContact)
  const [requesting, setRequesting] = useState(false)

  if (!send_balance || send_balance <= 0) {
    const requestAccess = async () => {
      setRequesting(true)
      try {
        await api.post('/api/request_send_mail_access', {})
        toast.success(t('requestSuccess'))
        await loadAddressSettings()
      } catch (error) {
        toast.error(errorMessage(error))
      } finally {
        setRequesting(false)
      }
    }
    return (
      <EmptyState
        className="h-full"
        icon={<ShieldAlertIcon />}
        title={t('balanceUnavailable')}
        description={t('requestAccessTip', { address })}
      >
        <Button onClick={requestAccess} disabled={requesting}>
          {requesting ? <Spinner /> : <SendIcon />}
          {t('requestAccess')}
        </Button>
        {adminContact && (
          <p className="text-sm text-muted-foreground">
            {t('adminContact')}
            <span className="[&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeHtml(adminContact) }} />
          </p>
        )}
      </EmptyState>
    )
  }

  return (
    <ComposeForm
      fromSlot={
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-sm font-medium">{address}</span>
          <Badge variant="secondary" className="shrink-0 gap-1">
            <CoinsIcon className="size-3" />
            {t('balance', { n: send_balance })}
          </Badge>
        </div>
      }
      onSend={(payload) => api.post('/api/send_mail', payload)}
      sentHint={t('sentTip')}
      onSent={() => {
        void loadAddressSettings()
        navigate('/sent')
      }}
    />
  )
}
