import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckIcon, ChevronsUpDownIcon, KeyRoundIcon, LogOutIcon, MailPlusIcon, Trash2Icon, UserRoundIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SidebarGroup, SidebarMenu, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { CopyButton } from '@/components/common/copy-button'
import { SenderAvatar } from '@/components/mail/mail-list'
import { api, type ListResponse } from '@/lib/api'
import { decodeAddressToken, isPasswordLoginToken } from '@/lib/address-token'
import { errorMessage } from '@/lib/format'
import { leaveAddress, switchAddress } from '@/lib/session'
import { useApp, useFlags } from '@/store/app'
import { useAuth } from '@/store/auth'
import { AddressLoginForm, CreateAddressForm } from './address-forms'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    currentMailbox: '当前邮箱',
    linkedMailboxes: '已绑定邮箱',
    localAddresses: '本地邮箱',
    passwordLogin: '密码',
    credentialLogin: '凭证',
    addMailbox: '新建或登录邮箱',
    credential: '查看邮箱凭证',
    leave: '退出当前邮箱',
    removeLocal: '从本地移除',
    removed: '已从本地移除',
    create: '新建邮箱',
    login: '登录邮箱',
    addMailboxDesc: '创建一个新地址，或登录已有的邮箱。',
    localTip: '本地邮箱保存在浏览器中，清除缓存后可能丢失。',
    switched: '已切换到 {address}',
  },
  en: {
    currentMailbox: 'Current mailbox',
    linkedMailboxes: 'Linked mailboxes',
    localAddresses: 'Local mailboxes',
    passwordLogin: 'Password',
    credentialLogin: 'Credential',
    addMailbox: 'New or existing mailbox',
    credential: 'Show credential',
    leave: 'Leave this mailbox',
    removeLocal: 'Remove from this browser',
    removed: 'Removed from this browser',
    create: 'Create',
    login: 'Log in',
    addMailboxDesc: 'Create a new address or log in to an existing mailbox.',
    localTip: 'Local mailboxes are stored in this browser and may be lost when clearing site data.',
    switched: 'Switched to {address}',
  },
})

type BoundAddress = { id: number; name?: string; address?: string }

export function useDomainLabel() {
  const domains = useApp((s) => s.openSettings.domains)
  return (address: string) => {
    if (!address) return address
    const domain = address.split('@')[1]
    const label = domains.find((d) => d.value === domain)?.label
    return label && label !== domain ? address.replace(`@${domain}`, `@${label}`) : address
  }
}

export function AddMailboxDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT(messages)
  const navigate = useNavigate()
  const enableCreate = useApp((s) => s.openSettings.enableUserCreateEmail)
  const done = () => {
    onOpenChange(false)
    navigate('/')
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('addMailbox')}</DialogTitle>
          <DialogDescription>{t('addMailboxDesc')}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={enableCreate ? 'create' : 'login'}>
          <TabsList className="w-full">
            {enableCreate && <TabsTrigger value="create">{t('create')}</TabsTrigger>}
            <TabsTrigger value="login">{t('login')}</TabsTrigger>
          </TabsList>
          {enableCreate && (
            <TabsContent value="create" className="pt-3">
              <CreateAddressForm
                onCreated={async (res) => {
                  await switchAddress(res.jwt)
                  useAuth.getState().setAddressPassword(res.password || '')
                  useApp.getState().set({ showCredential: true })
                  done()
                }}
              />
            </TabsContent>
          )}
          <TabsContent value="login" className="pt-3">
            <AddressLoginForm onSuccess={done} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

/** Sidebar card showing the current address, with a menu to switch / add / leave mailboxes. */
export function AddressSwitcher() {
  const t = useT(messages)
  const navigate = useNavigate()
  const { isMobile } = useSidebar()
  const address = useApp((s) => s.addressSettings.address)
  const passwordLoginOnly = useApp((s) => s.openSettings.addressPasswordLoginOnly)
  const { jwt, localAddressCache, setLocalAddressCache } = useAuth()
  const { showUserMailboxes } = useFlags()
  const formatAddress = useDomainLabel()
  const [addOpen, setAddOpen] = useState(false)

  const bound = useQuery({
    queryKey: ['user', 'bind_address', 'switcher'],
    queryFn: () => api.get<ListResponse<BoundAddress>>('/user_api/bind_address?limit=100&offset=0'),
    enabled: showUserMailboxes,
  })
  const boundRows = useMemo(
    () => (bound.data?.results || []).map((r) => ({ id: r.id, address: r.address || r.name || '' })).filter((r) => r.address),
    [bound.data],
  )
  const localRows = useMemo(() => {
    const boundSet = new Set(boundRows.map((r) => r.address))
    return localAddressCache
      .map((token) => ({ token, payload: decodeAddressToken(token) }))
      .filter((r) => r.payload && !boundSet.has(r.payload.address))
      .filter((r) => !passwordLoginOnly || isPasswordLoginToken(r.payload))
      .map((r) => ({ token: r.token, address: r.payload!.address, password: isPasswordLoginToken(r.payload) }))
  }, [localAddressCache, boundRows, passwordLoginOnly])
  const showMethods = new Set(localRows.map((r) => r.password)).size > 1

  const switchTo = async (getJwt: () => Promise<string>, target: string) => {
    try {
      const next = await getJwt()
      if (!next) throw new Error('jwt not found')
      await switchAddress(next)
      toast.success(t('switched', { address: target }))
      navigate('/')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <SidebarGroup className="pb-0">
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-1 rounded-xl border bg-background p-1 pl-2 shadow-xs group-data-[collapsible=icon]:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left outline-none">
                  <SenderAvatar name={address} className="size-7 text-xs" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[11px] text-muted-foreground">{t('currentMailbox')}</div>
                    <div className="truncate font-mono text-xs font-medium" title={address}>
                      {formatAddress(address)}
                    </div>
                  </div>
                  <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72" align="start" side={isMobile ? 'bottom' : 'right'} sideOffset={8}>
                {boundRows.length > 0 && (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">{t('linkedMailboxes')}</DropdownMenuLabel>
                    {boundRows.map((r) => (
                      <DropdownMenuItem
                        key={`u-${r.id}`}
                        onClick={() =>
                          r.address !== address &&
                          switchTo(async () => (await api.get<{ jwt: string }>(`/user_api/bind_address_jwt/${r.id}`)).jwt, r.address)
                        }
                      >
                        <UserRoundIcon />
                        <span className="truncate font-mono text-xs">{formatAddress(r.address)}</span>
                        {r.address === address && <CheckIcon className="ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </DropdownMenuGroup>
                )}
                {localRows.length > 0 && (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground" title={t('localTip')}>
                      {t('localAddresses')}
                    </DropdownMenuLabel>
                    {localRows.map((r) => (
                      <DropdownMenuItem
                        key={r.token}
                        className="group/local"
                        onClick={() => r.token !== jwt && switchTo(async () => r.token, r.address)}
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-xs">{formatAddress(r.address)}</span>
                        {showMethods && (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                            {r.password ? t('passwordLogin') : t('credentialLogin')}
                          </Badge>
                        )}
                        {r.token === jwt ? (
                          <CheckIcon />
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="opacity-0 group-hover/local:opacity-100 focus:opacity-100"
                            aria-label={t('removeLocal')}
                            onClick={(e) => {
                              e.stopPropagation()
                              setLocalAddressCache(localAddressCache.filter((x) => x !== r.token))
                              toast.success(t('removed'))
                            }}
                          >
                            <Trash2Icon />
                          </Button>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </DropdownMenuGroup>
                )}
                <DropdownMenuItem onClick={() => setAddOpen(true)}>
                  <MailPlusIcon />
                  {t('addMailbox')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => useApp.getState().set({ showCredential: true })}>
                  <KeyRoundIcon />
                  {t('credential')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    leaveAddress()
                    navigate('/')
                  }}
                >
                  <LogOutIcon />
                  {t('leave')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <CopyButton value={address} />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
      <AddMailboxDialog open={addOpen} onOpenChange={setAddOpen} />
    </SidebarGroup>
  )
}
