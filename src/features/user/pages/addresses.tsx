import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRightLeftIcon,
  EllipsisIcon,
  InboxIcon,
  KeyRoundIcon,
  LogInIcon,
  MailPlusIcon,
  MailsIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  UnlinkIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddressCredentialDialog } from '@/components/common/address-credential-dialog'
import { confirm } from '@/components/common/confirm'
import { CopyButton } from '@/components/common/copy-button'
import { DataPagination } from '@/components/common/data-pagination'
import { EmptyState } from '@/components/common/empty-state'
import { Page, PageHeader } from '@/components/common/page'
import { usePagedQuery } from '@/hooks/use-paged-query'
import { api, type ListResponse } from '@/lib/api'
import { errorMessage, formatDateTime, parseUtcDate } from '@/lib/format'
import { queryClient } from '@/lib/query-client'
import { switchAddress } from '@/lib/session'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'
import { AddAddressDialog, TransferAddressDialog, type AddTab } from '../components/address-dialogs'
import { isValidAddressQuery, type BoundAddress } from '../session'

const messages = defineMessages({
  zh: {
    title: '我的邮箱',
    description: '绑定到当前账户的邮箱地址，可在任意设备上通过用户中心访问。',
    createAddress: '创建邮箱',
    bindAddress: '绑定已有邮箱',
    addressQueryTip: '搜索邮箱地址',
    invalidQuery: '搜索词最长 100 个字符，且不能包含 % 或 _',
    emailAddress: '邮箱地址',
    mail_count: '邮件数量',
    send_count: '发送数量',
    expires_at: '过期时间',
    neverExpires: '永不过期',
    expired: '已过期',
    current: '当前邮箱',
    openMailbox: '进入邮箱',
    viewMails: '查看邮件',
    viewSent: '查看已发送',
    addressCredential: '地址凭证',
    sessionToken: '会话 Token',
    transferAddress: '转移邮箱',
    unbindAddress: '解绑邮箱',
    unbindConfirm: '确定解绑 {address} 吗？',
    unbindAddressTip: '解绑前请切换到此邮箱地址并保存邮箱地址凭证。',
    unbindPasswordTip: '解绑前请保存邮箱密码，以便之后重新登录。',
    unbindSuccess: '已解绑邮箱',
    switched: '已切换到 {address}',
    emptyTitle: '还没有绑定邮箱',
    emptyDesc: '创建一个新邮箱地址，或登录已有邮箱将其绑定到当前账户。',
    noMatch: '没有匹配的邮箱地址',
    noMatchDesc: '换个关键字试试',
    clearSearch: '清除搜索',
  },
  en: {
    title: 'My addresses',
    description: 'Addresses bound to your account, reachable from any device through the user center.',
    createAddress: 'Create address',
    bindAddress: 'Bind existing',
    addressQueryTip: 'Search addresses',
    invalidQuery: 'Search term must be at most 100 characters and cannot contain % or _',
    emailAddress: 'Email Address',
    mail_count: 'Mails',
    send_count: 'Sent',
    expires_at: 'Expires At',
    neverExpires: 'Never',
    expired: 'Expired',
    current: 'Current',
    openMailbox: 'Open Mailbox',
    viewMails: 'View mails',
    viewSent: 'View sent',
    addressCredential: 'Address Credential',
    sessionToken: 'Session Token',
    transferAddress: 'Transfer Mailbox',
    unbindAddress: 'Unlink Mailbox',
    unbindConfirm: 'Unlink {address}?',
    unbindAddressTip: 'Before unbinding, please switch to this email address and save the email address credential.',
    unbindPasswordTip: 'Save the mailbox password before unlinking so you can log in again.',
    unbindSuccess: 'Mailbox unlinked',
    switched: 'Switched to {address}',
    emptyTitle: 'No addresses yet',
    emptyDesc: 'Create a new address, or sign in to an existing mailbox to bind it to your account.',
    noMatch: 'No matching addresses',
    noMatchDesc: 'Try another keyword',
    clearSearch: 'Clear search',
  },
})

type Credential = { address: string; jwt: string; password?: string }

const isExpired = (expiresAt: string | null | undefined) => {
  const date = parseUtcDate(expiresAt)
  return !!date && date.getTime() <= Date.now()
}

function CountBadge({ value }: { value?: number }) {
  const n = value || 0
  return (
    <Badge variant={n > 0 ? 'secondary' : 'outline'} className="min-w-8 justify-center tabular-nums">
      {n > 99 ? '99+' : n}
    </Badge>
  )
}

/** `/user` — addresses bound to the account. */
export default function AddressesPage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const openSettings = useApp((s) => s.openSettings)
  const currentAddress = useApp((s) => s.addressSettings.address)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [addTab, setAddTab] = useState<AddTab | null>(null)
  const [credential, setCredential] = useState<Credential | null>(null)
  const [transferTarget, setTransferTarget] = useState<BoundAddress | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const paged = usePagedQuery<BoundAddress>({
    queryKey: ['user', 'bind_address', 'list', { query }],
    fetchPage: (limit, offset) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (query) params.set('query', query)
      return api.get<ListResponse<BoundAddress>>(`/user_api/bind_address?${params}`)
    },
    initialPageSize: 20,
  })

  useEffect(() => {
    if (paged.error) toast.error(errorMessage(paged.error))
  }, [paged.error])

  /** After bind / unbind / transfer: refresh every user list (filters, sidebar switcher) and go to page 1. */
  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['user'] })
    paged.setPage(1)
  }

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    const q = queryInput.trim()
    if (!isValidAddressQuery(q)) return toast.error(t('invalidQuery'))
    setQueryInput(q)
    if (q !== query) setQuery(q)
    else if (paged.page !== 1) paged.setPage(1)
    else void paged.refetch()
  }

  const clearSearch = () => {
    setQueryInput('')
    setQuery('')
  }

  const getJwt = async (row: BoundAddress) => {
    const res = await api.get<{ jwt: string }>(`/user_api/bind_address_jwt/${row.id}`)
    if (!res?.jwt) throw new Error('jwt not found')
    return res.jwt
  }

  const openMailbox = async (row: BoundAddress) => {
    setBusyId(row.id)
    try {
      await switchAddress(await getJwt(row))
      toast.success(t('switched', { address: row.name }))
      navigate('/')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  const showCredential = async (row: BoundAddress) => {
    setBusyId(row.id)
    try {
      setCredential({ address: row.name, jwt: await getJwt(row) })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  const unbind = async (row: BoundAddress) => {
    const ok = await confirm({
      title: t('unbindConfirm', { address: row.name }),
      description: openSettings.addressPasswordLoginOnly ? t('unbindPasswordTip') : t('unbindAddressTip'),
      confirmText: t('unbindAddress'),
      destructive: true,
    })
    if (!ok) return
    try {
      await api.post('/user_api/unbind_address', { address_id: row.id })
      toast.success(t('unbindSuccess'))
      refreshAll()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const credentialLabel = openSettings.addressPasswordLoginOnly ? t('sessionToken') : t('addressCredential')
  const showExpiry = openSettings.enableAddressExpiry
  const columns = 5 + (showExpiry ? 1 : 0)
  const hasRows = paged.items.length > 0

  const createButton = openSettings.enableUserCreateEmail && (
    <Button onClick={() => setAddTab('create')}>
      <MailPlusIcon />
      {t('createAddress')}
    </Button>
  )
  const bindButton = (
    <Button variant="outline" onClick={() => setAddTab('bind')}>
      <LogInIcon />
      {t('bindAddress')}
    </Button>
  )

  return (
    <Page wide>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            {bindButton}
            {createButton}
          </>
        }
      />

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={search} className="min-w-0 flex-1 sm:max-w-sm">
            <InputGroup>
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                data-testid="user-address-search"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={t('addressQueryTip')}
              />
              {queryInput && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="icon-xs" aria-label={t('clearSearch')} onClick={clearSearch}>
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </form>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('refresh')}
            onClick={() => (paged.page === 1 ? paged.refetch() : paged.setPage(1))}
          >
            <RefreshCwIcon className={cn(paged.isFetching && 'animate-spin')} />
          </Button>
          <span className="ml-auto text-sm text-muted-foreground">{t('total', { n: paged.total })}</span>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table className="sm:min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t('emailAddress')}</TableHead>
                <TableHead className="hidden w-24 text-center sm:table-cell">{t('mail_count')}</TableHead>
                <TableHead className="hidden w-24 text-center sm:table-cell">{t('send_count')}</TableHead>
                {showExpiry && <TableHead className="hidden md:table-cell">{t('expires_at')}</TableHead>}
                <TableHead className="hidden lg:table-cell">{t('createdAt')}</TableHead>
                <TableHead className="pr-4 text-right sm:w-44">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns} className="px-4">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !hasRows ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns}>
                    {query ? (
                      <EmptyState icon={<SearchIcon />} title={t('noMatch')} description={t('noMatchDesc')}>
                        <Button variant="outline" size="sm" onClick={clearSearch}>
                          <XIcon />
                          {t('clearSearch')}
                        </Button>
                      </EmptyState>
                    ) : (
                      <EmptyState icon={<MailsIcon />} title={t('emptyTitle')} description={t('emptyDesc')}>
                        <div className="flex flex-wrap justify-center gap-2">
                          {bindButton}
                          {createButton}
                        </div>
                      </EmptyState>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paged.items.map((row) => {
                  const isCurrent = !!currentAddress && row.name === currentAddress
                  const expired = showExpiry && isExpired(row.expires_at)
                  return (
                    <TableRow key={row.id} className={cn(isCurrent && 'bg-primary/5')}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-1">
                          <span className="max-w-[10.5rem] truncate font-mono text-sm font-medium sm:max-w-80" title={row.name}>
                            {row.name}
                          </span>
                          <CopyButton value={row.name} size="icon-xs" />
                          {isCurrent && (
                            <Badge variant="outline" className="shrink-0 border-primary/40 text-primary">
                              {t('current')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-center sm:table-cell">
                        <CountBadge value={row.mail_count} />
                      </TableCell>
                      <TableCell className="hidden text-center sm:table-cell">
                        <CountBadge value={row.send_count} />
                      </TableCell>
                      {showExpiry && (
                        <TableCell className="hidden text-sm whitespace-nowrap md:table-cell">
                          {row.expires_at ? (
                            <span className={cn(expired && 'text-destructive')}>
                              {formatDateTime(row.expires_at)}
                              {expired && ` · ${t('expired')}`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{t('neverExpires')}</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground lg:table-cell">
                        {formatDateTime(row.created_at)}
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={t('openMailbox')}
                            disabled={busyId === row.id}
                            onClick={() => openMailbox(row)}
                          >
                            {busyId === row.id ? <Spinner /> : <InboxIcon />}
                            <span className="hidden sm:inline">{t('openMailbox')}</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label={t('more')}>
                                <EllipsisIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-44">
                              <DropdownMenuItem onClick={() => showCredential(row)}>
                                <KeyRoundIcon />
                                {credentialLabel}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/user/mails?address=${encodeURIComponent(row.name)}`)}
                              >
                                <MailsIcon />
                                {t('viewMails')}
                              </DropdownMenuItem>
                              {openSettings.enableSendMail && (
                                <DropdownMenuItem
                                  onClick={() => navigate(`/user/sent?address=${encodeURIComponent(row.name)}`)}
                                >
                                  <SendIcon />
                                  {t('viewSent')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setTransferTarget(row)}>
                                <ArrowRightLeftIcon />
                                {t('transferAddress')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => unbind(row)}>
                                <UnlinkIcon />
                                {t('unbindAddress')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {paged.total > 0 && (
          <DataPagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
            pageSizes={[20, 50, 100]}
          />
        )}
      </div>

      <AddAddressDialog
        tab={addTab}
        onTabChange={setAddTab}
        onClose={() => setAddTab(null)}
        onCreated={(res) => {
          setAddTab(null)
          setCredential({
            address: res.address || useApp.getState().addressSettings.address,
            jwt: res.jwt,
            password: res.password,
          })
          refreshAll()
        }}
        onBound={() => {
          setAddTab(null)
          refreshAll()
        }}
      />

      <TransferAddressDialog
        address={transferTarget}
        onClose={() => setTransferTarget(null)}
        onTransferred={() => {
          setTransferTarget(null)
          refreshAll()
        }}
      />

      <AddressCredentialDialog
        open={!!credential}
        onOpenChange={(o) => !o && setCredential(null)}
        address={credential?.address || ''}
        jwt={credential?.jwt || ''}
        addressPassword={credential?.password}
      />
    </Page>
  )
}
