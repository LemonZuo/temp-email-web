import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CoinsIcon, MailsIcon, SendIcon, ShieldAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/common/empty-state'
import { RouteFallback } from '@/components/common/route-fallback'
import { ComposeForm } from '@/components/compose/compose-form'
import { api, type ListResponse } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { queryClient } from '@/lib/query-client'
import { sanitizeHtml } from '@/lib/sanitize'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'
import { BoundAddressPicker } from '../components/bound-address-picker'
import { isValidAddressQuery, type BoundAddress } from '../session'

const messages = defineMessages({
  zh: {
    from: '发件人',
    balance: '剩余发信额度 {n}',
    balanceUnavailable: '当前地址暂无发信额度',
    requestAccessTip:
      '发信权限和额度按邮箱地址独立管理。当前地址 {address} 暂无可用额度，请为此地址申请发信权限或联系管理员。',
    requestAccess: '申请发信权限',
    requestSuccess: '已为当前地址提交发信权限申请',
    adminContact: '如果你需要帮助，请联系管理员',
    noAddress: '还没有可用于发信的邮箱',
    noAddressDesc: '请先在「我的邮箱」中创建或绑定一个邮箱地址。',
    goAddresses: '前往我的邮箱',
    sentTip: '请查看已发送，如果发送失败，请检查额度或稍后重试。',
    loadFailed: '无法读取该地址的发信设置',
  },
  en: {
    from: 'From',
    balance: '{n} sends left',
    balanceUnavailable: 'No send balance for this address',
    requestAccessTip:
      'Send permission and balance are managed separately for each email address. The current address, {address}, has no available balance. Request permission for this address or contact the admin.',
    requestAccess: 'Request send access',
    requestSuccess: 'Send permission requested for the current address',
    adminContact: 'If you need help, please contact the administrator',
    noAddress: 'No address to send from',
    noAddressDesc: 'Create or bind an address in “My addresses” first.',
    goAddresses: 'Go to My addresses',
    sentTip: 'Check the Sent folder. If it failed, check your balance or try again later.',
    loadFailed: 'Could not load the send settings of this address',
  },
})

type SenderSettings = { address: string; send_balance: number }

/** Picks the initial sender: `?from=<address>` when it is bound to the user, otherwise the newest bound address. */
async function resolveInitialSender(from: string): Promise<BoundAddress | null> {
  if (from) {
    const search = isValidAddressQuery(from) ? `&query=${encodeURIComponent(from)}` : ''
    const res = await api.get<ListResponse<BoundAddress>>(`/user_api/bind_address?limit=100&offset=0${search}`)
    const match = res.results.find((a) => a.name === from)
    if (match) return match
  }
  const res = await api.get<ListResponse<BoundAddress>>('/user_api/bind_address?limit=1&offset=0')
  return res.results[0] ?? null
}

/** `/user/compose` — send from one of the bound addresses. */
export default function ComposePage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const from = searchParams.get('from') || ''
  const adminContact = useApp((s) => s.openSettings.adminContact)
  const [picked, setPicked] = useState<BoundAddress | null>(null)
  const [requesting, setRequesting] = useState(false)

  const initial = useQuery({
    queryKey: ['user', 'bind_address', 'compose-initial', from],
    queryFn: () => resolveInitialSender(from),
    enabled: !picked,
  })
  const sender = picked ?? initial.data ?? null

  const settings = useQuery({
    queryKey: ['user', 'address', sender?.id, 'settings'],
    queryFn: () => api.get<SenderSettings>(`/user_api/address/${sender!.id}/settings`),
    enabled: !!sender,
  })

  useEffect(() => {
    if (initial.error) toast.error(errorMessage(initial.error))
  }, [initial.error])
  useEffect(() => {
    if (settings.error) toast.error(errorMessage(settings.error))
  }, [settings.error])

  const pick = (address: BoundAddress | null) => {
    if (!address) return
    setPicked(address)
    if (from) setSearchParams({}, { replace: true })
  }

  if (!sender) {
    if (initial.isLoading) return <RouteFallback />
    return (
      <EmptyState
        className="h-full"
        icon={<MailsIcon />}
        title={t('noAddress')}
        description={initial.error ? errorMessage(initial.error) : t('noAddressDesc')}
      >
        <Button onClick={() => navigate('/user')}>
          <MailsIcon />
          {t('goAddresses')}
        </Button>
      </EmptyState>
    )
  }

  const picker = (
    <BoundAddressPicker value={sender.name} onChange={pick} variant="ghost" className="-ml-2 h-8 max-w-full sm:max-w-80" />
  )
  const balance = settings.data?.send_balance || 0

  if (settings.isLoading || !settings.data) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-11 items-center gap-3 border-b px-4">
          <span className="w-16 shrink-0 text-sm text-muted-foreground">{t('from')}</span>
          {picker}
        </div>
        {settings.isError ? (
          <EmptyState
            className="flex-1"
            icon={<ShieldAlertIcon />}
            title={t('loadFailed')}
            description={errorMessage(settings.error)}
          >
            <Button variant="outline" onClick={() => settings.refetch()}>
              {t('refresh')}
            </Button>
          </EmptyState>
        ) : (
          <div className="mx-auto grid w-full max-w-7xl gap-3 p-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        )}
      </div>
    )
  }

  if (balance <= 0) {
    const requestAccess = async () => {
      setRequesting(true)
      try {
        await api.post(`/user_api/address/${sender.id}/request_send_mail_access`, {})
        toast.success(t('requestSuccess'))
        await settings.refetch()
      } catch (error) {
        toast.error(errorMessage(error))
      } finally {
        setRequesting(false)
      }
    }
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-11 items-center gap-3 border-b px-4">
          <span className="w-16 shrink-0 text-sm text-muted-foreground">{t('from')}</span>
          {picker}
        </div>
        <EmptyState
          className="flex-1"
          icon={<ShieldAlertIcon />}
          title={t('balanceUnavailable')}
          description={t('requestAccessTip', { address: settings.data.address || sender.name })}
        >
          <Button onClick={requestAccess} disabled={requesting}>
            {requesting ? <Spinner /> : <SendIcon />}
            {t('requestAccess')}
          </Button>
          {adminContact && (
            <p className="text-sm text-muted-foreground">
              {t('adminContact')} (
              <span className="[&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeHtml(adminContact) }} />)
            </p>
          )}
        </EmptyState>
      </div>
    )
  }

  return (
    <ComposeForm
      fromSlot={
        <div className="flex min-w-40 flex-1 items-center gap-2">
          {picker}
          <Badge variant="secondary" className="hidden shrink-0 gap-1 sm:inline-flex">
            <CoinsIcon className="size-3" />
            {t('balance', { n: balance })}
          </Badge>
        </div>
      }
      onSend={(payload) => api.post(`/user_api/address/${sender.id}/send_mail`, payload)}
      sentHint={t('sentTip')}
      onSent={() => {
        void queryClient.invalidateQueries({ queryKey: ['user', 'sendbox'] })
        void queryClient.invalidateQueries({ queryKey: ['user', 'address', sender.id, 'settings'] })
        navigate('/user/sent')
      }}
    />
  )
}
