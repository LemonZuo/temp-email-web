import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightLeftIcon, AtSignIcon, InboxIcon, LinkIcon, MailPlusIcon, RotateCwIcon, UnlinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { confirm } from '@/components/common/confirm'
import { EmptyState } from '@/components/common/empty-state'
import { AddressLoginForm, CreateAddressForm, type NewAddressBody, type NewAddressResponse } from '@/features/mailbox/components/address-forms'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { queryClient } from '@/lib/query-client'
import { leaveAddress, switchAddress } from '@/lib/session'
import { useApp } from '@/store/app'
import { useAuth } from '@/store/auth'
import { defineMessages, useT } from '@/i18n'
import { getTelegramInitData } from './telegram-web-app'

export { isTelegramWebApp } from './telegram-web-app'

const messages = defineMessages({
  zh: {
    address: '地址',
    bind: '绑定',
    create: '创建',
    bindAddressSuccess: '绑定地址成功',
    bindAddressError: '绑定到 Telegram 失败',
    changeMailAddress: '切换邮箱地址',
    switchTo: '切换',
    current: '当前',
    unbindMailAddress: '解绑邮箱地址',
    unbindConfirm: '确定要解绑此邮箱地址吗？',
    unbindDesc: '{address} 将不再推送到此 Telegram 账号，邮箱本身不会被删除。',
    noAddress: '还没有绑定的邮箱',
    noAddressDesc: '创建一个新邮箱，或登录已有邮箱并绑定到 Telegram。',
    loadError: '无法加载已绑定的邮箱',
    retry: '重试',
    notInTelegram: '请在 Telegram 中打开此页面。',
    bindTip: '登录已有邮箱后会自动绑定到当前 Telegram 账号。',
  },
  en: {
    address: 'Address',
    bind: 'Bind',
    create: 'Create',
    bindAddressSuccess: 'Bind Address Success',
    bindAddressError: 'Failed to bind the address to Telegram',
    changeMailAddress: 'Change Mail Address',
    switchTo: 'Switch',
    current: 'Current',
    unbindMailAddress: 'Unbind Mail Address',
    unbindConfirm: 'Unbind this address?',
    unbindDesc: '{address} will no longer be pushed to this Telegram account. The mailbox itself is not deleted.',
    noAddress: 'No bound addresses yet',
    noAddressDesc: 'Create a new mailbox, or log in to an existing one to bind it to Telegram.',
    loadError: 'Unable to load bound addresses',
    retry: 'Retry',
    notInTelegram: 'Please open this page inside Telegram.',
    bindTip: 'Logging in to an existing mailbox binds it to this Telegram account.',
  },
})

type BoundAddress = { address: string; jwt: string }

const QUERY_KEY = ['telegram', 'bind-address']

/**
 * Telegram Mini App address manager: list/switch/unbind the addresses bound to the Telegram
 * user, create a new one (`/telegram/new_address`) or log in to an existing one and bind it.
 */
export function TelegramAddressPanel({ onSwitched }: { onSwitched?: () => void }) {
  const t = useT(messages)
  const openSettings = useApp((s) => s.openSettings)
  const userEmail = useApp((s) => s.userSettings.user_email)
  const currentAddress = useApp((s) => s.addressSettings.address)
  const initData = getTelegramInitData()
  const canCreate = openSettings.enableUserCreateEmail && !(openSettings.disableAnonymousUserCreateEmail && !userEmail)
  const [tab, setTab] = useState('address')
  const [busy, setBusy] = useState('')

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.post<BoundAddress[] | null>('/telegram/get_bind_address', { initData })
      return Array.isArray(res) ? res : []
    },
    enabled: !!initData,
  })

  if (!initData) {
    return (
      <Alert>
        <AlertDescription>{t('notInTelegram')}</AlertDescription>
      </Alert>
    )
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })

  const switchTo = async (row: BoundAddress) => {
    setBusy(row.address)
    try {
      await switchAddress(row.jwt)
      onSwitched?.()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy('')
    }
  }

  const unbind = async (row: BoundAddress) => {
    const ok = await confirm({
      title: t('unbindConfirm'),
      description: t('unbindDesc', { address: row.address }),
      destructive: true,
      confirmText: t('unbindMailAddress'),
    })
    if (!ok) return
    setBusy(row.address)
    try {
      await api.post('/telegram/unbind_address', { initData, address: row.address })
      toast.success(t('success'))
      if (row.address === currentAddress) leaveAddress()
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy('')
    }
  }

  /** After logging in with a credential/password, bind the now-current JWT to the Telegram user. */
  const bindCurrent = async () => {
    try {
      await api.post('/telegram/bind_address', { initData, jwt: useAuth.getState().jwt })
      toast.success(t('bindAddressSuccess'))
      await refresh()
    } catch (error) {
      toast.error(`${t('bindAddressError')}: ${errorMessage(error)}`)
    }
  }

  const newAddress = (body: NewAddressBody) =>
    api.post<NewAddressResponse>('/telegram/new_address', {
      initData,
      address: `${body.name}@${body.domain}`,
      cf_token: body.cf_token,
      enableRandomSubdomain: body.enableRandomSubdomain,
    })

  /** `/telegram/new_address` already binds the address; just switch to it and show the credential. */
  const onCreated = async (res: NewAddressResponse) => {
    await switchAddress(res.jwt)
    useAuth.getState().setAddressPassword(res.password || '')
    useApp.getState().set({ showCredential: true })
    await refresh()
    onSwitched?.()
  }

  const rows = query.data || []

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4 w-full">
        <TabsTrigger value="address">
          {t('address')}
          {rows.length > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 tabular-nums">
              {rows.length}
            </Badge>
          )}
        </TabsTrigger>
        {canCreate && <TabsTrigger value="create">{t('create')}</TabsTrigger>}
        <TabsTrigger value="bind">{t('bind')}</TabsTrigger>
      </TabsList>

      <TabsContent value="address">
        {query.isLoading ? (
          <div className="grid gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState icon={<InboxIcon />} title={t('loadError')} description={errorMessage(query.error)} className="p-6">
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? <Spinner /> : <RotateCwIcon />}
              {t('retry')}
            </Button>
          </EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={<InboxIcon />} title={t('noAddress')} description={t('noAddressDesc')} className="p-6">
            <div className="flex flex-wrap justify-center gap-2">
              {canCreate && (
                <Button size="sm" onClick={() => setTab('create')}>
                  <MailPlusIcon />
                  {t('create')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setTab('bind')}>
                <LinkIcon />
                {t('bind')}
              </Button>
            </div>
          </EmptyState>
        ) : (
          <ul className="grid gap-2">
            {rows.map((row) => {
              const isCurrent = row.address === currentAddress
              return (
                <li key={row.address} className="flex items-center gap-3 rounded-lg border p-2.5 pl-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <AtSignIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm" title={row.address}>
                      {row.address}
                    </div>
                    {isCurrent && (
                      <Badge variant="secondary" className="mt-0.5">
                        {t('current')}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={isCurrent ? 'ghost' : 'outline'}
                    disabled={!!busy || isCurrent}
                    onClick={() => switchTo(row)}
                    aria-label={t('changeMailAddress')}
                    title={t('changeMailAddress')}
                  >
                    {busy === row.address ? <Spinner /> : <ArrowRightLeftIcon />}
                    <span className="hidden min-[400px]:inline">{t('switchTo')}</span>
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={!!busy}
                    onClick={() => unbind(row)}
                    aria-label={t('unbindMailAddress')}
                    title={t('unbindMailAddress')}
                  >
                    <UnlinkIcon />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </TabsContent>

      {canCreate && (
        <TabsContent value="create">
          <CreateAddressForm newAddress={newAddress} onCreated={onCreated} enableExpiry={false} />
        </TabsContent>
      )}

      <TabsContent value="bind" className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t('bindTip')}</p>
        <AddressLoginForm onSuccess={bindCurrent} />
      </TabsContent>
    </Tabs>
  )
}
