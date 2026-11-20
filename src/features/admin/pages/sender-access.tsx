import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PencilIcon, RefreshCwIcon, SendHorizontalIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { confirm } from '@/components/common/confirm'
import { DataPagination } from '@/components/common/data-pagination'
import { Page, PageHeader } from '@/components/common/page'
import { usePagedQuery } from '@/hooks/use-paged-query'
import { api, type ListResponse } from '@/lib/api'
import { errorMessage, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TableEmptyRow, TableLoadingRows } from '@/features/admin/components/core/data-table'
import { SearchForm } from '@/features/admin/components/core/search-form'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '发信权限',
    description: '管理各邮箱地址的发信开关与发信额度。用户申请发信权限后会出现在这里。',
    queryTip: '输入完整邮箱地址精确查询，留空查询全部',
    address: '邮箱地址',
    balance: '余额',
    isEnabled: '是否启用',
    enable: '启用',
    disable: '禁用',
    modify: '修改',
    modalTip: '请输入发件额度',
    balanceRange: '0 – 1000',
    deleteTip: '确定删除吗？',
    deleteDesc: '将移除 {address} 的发信权限记录。',
    emptyTitle: '暂无发信权限记录',
    emptyDesc: '用户在邮箱中申请发信权限后，会在这里出现待审核记录',
  },
  en: {
    title: 'Sender access',
    description: 'Enable sending and set the send balance per address. Send-access requests from users show up here.',
    queryTip: 'Exact address to filter, leave blank to show all',
    address: 'Email Address',
    balance: 'Balance',
    isEnabled: 'Is Enabled',
    enable: 'Enable',
    disable: 'Disable',
    modify: 'Modify',
    modalTip: 'Please input the sender balance',
    balanceRange: '0 – 1000',
    deleteTip: 'Are you sure to delete this?',
    deleteDesc: 'The send access record of {address} will be removed.',
    emptyTitle: 'No sender access records',
    emptyDesc: 'Requests made by users from their mailbox show up here for review',
  },
})

type SenderRow = {
  id: number
  address: string
  balance: number
  enabled: number
  created_at: string
  updated_at?: string
}

const COLUMNS = 6

function EditSenderDialog({
  row,
  onOpenChange,
  onSaved,
}: {
  row: SenderRow | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const t = useT(messages)
  const [enabled, setEnabled] = useState(false)
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [lastRow, setLastRow] = useState<SenderRow | null>(null)

  // Reset the form whenever a row is opened (forget the last one on close, so a cancelled edit never comes back)
  if (!row && lastRow) setLastRow(null)
  if (row && row !== lastRow) {
    setLastRow(row)
    setEnabled(!!row.enabled)
    setBalance(String(row.balance ?? 0))
  }

  const parsed = Number(balance)
  const invalid = balance.trim() === '' || !Number.isInteger(parsed) || parsed < 0 || parsed > 1000

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!row || invalid) return
    setLoading(true)
    try {
      await api.post('/admin/address_sender', {
        address: row.address,
        address_id: row.id,
        balance: parsed,
        enabled: enabled ? 1 : 0,
      })
      toast.success(t('success'))
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('modify')}</DialogTitle>
            <DialogDescription className="font-mono break-all">{row?.address}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="sender-enabled">{t('enable')}</FieldLabel>
              </FieldContent>
              <Switch id="sender-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </Field>
            <Field data-invalid={invalid || undefined}>
              <FieldLabel htmlFor="sender-balance">{t('balance')}</FieldLabel>
              <Input
                id="sender-balance"
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                step={1}
                value={balance}
                aria-invalid={invalid || undefined}
                onChange={(e) => setBalance(e.target.value)}
              />
              <FieldDescription>
                {t('modalTip')} ({t('balanceRange')})
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading || invalid}>
              {loading && <Spinner />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** `/console/sender-access` — per-address send permission and balance. */
export default function SenderAccessPage() {
  const t = useT(messages)
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<SenderRow | null>(null)

  const paged = usePagedQuery<SenderRow>({
    queryKey: ['admin', 'sender-access', { query }],
    fetchPage: (limit, offset) =>
      api.get<ListResponse<SenderRow>>(
        `/admin/address_sender?limit=${limit}&offset=${offset}${query ? `&address=${encodeURIComponent(query)}` : ''}`,
      ),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'sender-access'] })

  const remove = async (row: SenderRow) => {
    if (!(await confirm({ title: t('deleteTip'), description: t('deleteDesc', { address: row.address }), destructive: true })))
      return
    try {
      await api.delete(`/admin/address_sender/${row.id}`)
      toast.success(t('success'))
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <Page wide>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="flex flex-wrap items-center gap-2">
        <SearchForm className="flex-1 sm:max-w-96" value={query} onSearch={setQuery} placeholder={t('queryTip')} />
        <Button variant="outline" size="icon" onClick={() => void paged.refetch()} aria-label={t('refresh')}>
          <RefreshCwIcon className={cn(paged.isFetching && 'animate-spin')} />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table className="table-sticky-end min-w-[680px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-16">{t('id')}</TableHead>
              <TableHead>{t('address')}</TableHead>
              <TableHead>{t('createdAt')}</TableHead>
              <TableHead className="text-right">{t('balance')}</TableHead>
              <TableHead>{t('isEnabled')}</TableHead>
              <TableHead className="w-24 text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.isLoading ? (
              <TableLoadingRows columns={COLUMNS} />
            ) : paged.items.length === 0 ? (
              <TableEmptyRow
                columns={COLUMNS}
                icon={<SendHorizontalIcon />}
                title={t('emptyTitle')}
                description={query ? undefined : t('emptyDesc')}
              />
            ) : (
              paged.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{row.id}</TableCell>
                  <TableCell className="font-mono text-[13px]">{row.address}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{row.balance}</TableCell>
                  <TableCell>
                    {row.enabled ? (
                      <Badge className="bg-primary/10 text-primary">{t('enable')}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {t('disable')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(row)} aria-label={t('modify')}>
                            <PencilIcon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('modify')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon-sm" onClick={() => void remove(row)} aria-label={t('delete')}>
                            <Trash2Icon className="text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('delete')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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

      <EditSenderDialog row={editing} onOpenChange={(open) => !open && setEditing(null)} onSaved={() => void refresh()} />
    </Page>
  )
}
