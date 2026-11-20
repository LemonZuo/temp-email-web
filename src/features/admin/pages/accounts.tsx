import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  EllipsisIcon,
  EraserIcon,
  InboxIcon,
  KeyRoundIcon,
  MailPlusIcon,
  MailsIcon,
  RefreshCwIcon,
  SendIcon,
  ShieldCheckIcon,
  SquareUserRoundIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddressCredentialDialog } from '@/components/common/address-credential-dialog'
import { confirm } from '@/components/common/confirm'
import { DataPagination } from '@/components/common/data-pagination'
import { Page, PageHeader } from '@/components/common/page'
import { usePagedQuery } from '@/hooks/use-paged-query'
import { api, type ListResponse } from '@/lib/api'
import { hashPassword } from '@/lib/crypto'
import { errorMessage, formatDateTime, parseUtcDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app'
import { BatchProgressDialog, type BatchProgress } from '@/features/admin/components/core/batch-progress-dialog'
import { CountBadge, SortableHead, TableEmptyRow, TableLoadingRows } from '@/features/admin/components/core/data-table'
import type { SortState } from '@/features/admin/components/core/helpers'
import { PasswordDialog } from '@/features/admin/components/core/password-dialog'
import { SearchForm } from '@/features/admin/components/core/search-form'
import { adminPath } from '@/features/admin/paths'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '地址列表',
    description: '查看、搜索和管理所有邮箱地址。',
    createAddress: '创建地址',
    addressQueryTip: '留空查询所有邮箱地址',
    emailAddress: '邮箱地址',
    created_at: '创建时间',
    updated_at: '更新时间',
    expires_at: '过期时间',
    neverExpires: '永不过期',
    expired: '已过期',
    source_meta: '来源',
    mail_count: '邮件数量',
    send_count: '发送数量',
    showCredential: '查看邮箱地址凭证',
    viewMails: '查看邮件',
    viewSendBox: '查看发件箱',
    clearInbox: '清空收件箱',
    clearInboxTip: '确定要清空这个邮箱的收件箱吗？',
    clearSentItems: '清空发件箱',
    clearSentItemsTip: '确定要清空这个邮箱的发件箱吗？',
    resetPassword: '重置密码',
    newPassword: '新密码',
    passwordResetSuccess: '密码重置成功',
    deleteMailbox: '删除邮箱',
    deleteTip: '确定要删除这个邮箱吗？',
    deleteDesc: '{address} 的收件、发件、发信权限和用户绑定都会被删除。此操作不可撤销。',
    selectAll: '全选本页',
    unselectAll: '取消全选',
    selectedItems: '已选择 {n} 项',
    multiDelete: '批量删除',
    multiDeleteTip: '确定要删除选中的邮箱吗？',
    multiClearInbox: '批量清空收件箱',
    multiClearInboxTip: '确定要清空选中邮箱的收件箱吗？',
    multiClearSentItems: '批量清空发件箱',
    multiClearSentItemsTip: '确定要清空选中邮箱的发件箱吗？',
    multiTip: '将处理选中的 {n} 个邮箱。此操作不可撤销。',
    pleaseSelectAddress: '请选择邮箱',
    batchFailed: '{n} 项操作失败',
    emptyTitle: '没有邮箱地址',
    emptyQuery: '没有匹配 “{query}” 的地址',
    emptyDesc: '创建的邮箱地址会显示在这里',
    selectRow: '选择 {address}',
  },
  en: {
    title: 'Address list',
    description: 'Browse, search and manage every mailbox address.',
    createAddress: 'Create address',
    addressQueryTip: 'Leave blank to query all email addresses',
    emailAddress: 'Email Address',
    created_at: 'Created At',
    updated_at: 'Update At',
    expires_at: 'Expires At',
    neverExpires: 'Never',
    expired: 'Expired',
    source_meta: 'Source',
    mail_count: 'Mail Count',
    send_count: 'Send Count',
    showCredential: 'Show Mail Address Credential',
    viewMails: 'View Mails',
    viewSendBox: 'View SendBox',
    clearInbox: 'Clear Inbox',
    clearInboxTip: 'Are you sure to clear inbox for this email?',
    clearSentItems: 'Clear Sent Items',
    clearSentItemsTip: 'Are you sure to clear sent items for this email?',
    resetPassword: 'Reset Password',
    newPassword: 'New Password',
    passwordResetSuccess: 'Password reset successfully',
    deleteMailbox: 'Delete Mailbox',
    deleteTip: 'Are you sure you want to delete this mailbox?',
    deleteDesc: 'Inbox, sent items, send access and user bindings of {address} will be deleted. This cannot be undone.',
    selectAll: 'Select All of This Page',
    unselectAll: 'Unselect All',
    selectedItems: '{n} selected',
    multiDelete: 'Multi Delete',
    multiDeleteTip: 'Are you sure to delete selected addresses?',
    multiClearInbox: 'Multi Clear Inbox',
    multiClearInboxTip: 'Are you sure to clear inbox for selected addresses?',
    multiClearSentItems: 'Multi Clear Sent Items',
    multiClearSentItemsTip: 'Are you sure to clear sent items for selected addresses?',
    multiTip: '{n} selected addresses will be processed. This cannot be undone.',
    pleaseSelectAddress: 'Please select a mailbox',
    batchFailed: '{n} operations failed',
    emptyTitle: 'No addresses',
    emptyQuery: 'No address matches “{query}”',
    emptyDesc: 'Created mailbox addresses show up here',
    selectRow: 'Select {address}',
  },
})

type AddressRow = {
  id: number
  name: string
  created_at: string
  updated_at: string
  expires_at?: string | null
  source_meta?: string | null
  mail_count: number
  send_count: number
}

type SortKey = 'id' | 'name' | 'created_at' | 'updated_at' | 'source_meta' | 'mail_count' | 'send_count'

const IPV4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
const IPV6 = /^[0-9a-fA-F:]+$/
const isIp = (value: string) => IPV4.test(value) || (value.includes(':') && IPV6.test(value) && !value.startsWith('tg:'))

function SourceMeta({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  if (isIp(value)) {
    return (
      <a
        href={`https://ip.im/${value}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-primary underline-offset-4 hover:underline"
      >
        {value}
      </a>
    )
  }
  return (
    <Badge variant="outline" className="max-w-40 truncate font-normal">
      {value}
    </Badge>
  )
}

/** `/console/accounts` — every address with counts, row actions and bulk actions. */
export default function AccountsPage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const openSettings = useApp((s) => s.openSettings)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState<SortKey>>({ by: '', order: '' })
  const [selection, setSelection] = useState<{ key: string; ids: Set<number> }>({ key: '', ids: new Set() })
  const [now] = useState(Date.now)
  const [credential, setCredential] = useState<{ address: string; jwt: string } | null>(null)
  const [resetTarget, setResetTarget] = useState<AddressRow | null>(null)
  const [progress, setProgress] = useState<BatchProgress | null>(null)

  const paged = usePagedQuery<AddressRow>({
    queryKey: ['admin', 'accounts', { query, sortBy: sort.by, sortOrder: sort.order }],
    fetchPage: (limit, offset) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (query) params.set('query', query)
      if (sort.by) params.set('sort_by', sort.by)
      if (sort.order) params.set('sort_order', sort.order)
      return api.get<ListResponse<AddressRow>>(`/admin/address?${params}`)
    },
  })
  const { items } = paged

  // Selection is per page: it is dropped when the page / filters change
  const selectionKey = JSON.stringify([paged.page, paged.pageSize, query, sort])
  const checked = selection.key === selectionKey ? selection.ids : new Set<number>()
  const setChecked = (update: Set<number> | ((prev: Set<number>) => Set<number>)) =>
    setSelection((prev) => {
      const base = prev.key === selectionKey ? prev.ids : new Set<number>()
      return { key: selectionKey, ids: typeof update === 'function' ? update(base) : update }
    })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] })

  const showExpiry = openSettings.enableAddressExpiry
  const columns = 9 + (showExpiry ? 1 : 0)
  const selectedRows = items.filter((row) => checked.has(row.id))
  const allChecked = items.length > 0 && items.every((row) => checked.has(row.id))
  const someChecked = !allChecked && items.some((row) => checked.has(row.id))

  const toggle = (id: number, value: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })

  const viewMails = (row: AddressRow) => navigate(`${adminPath('mails')}?address=${encodeURIComponent(row.name)}`)
  const viewSent = (row: AddressRow) => navigate(`${adminPath('sendbox')}?address=${encodeURIComponent(row.name)}`)

  const showCredential = async (row: AddressRow) => {
    try {
      const { jwt } = await api.get<{ jwt: string }>(`/admin/show_password/${row.id}`)
      setCredential({ address: row.name, jwt })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const runSingle = async (options: { title: string; description: string; request: () => Promise<unknown> }) => {
    if (!(await confirm({ title: options.title, description: options.description, destructive: true }))) return
    try {
      await options.request()
      toast.success(t('success'))
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const deleteAddress = (row: AddressRow) =>
    runSingle({
      title: t('deleteTip'),
      description: t('deleteDesc', { address: row.name }),
      request: () => api.delete(`/admin/delete_address/${row.id}`),
    })
  const clearInbox = (row: AddressRow) =>
    runSingle({
      title: t('clearInboxTip'),
      description: row.name,
      request: () => api.delete(`/admin/clear_inbox/${row.id}`),
    })
  const clearSent = (row: AddressRow) =>
    runSingle({
      title: t('clearSentItemsTip'),
      description: row.name,
      request: () => api.delete(`/admin/clear_sent_items/${row.id}`),
    })

  /** Sequential bulk operation over the selected rows of this page; failed rows stay selected. */
  const runBatch = async (options: {
    title: string
    confirmTitle: string
    request: (id: number) => Promise<unknown>
    shouldSkip?: (row: AddressRow) => boolean
  }) => {
    const rows = selectedRows
    if (rows.length === 0) return toast.error(t('pleaseSelectAddress'))
    if (!(await confirm({ title: options.confirmTitle, description: t('multiTip', { n: rows.length }), destructive: true })))
      return
    const failed: number[] = []
    setProgress({ title: options.title, done: 0, total: rows.length, failed: 0, running: true })
    for (const [index, row] of rows.entries()) {
      try {
        if (!options.shouldSkip?.(row)) await options.request(row.id)
      } catch (error) {
        console.error(`${options.title} failed for address ${row.id}:`, error)
        failed.push(row.id)
      }
      setProgress((p) => p && { ...p, done: index + 1, failed: failed.length })
    }
    setProgress((p) => p && { ...p, running: false })
    await refresh()
    setChecked(new Set(failed))
    if (failed.length) toast.error(t('batchFailed', { n: failed.length }))
    else toast.success(t('success'))
  }

  const batchDelete = () =>
    runBatch({
      title: t('multiDelete'),
      confirmTitle: t('multiDeleteTip'),
      request: (id) => api.delete(`/admin/delete_address/${id}`),
    })
  const batchClearInbox = () =>
    runBatch({
      title: t('multiClearInbox'),
      confirmTitle: t('multiClearInboxTip'),
      shouldSkip: (row) => row.mail_count <= 0,
      request: (id) => api.delete(`/admin/clear_inbox/${id}`),
    })
  const batchClearSent = () =>
    runBatch({
      title: t('multiClearSentItems'),
      confirmTitle: t('multiClearSentItemsTip'),
      shouldSkip: (row) => row.send_count <= 0,
      request: (id) => api.delete(`/admin/clear_sent_items/${id}`),
    })

  const sortHead = (key: SortKey, label: string, className?: string) => (
    <SortableHead column={key} sort={sort} onSort={setSort} className={className}>
      {label}
    </SortableHead>
  )

  return (
    <Page wide>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild>
            <Link to={adminPath('accounts/new')}>
              <MailPlusIcon />
              {t('createAddress')}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchForm className="flex-1 sm:max-w-96" value={query} onSearch={setQuery} placeholder={t('addressQueryTip')} />
          <Button variant="outline" size="icon" onClick={() => void paged.refetch()} aria-label={t('refresh')}>
            <RefreshCwIcon className={cn(paged.isFetching && 'animate-spin')} />
          </Button>
        </div>

        {checked.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-primary/5 px-3 py-2">
            <span className="mr-1 text-sm font-medium">{t('selectedItems', { n: selectedRows.length })}</span>
            <Button variant="ghost" size="sm" onClick={() => setChecked(new Set(items.map((r) => r.id)))}>
              {t('selectAll')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setChecked(new Set())}>
              <XIcon />
              {t('unselectAll')}
            </Button>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Button variant="outline" size="sm" onClick={() => void batchClearInbox()}>
                <EraserIcon />
                {t('multiClearInbox')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void batchClearSent()}>
                <EraserIcon />
                {t('multiClearSentItems')}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void batchDelete()}>
                <Trash2Icon />
                {t('multiDelete')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table className="table-sticky-end min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                  onCheckedChange={(v) => setChecked(v === true ? new Set(items.map((r) => r.id)) : new Set())}
                  aria-label={t('selectAll')}
                  disabled={items.length === 0}
                />
              </TableHead>
              {sortHead('id', t('id'), 'w-16')}
              {sortHead('name', t('emailAddress'))}
              {sortHead('created_at', t('created_at'))}
              {sortHead('updated_at', t('updated_at'))}
              {showExpiry && <TableHead>{t('expires_at')}</TableHead>}
              {sortHead('source_meta', t('source_meta'))}
              {sortHead('mail_count', t('mail_count'))}
              {sortHead('send_count', t('send_count'))}
              <TableHead className="w-12 text-right">
                <span className="sr-only">{t('actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.isLoading ? (
              <TableLoadingRows columns={columns} />
            ) : items.length === 0 ? (
              <TableEmptyRow
                columns={columns}
                icon={<SquareUserRoundIcon />}
                title={query ? t('emptyQuery', { query }) : t('emptyTitle')}
                description={query ? undefined : t('emptyDesc')}
              />
            ) : (
              items.map((row) => {
                const expiresAt = parseUtcDate(row.expires_at)
                const expired = !!expiresAt && expiresAt.getTime() <= now
                return (
                  <TableRow key={row.id} data-state={checked.has(row.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={checked.has(row.id)}
                        onCheckedChange={(v) => toggle(row.id, v === true)}
                        aria-label={t('selectRow', { address: row.name })}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{row.id}</TableCell>
                    <TableCell className="max-w-72">
                      <button
                        type="button"
                        className="max-w-full truncate text-left font-mono text-[13px] hover:text-primary hover:underline hover:underline-offset-4"
                        title={row.name}
                        onClick={() => void showCredential(row)}
                      >
                        {row.name}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.updated_at)}</TableCell>
                    {showExpiry && (
                      <TableCell className="whitespace-nowrap">
                        {row.expires_at ? (
                          <span className={cn('text-muted-foreground', expired && 'text-destructive')}>
                            {formatDateTime(row.expires_at)}
                            {expired && (
                              <Badge variant="destructive" className="ml-2">
                                {t('expired')}
                              </Badge>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t('neverExpires')}</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <SourceMeta value={row.source_meta} />
                    </TableCell>
                    <TableCell>
                      <CountBadge count={row.mail_count} label={t('viewMails')} onClick={() => viewMails(row)} />
                    </TableCell>
                    <TableCell>
                      <CountBadge count={row.send_count} label={t('viewSendBox')} onClick={() => viewSent(row)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={t('actions')}>
                            <EllipsisIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="truncate font-mono text-xs font-normal text-muted-foreground">
                            {row.name}
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => void showCredential(row)}>
                            <ShieldCheckIcon />
                            {t('showCredential')}
                          </DropdownMenuItem>
                          {row.mail_count > 0 && (
                            <DropdownMenuItem onClick={() => viewMails(row)}>
                              <InboxIcon />
                              {t('viewMails')}
                            </DropdownMenuItem>
                          )}
                          {row.send_count > 0 && (
                            <DropdownMenuItem onClick={() => viewSent(row)}>
                              <SendIcon />
                              {t('viewSendBox')}
                            </DropdownMenuItem>
                          )}
                          {openSettings.enableAddressPassword && (
                            <DropdownMenuItem onClick={() => setResetTarget(row)}>
                              <KeyRoundIcon />
                              {t('resetPassword')}
                            </DropdownMenuItem>
                          )}
                          {(row.mail_count > 0 || row.send_count > 0) && <DropdownMenuSeparator />}
                          {row.mail_count > 0 && (
                            <DropdownMenuItem onClick={() => void clearInbox(row)}>
                              <EraserIcon />
                              {t('clearInbox')}
                            </DropdownMenuItem>
                          )}
                          {row.send_count > 0 && (
                            <DropdownMenuItem onClick={() => void clearSent(row)}>
                              <MailsIcon />
                              {t('clearSentItems')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => void deleteAddress(row)}>
                            <Trash2Icon />
                            {t('deleteMailbox')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DataPagination
        page={paged.page}
        pageSize={paged.pageSize}
        total={paged.total}
        onPageChange={paged.setPage}
        onPageSizeChange={paged.setPageSize}
        pageSizes={[20, 50, 100]}
      />

      <AddressCredentialDialog
        open={!!credential}
        onOpenChange={(open) => !open && setCredential(null)}
        address={credential?.address || ''}
        jwt={credential?.jwt || ''}
      />
      <PasswordDialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title={t('resetPassword')}
        description={resetTarget?.name}
        label={t('newPassword')}
        submitText={t('resetPassword')}
        successText={t('passwordResetSuccess')}
        emptyText={t('newPassword')}
        trim
        onSubmit={async (password) => {
          if (!resetTarget) return
          await api.post(`/admin/address/${resetTarget.id}/reset_password`, { password: await hashPassword(password) })
        }}
      />
      <BatchProgressDialog progress={progress} onOpenChange={(open) => !open && setProgress(null)} />
    </Page>
  )
}
