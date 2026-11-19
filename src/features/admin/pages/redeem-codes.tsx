import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  RotateCwIcon,
  SearchIcon,
  TicketIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { confirm } from '@/components/common/confirm'
import { CopyButton } from '@/components/common/copy-button'
import { DataPagination } from '@/components/common/data-pagination'
import { EmptyState } from '@/components/common/empty-state'
import { Page, PageHeader } from '@/components/common/page'
import { usePagedQuery } from '@/hooks/use-paged-query'
import { api, type ListResponse } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { errorMessage, parseUtcDate } from '@/lib/format'
import { queryClient } from '@/lib/query-client'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '兑换码',
    description: '批量生成和管理角色权益、发信额度、专属邮箱兑换码。',
    amount: '发信额度',
    batchCreate: '批量生成',
    countLimit: '每次可生成 1-{max} 个兑换码。',
    createdResult: '已生成兑换码：{created} 个。',
    copy: '复制',
    copied: '兑换码已复制',
    copyFailed: '复制兑换码失败',
    deleteConfirm: '确定删除这个兑换码吗？',
    downloadCsv: '下载 CSV',
    emptyPrefix: '无前缀',
    emptyPrefixTip: '留空即兑换无前缀邮箱地址',
    enabled: '启用',
    expiresAt: '有效期至',
    expired: '已过期',
    export: '导出',
    exportLimit: '导出条数（上限 {max}）',
    exportDesc: '按 ID 倒序导出当前类型的兑换码，包含兑换结果。',
    generationCount: '生成数量',
    generate: '生成',
    invalidExpiration: '请选择未来的有效期',
    invalidPrefix: '前缀仅支持英文字母和数字，最多 {max} 个字符；留空表示无前缀。',
    invalidAmount: '发信额度需为 1-1000000000 的整数',
    roleRequired: '请选择角色',
    code: '兑换码',
    prefix: '地址前缀',
    redeemedAt: '兑换时间',
    redeemedUser: '兑换账号',
    resultAddress: '已兑换邮箱',
    role: '角色',
    saved: '保存成功',
    searchPlaceholder: '搜索兑换码',
    targetAddress: '兑换邮箱',
    type: '类型',
    typeFilter: '兑换码类型',
    typeAddress: '专属邮箱',
    typeBalance: '发信额度',
    typeRole: '角色权益',
    valid: '有效',
    redeemed: '已兑换',
    copyCode: '复制兑换码',
    emptyTitle: '暂无兑换码',
    emptyDesc: '点击「批量生成」创建第一批兑换码。',
    noSearchResult: '没有匹配的兑换码',
    noRoles: '未配置可兑换的角色（USER_ROLES）',
    in7d: '7 天',
    in30d: '30 天',
    in90d: '90 天',
    in1y: '1 年',
    createdTitle: '兑换码已生成',
    createdDesc: '已自动下载 CSV，也可以在此复制。',
    copyAll: '复制全部',
    clearSearch: '清除搜索',
  },
  en: {
    title: 'Redemption codes',
    description: 'Generate and manage codes for role benefits, sending credits and custom mailboxes.',
    amount: 'Sending credits',
    batchCreate: 'Batch Generate',
    countLimit: 'Generate 1-{max} codes at a time.',
    createdResult: 'Redemption codes generated: {created}.',
    copy: 'Copy',
    copied: 'Redemption code copied',
    copyFailed: 'Unable to copy the redemption code',
    deleteConfirm: 'Delete this redemption code?',
    downloadCsv: 'Download CSV',
    emptyPrefix: 'No prefix',
    emptyPrefixTip: 'Leave empty to redeem a mailbox without a prefix',
    enabled: 'Enabled',
    expiresAt: 'Expires at',
    expired: 'Expired',
    export: 'Export',
    exportLimit: 'Export rows (maximum {max})',
    exportDesc: 'Exports the newest codes of the current type, including redemption results.',
    generationCount: 'Number to generate',
    generate: 'Generate',
    invalidExpiration: 'Select a future expiration time',
    invalidPrefix: 'Use only letters and digits, up to {max} characters. Leave empty for no prefix.',
    invalidAmount: 'Sending credits must be an integer between 1 and 1000000000',
    roleRequired: 'Select a role',
    code: 'Redemption code',
    prefix: 'Address prefix',
    redeemedAt: 'Redeemed at',
    redeemedUser: 'Recipient account',
    resultAddress: 'Redeemed mailbox',
    role: 'Role',
    saved: 'Saved',
    searchPlaceholder: 'Search redemption code',
    targetAddress: 'Recipient mailbox',
    type: 'Type',
    typeFilter: 'Redemption code type',
    typeAddress: 'Custom mailbox',
    typeBalance: 'Sending credits',
    typeRole: 'Role benefits',
    valid: 'Active',
    redeemed: 'Redeemed',
    copyCode: 'Copy code',
    emptyTitle: 'No redemption codes',
    emptyDesc: 'Use “Batch Generate” to create the first batch.',
    noSearchResult: 'No matching redemption codes',
    noRoles: 'No redeemable roles configured (USER_ROLES)',
    in7d: '7 days',
    in30d: '30 days',
    in90d: '90 days',
    in1y: '1 year',
    createdTitle: 'Codes generated',
    createdDesc: 'The CSV was downloaded automatically; you can also copy the codes here.',
    copyAll: 'Copy all',
    clearSearch: 'Clear search',
  },
})

const MAX_BATCH_SIZE = 500
const MAX_EXPORT_SIZE = 10000
const MAX_AMOUNT = 1_000_000_000

type RedeemType = 'role' | 'send_balance' | 'address_prefix_once'
const TYPES: { value: RedeemType; label: 'typeRole' | 'typeBalance' | 'typeAddress' }[] = [
  { value: 'role', label: 'typeRole' },
  { value: 'send_balance', label: 'typeBalance' },
  { value: 'address_prefix_once', label: 'typeAddress' },
]

/** `GET /admin/redeem_codes` row (`result` is the decrypted JSON string). */
type RedeemCodeRow = {
  id: number
  code: string
  redeem_type: RedeemType
  value: string
  result: string | null
  enabled: number | boolean
  redeemed: boolean
  expires_at: string
  redeemed_at: string | null
  created_at?: string
}

type FormState = {
  id: number | null
  type: RedeemType
  count: string
  role: string
  amount: string
  prefix: string
  enabled: boolean
  expiresAt: string
}

const parseResult = (value: string | null): { user_email?: string; address?: string } => {
  try {
    const parsed: unknown = JSON.parse(value || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const formatTime = (value: string | null | undefined) =>
  parseUtcDate(value)?.toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) || '-'

const pad = (n: number) => String(n).padStart(2, '0')
/** `datetime-local` value in local time */
const toLocalInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
const daysFromNow = (days: number) => toLocalInput(new Date(Date.now() + days * 86_400_000))

const download = (content: string, filename: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const csvCell = (value: unknown) => {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

type CreatedBatch = { codes: string[]; redeem_type: RedeemType; value: string; enabled: boolean; expires_at: string }

const createdCsv = (batch: CreatedBatch) => {
  const columns = ['code', 'redeem_type', 'value', 'enabled', 'expires_at'] as const
  return [
    columns.join(','),
    ...batch.codes.map((code) => columns.map((column) => csvCell(column === 'code' ? code : batch[column])).join(',')),
  ].join('\n')
}
const downloadCreated = (batch: CreatedBatch) =>
  download(`\uFEFF${createdCsv(batch)}`, `redeem-codes-${batch.redeem_type}.csv`, 'text/csv;charset=utf-8')

const successBadge = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'

/** `/console/redeem-codes` — list/filter, batch create, edit, delete and export redemption codes. */
export default function RedeemCodesPage() {
  const t = useT(messages)
  const maxAddressLen = useApp((s) => s.openSettings.maxAddressLen)
  const prefixMaxLength = Math.max((maxAddressLen || 30) - 1, 0)
  const [type, setType] = useState<RedeemType>('role')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [created, setCreated] = useState<CreatedBatch | null>(null)

  const paged = usePagedQuery<RedeemCodeRow>({
    queryKey: ['admin', 'redeem-codes', { type, query }],
    fetchPage: (limit, offset) =>
      api.get<ListResponse<RedeemCodeRow>>(
        `/admin/redeem_codes?redeem_type=${encodeURIComponent(type)}&limit=${limit}&offset=${offset}` +
          (query ? `&query=${encodeURIComponent(query)}` : ''),
      ),
    initialPageSize: 20,
  })

  // Like the old page: a failed list load (e.g. redeem codes disabled) must not look like an empty list
  useEffect(() => {
    if (paged.error) toast.error(errorMessage(paged.error))
  }, [paged.error])

  const roles = useQuery({
    queryKey: ['admin', 'redeem-role-options'],
    queryFn: async () => {
      try {
        const [list, config] = await Promise.all([
          api.get<{ role: string }[]>('/admin/user_roles'),
          api.get<{ ADMIN_USER_ROLE?: string }>('/admin/worker/configs'),
        ])
        return (Array.isArray(list) ? list : []).map((item) => item.role).filter((role) => role && role !== config?.ADMIN_USER_ROLE)
      } catch (error) {
        toast.error(errorMessage(error))
        return []
      }
    },
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'redeem-codes'] })

  const openCreate = () =>
    setForm({ id: null, type, count: '1', role: '', amount: '100', prefix: '', enabled: true, expiresAt: '' })

  const openEdit = (row: RedeemCodeRow) => {
    const expires = parseUtcDate(row.expires_at)
    setForm({
      id: row.id,
      type: row.redeem_type,
      count: '1',
      role: row.redeem_type === 'role' ? row.value : '',
      amount: row.redeem_type === 'send_balance' ? String(Number(row.value)) : '',
      prefix: row.redeem_type === 'address_prefix_once' ? row.value : '',
      enabled: Boolean(row.enabled),
      expiresAt: expires ? toLocalInput(expires) : '',
    })
  }

  const remove = async (row: RedeemCodeRow) => {
    if (!(await confirm({ title: t('deleteConfirm'), description: row.code, destructive: true, confirmText: t('delete') }))) return
    try {
      await api.delete(`/admin/redeem_codes/${row.id}`)
      toast.success(t('success'))
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const copyCode = async (code: string) => {
    if (await copyText(code)) toast.success(t('copied'))
    else toast.error(t('copyFailed'))
  }

  const columns = useMemo(() => {
    if (type === 'role') {
      return [
        { title: t('role'), render: (row: RedeemCodeRow) => row.value || '-' },
        { title: t('redeemedUser'), render: (row: RedeemCodeRow) => parseResult(row.result).user_email || '-' },
      ]
    }
    if (type === 'send_balance') {
      return [
        { title: t('amount'), render: (row: RedeemCodeRow) => <span className="tabular-nums">{row.value || '-'}</span> },
        { title: t('targetAddress'), render: (row: RedeemCodeRow) => parseResult(row.result).address || '-' },
      ]
    }
    return [
      {
        title: t('prefix'),
        render: (row: RedeemCodeRow) =>
          row.value ? <span className="font-mono">{row.value}</span> : <span className="text-muted-foreground">{t('emptyPrefix')}</span>,
      },
      { title: t('resultAddress'), render: (row: RedeemCodeRow) => parseResult(row.result).address || '-' },
    ]
  }, [type, t])

  // Evaluate expiry against the fetch time (keeps render pure).
  const now = paged.query.dataUpdatedAt

  return (
    <Page wide>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <Button variant="outline" onClick={() => setExportOpen(true)} data-testid="redeem-admin-export">
              <DownloadIcon />
              {t('export')}
            </Button>
            <Button onClick={openCreate} data-testid="redeem-admin-create">
              <PlusIcon />
              {t('batchCreate')}
            </Button>
          </>
        }
      />

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={type} onValueChange={(v) => setType(v as RedeemType)}>
            <TabsList aria-label={t('typeFilter')} data-testid="redeem-admin-filter-type">
              {TYPES.map((item) => (
                <TabsTrigger key={item.value} value={item.value} className="px-2.5">
                  {t(item.label)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <form
            className="flex min-w-48 flex-1 items-center gap-2 sm:max-w-sm"
            onSubmit={(e) => {
              e.preventDefault()
              setQuery(search.trim())
            }}
          >
            <InputGroup>
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                data-testid="redeem-admin-search"
                value={search}
                placeholder={t('searchPlaceholder')}
                onChange={(e) => setSearch(e.target.value)}
              />
              {(search || query) && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={t('clearSearch')}
                    onClick={() => {
                      setSearch('')
                      setQuery('')
                    }}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            <Button type="submit" variant="secondary">
              {t('search')}
            </Button>
          </form>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => paged.refetch()} disabled={paged.isFetching} aria-label={t('refresh')}>
            {paged.isFetching ? <Spinner /> : <RotateCwIcon />}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t('code')}</TableHead>
                {columns.map((col) => (
                  <TableHead key={col.title}>{col.title}</TableHead>
                ))}
                <TableHead>{t('enabled')}</TableHead>
                <TableHead>{t('expiresAt')}</TableHead>
                <TableHead>{t('redeemedAt')}</TableHead>
                <TableHead className="sticky right-0 w-12 bg-background">
                  <span className="sr-only">{t('actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns.length + 5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paged.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 5}>
                    <EmptyState
                      icon={<TicketIcon />}
                      title={query ? t('noSearchResult') : t('emptyTitle')}
                      description={query ? undefined : t('emptyDesc')}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paged.items.map((row) => {
                  const expiresAt = parseUtcDate(row.expires_at)
                  const expired = !expiresAt || expiresAt.getTime() <= now
                  return (
                    <TableRow key={row.id} className={cn(paged.isFetching && 'opacity-70')}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="max-w-36 truncate font-mono text-xs" title={row.code}>
                            {row.code}
                          </code>
                          <CopyButton value={row.code} size="icon-xs" />
                        </div>
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col.title} className="max-w-60 truncate">
                          {col.render(row)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Badge variant="secondary" className={row.enabled ? successBadge : undefined}>
                          {row.enabled ? t('yes') : t('no')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Badge variant={expired ? 'destructive' : 'secondary'} className={expired ? undefined : successBadge}>
                            {expired ? t('expired') : t('valid')}
                          </Badge>
                          <span className="text-muted-foreground">{formatTime(row.expires_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.redeemed ? (
                          row.redeemed_at ? (
                            <span className="text-muted-foreground">{formatTime(row.redeemed_at)}</span>
                          ) : (
                            <Badge variant="outline">{t('redeemed')}</Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={t('actions')}>
                              <EllipsisIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onSelect={() => copyCode(row.code)}>
                              <CopyIcon />
                              {t('copyCode')}
                            </DropdownMenuItem>
                            {!row.redeemed && (
                              <DropdownMenuItem onSelect={() => openEdit(row)}>
                                <PencilIcon />
                                {t('edit')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => remove(row)}>
                              <Trash2Icon />
                              {t('delete')}
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
      </div>

      {form && (
        <EditorDialog
          form={form}
          onClose={() => setForm(null)}
          roles={roles.data || []}
          rolesLoading={roles.isLoading}
          prefixMaxLength={prefixMaxLength}
          onCreated={(batch) => {
            setCreated(batch)
            refresh()
          }}
          onSaved={refresh}
        />
      )}
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type={type} />
      <CreatedDialog batch={created} onOpenChange={(open) => !open && setCreated(null)} />
    </Page>
  )
}

function EditorDialog({
  form: initial,
  onClose,
  roles,
  rolesLoading,
  prefixMaxLength,
  onCreated,
  onSaved,
}: {
  form: FormState
  onClose: () => void
  roles: string[]
  rolesLoading: boolean
  prefixMaxLength: number
  onCreated: (batch: CreatedBatch) => void
  onSaved: () => void
}) {
  const t = useT(messages)
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const creating = form.id === null
  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))
  const typeLabel = TYPES.find((item) => item.value === form.type)?.label || 'typeRole'
  // Keep the current role selectable even if it was removed from USER_ROLES.
  const roleOptions = form.role && !roles.includes(form.role) ? [form.role, ...roles] : roles

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.type === 'role' && !form.role.trim()) return toast.error(t('roleRequired'))
    const value = form.type === 'role' ? form.role.trim() : form.type === 'send_balance' ? form.amount.trim() : form.prefix.trim()
    if (form.type === 'address_prefix_once' && (!/^[a-z0-9]*$/i.test(value) || value.length > prefixMaxLength)) {
      return toast.error(t('invalidPrefix', { max: prefixMaxLength }))
    }
    if (form.type === 'send_balance' && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > MAX_AMOUNT)) {
      return toast.error(t('invalidAmount'))
    }
    const expires = form.expiresAt ? new Date(form.expiresAt) : null
    if (!expires || Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) return toast.error(t('invalidExpiration'))
    const count = Number(form.count)
    if (creating && (!Number.isInteger(count) || count < 1 || count > MAX_BATCH_SIZE)) {
      return toast.error(t('countLimit', { max: MAX_BATCH_SIZE }))
    }
    const payload = {
      redeem_type: form.type,
      value: form.type === 'send_balance' ? String(Number(value)) : value,
      enabled: form.enabled,
      expires_at: expires.toISOString(),
    }
    setSaving(true)
    try {
      if (creating) {
        const result = await api.post<{ created: number; codes: string[] }>('/admin/redeem_codes/batch', { count, ...payload })
        const codes = Array.isArray(result?.codes) ? result.codes : []
        const batch: CreatedBatch = { codes, ...payload }
        if (codes.length) downloadCreated(batch)
        toast.success(t('createdResult', { created: result?.created ?? codes.length }))
        onClose()
        onCreated(batch)
      } else {
        await api.put(`/admin/redeem_codes/${form.id}`, payload)
        toast.success(t('saved'))
        onClose()
        onSaved()
      }
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{creating ? t('batchCreate') : t('edit')}</DialogTitle>
            <DialogDescription>
              {t('type')}: {t(typeLabel)}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            {creating && (
              <Field>
                <FieldLabel htmlFor="redeem-count">{t('generationCount')}</FieldLabel>
                <Input
                  id="redeem-count"
                  data-testid="redeem-admin-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_BATCH_SIZE}
                  step={1}
                  value={form.count}
                  onChange={(e) => update({ count: e.target.value })}
                />
                <FieldDescription>{t('countLimit', { max: MAX_BATCH_SIZE })}</FieldDescription>
              </Field>
            )}
            {form.type === 'role' ? (
              <Field>
                <FieldLabel htmlFor="redeem-role">
                  {t('role')} <span className="text-destructive">*</span>
                </FieldLabel>
                <Select value={form.role} onValueChange={(role) => update({ role })}>
                  <SelectTrigger id="redeem-role" className="w-full" data-testid="redeem-admin-role">
                    <SelectValue placeholder={rolesLoading ? t('loading') : t('roleRequired')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!rolesLoading && roleOptions.length === 0 && <FieldDescription>{t('noRoles')}</FieldDescription>}
              </Field>
            ) : form.type === 'send_balance' ? (
              <Field>
                <FieldLabel htmlFor="redeem-amount">{t('amount')}</FieldLabel>
                <Input
                  id="redeem-amount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_AMOUNT}
                  step={1}
                  value={form.amount}
                  onChange={(e) => update({ amount: e.target.value })}
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="redeem-prefix">{t('prefix')}</FieldLabel>
                <Input
                  id="redeem-prefix"
                  className="font-mono"
                  maxLength={prefixMaxLength}
                  placeholder={t('emptyPrefixTip')}
                  value={form.prefix}
                  onChange={(e) => update({ prefix: e.target.value })}
                />
                <FieldDescription>{t('invalidPrefix', { max: prefixMaxLength })}</FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="redeem-expires">
                {t('expiresAt')} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="redeem-expires"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => update({ expiresAt: e.target.value })}
              />
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['in7d', 7],
                    ['in30d', 30],
                    ['in90d', 90],
                    ['in1y', 365],
                  ] as const
                ).map(([label, days]) => (
                  <Button key={label} type="button" variant="outline" size="xs" onClick={() => update({ expiresAt: daysFromNow(days) })}>
                    +{t(label)}
                  </Button>
                ))}
              </div>
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="redeem-enabled">{t('enabled')}</FieldLabel>
              </FieldContent>
              <Switch id="redeem-enabled" checked={form.enabled} onCheckedChange={(enabled) => update({ enabled })} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />}
              {creating ? t('generate') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ExportDialog({ open, onOpenChange, type }: { open: boolean; onOpenChange: (open: boolean) => void; type: RedeemType }) {
  const t = useT(messages)
  const [limit, setLimit] = useState('1000')
  const [loading, setLoading] = useState(false)
  const typeLabel = TYPES.find((item) => item.value === type)?.label || 'typeRole'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(limit)
    if (!Number.isInteger(value) || value < 1 || value > MAX_EXPORT_SIZE) {
      toast.error(t('exportLimit', { max: MAX_EXPORT_SIZE }))
      return
    }
    setLoading(true)
    try {
      const csv = await api.get<string>(`/admin/redeem_codes/export?redeem_type=${encodeURIComponent(type)}&limit=${value}`)
      const text = typeof csv === 'string' ? csv : JSON.stringify(csv)
      // response.text() strips the worker's UTF-8 BOM; Excel needs it to read non-ASCII text
      download(text.startsWith('\uFEFF') ? text : `\uFEFF${text}`, `redeem-codes-${type}.csv`, 'text/csv;charset=utf-8')
      onOpenChange(false)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              {t('export')} · {t(typeLabel)}
            </DialogTitle>
            <DialogDescription>{t('exportDesc')}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="redeem-export-limit">{t('exportLimit', { max: MAX_EXPORT_SIZE })}</FieldLabel>
            <Input
              id="redeem-export-limit"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_EXPORT_SIZE}
              step={1}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : <DownloadIcon />}
              {t('downloadCsv')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreatedDialog({ batch, onOpenChange }: { batch: CreatedBatch | null; onOpenChange: (open: boolean) => void }) {
  const t = useT(messages)
  const text = batch?.codes.join('\n') || ''
  return (
    <Dialog open={!!batch} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('createdTitle')}</DialogTitle>
          <DialogDescription>
            {t('createdResult', { created: batch?.codes.length ?? 0 })} {t('createdDesc')}
          </DialogDescription>
        </DialogHeader>
        <Textarea readOnly value={text} rows={10} className="max-h-80 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <DialogFooter>
          <Button variant="outline" onClick={() => batch && downloadCreated(batch)}>
            <DownloadIcon />
            {t('downloadCsv')}
          </Button>
          <CopyButton value={text} label={t('copyAll')} variant="default" size="default" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
