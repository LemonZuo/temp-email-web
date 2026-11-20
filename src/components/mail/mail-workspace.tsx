import { useCallback, useEffect, useMemo, useState } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import {
  CheckSquareIcon,
  DownloadIcon,
  InboxIcon,
  ListChecksIcon,
  MailOpenIcon,
  RefreshCwIcon,
  SearchIcon,
  TimerIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataPagination } from '@/components/common/data-pagination'
import { EmptyState } from '@/components/common/empty-state'
import { confirm } from '@/components/common/confirm'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePagedQuery } from '@/hooks/use-paged-query'
import type { ListResponse } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { parseMails, type MailAttachment, type ParsedMail, type RawMail } from '@/lib/mail-parser'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/store/prefs'
import { MailListItem } from './mail-list'
import { MailReader } from './mail-reader'
import { ThreePane } from './three-pane'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    searchPlaceholder: '搜索当前页邮件',
    emptyTitle: '收件箱是空的',
    emptyDesc: '新邮件到达后会显示在这里',
    noMatch: '没有匹配的邮件',
    selectMail: '选择一封邮件阅读',
    selectMailDesc: '从左侧列表中选择邮件查看内容',
    autoRefresh: '自动刷新',
    autoRefreshIn: '{n} 秒后自动刷新',
    selectMode: '多选',
    selectAll: '全选',
    selected: '已选 {n} 封',
    deleteSelected: '删除所选',
    downloadSelected: '下载所选 (.zip)',
    deleteSelectedConfirm: '确定删除选中的 {n} 封邮件吗？',
    deleting: '正在删除 {done}/{total}',
    deleted: '已删除 {n} 封邮件',
    pleaseSelect: '请先选择邮件',
    markedRead: '已标为已读',
    markedUnread: '已标为未读',
    reply: '回复',
    forward: '转发',
  },
  en: {
    searchPlaceholder: 'Search this page',
    emptyTitle: 'Your inbox is empty',
    emptyDesc: 'New mails will show up here',
    noMatch: 'No matching mails',
    selectMail: 'Select a mail to read',
    selectMailDesc: 'Choose a mail from the list to view it here',
    autoRefresh: 'Auto refresh',
    autoRefreshIn: 'Refreshing in {n}s',
    selectMode: 'Select',
    selectAll: 'Select all',
    selected: '{n} selected',
    deleteSelected: 'Delete selected',
    downloadSelected: 'Download selected (.zip)',
    deleteSelectedConfirm: 'Delete {n} selected mails?',
    deleting: 'Deleting {done}/{total}',
    deleted: 'Deleted {n} mails',
    pleaseSelect: 'Select some mails first',
    markedRead: 'Marked as read',
    markedUnread: 'Marked as unread',
    reply: 'Reply',
    forward: 'Forward',
  },
})

export type MailWorkspaceProps = {
  /** Base react-query key; include filters (address, keyword...) */
  queryKey: QueryKey
  fetchMails: (limit: number, offset: number) => Promise<ListResponse<RawMail>>
  /** Enables delete (single + bulk) */
  deleteMail?: (id: number) => Promise<unknown>
  /** Enables read/unread status */
  markRead?: (id: number, isUnread: boolean) => Promise<unknown>
  onReply?: (mail: ParsedMail) => void
  onForward?: (mail: ParsedMail) => void
  saveToS3?: (mailId: number, attachment: MailAttachment) => Promise<void>
  /** Show the recipient address (admin / multi-address views) */
  showRecipient?: boolean
  /** Extra controls rendered above the list (filters) */
  listHeader?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  /** Open the first mail right away (`?mail_id=` links). Otherwise nothing is opened until the user picks a mail. */
  autoOpenFirst?: boolean
}

/** Inbox-style list + reader for any endpoint returning raw mails. */
export function MailWorkspace({
  queryKey,
  fetchMails,
  deleteMail,
  markRead,
  onReply,
  onForward,
  saveToS3,
  showRecipient,
  listHeader,
  emptyTitle,
  emptyDescription,
  autoOpenFirst,
}: MailWorkspaceProps) {
  const t = useT(messages)
  const isMobile = useIsMobile()
  const { autoRefresh, autoRefreshInterval } = usePrefs()
  const paged = usePagedQuery<RawMail, ParsedMail>({ queryKey, fetchPage: fetchMails, transform: parseMails })
  const { items, page, setPage, refetch, isFetching } = paged

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  /** Local read-status overrides until the next refetch reflects them */
  const [readOverride, setReadOverride] = useState<Record<number, number>>({})
  const [countdown, setCountdown] = useState(autoRefreshInterval)

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return items
    return items.filter((m) =>
      [m.subject, m.text, m.message, m.sender].some((f) => (f || '').toLowerCase().includes(kw)),
    )
  }, [items, keyword])

  const isUnread = useCallback(
    (m: ParsedMail) => !!markRead && (readOverride[m.id] ?? m.is_unread) === 1,
    [markRead, readOverride],
  )

  const selected = filtered.find((m) => m.id === selectedId) || items.find((m) => m.id === selectedId) || null

  // `?mail_id=` links open their mail once; closing it (mobile back) does not reopen it
  const autoOpenId = autoOpenFirst && !selectMode ? (filtered[0]?.id ?? null) : null
  const [autoOpened, setAutoOpened] = useState<number | null>(null)
  if (autoOpenId !== null && autoOpenId !== autoOpened) {
    setAutoOpened(autoOpenId)
    setSelectedId(autoOpenId)
  }

  useEffect(() => setReadOverride({}), [items])

  // Auto refresh: countdown, then jump to first page and refetch
  useEffect(() => {
    if (!autoRefresh) return
    setCountdown(autoRefreshInterval)
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c > 1) return c - 1
        if (page !== 1) setPage(1)
        else void refetch()
        return autoRefreshInterval
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [autoRefresh, autoRefreshInterval, page, setPage, refetch])

  const setRead = async (mail: ParsedMail, unread: boolean, notify = false) => {
    if (!markRead) return
    const previous = readOverride[mail.id] ?? mail.is_unread
    setReadOverride((o) => ({ ...o, [mail.id]: unread ? 1 : 0 }))
    try {
      await markRead(mail.id, unread)
      if (notify) toast.success(unread ? t('markedUnread') : t('markedRead'))
    } catch (error) {
      setReadOverride((o) => ({ ...o, [mail.id]: previous ?? 0 }))
      if (notify) toast.error(errorMessage(error))
    }
  }

  const openMail = (mail: ParsedMail) => {
    if (selectMode) {
      toggleChecked(mail.id, !checked.has(mail.id))
      return
    }
    setSelectedId(mail.id)
    if (isUnread(mail)) void setRead(mail, false)
  }

  const toggleChecked = (id: number, value: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })

  const exitSelectMode = () => {
    setSelectMode(false)
    setChecked(new Set())
  }

  const selectedIndex = selected ? filtered.findIndex((m) => m.id === selected.id) : -1
  const goPrev = selectedIndex > 0 ? () => openMail(filtered[selectedIndex - 1]) : undefined
  const goNext = selectedIndex >= 0 && selectedIndex < filtered.length - 1 ? () => openMail(filtered[selectedIndex + 1]) : undefined

  const handleDelete = deleteMail
    ? async () => {
        if (!selected) return
        try {
          await deleteMail(selected.id)
          toast.success(t('success'))
          setSelectedId(goNext ? filtered[selectedIndex + 1].id : null)
          await refetch()
        } catch (error) {
          toast.error(errorMessage(error))
        }
      }
    : undefined

  const bulkDelete = async () => {
    if (!deleteMail) return
    const ids = [...checked]
    if (ids.length === 0) return toast.error(t('pleaseSelect'))
    if (!(await confirm({ title: t('deleteSelectedConfirm', { n: ids.length }), description: t('irreversible'), destructive: true }))) return
    const toastId = toast.loading(t('deleting', { done: 0, total: ids.length }))
    let done = 0
    try {
      for (const id of ids) {
        await deleteMail(id)
        done++
        toast.loading(t('deleting', { done, total: ids.length }), { id: toastId })
      }
      toast.success(t('deleted', { n: done }), { id: toastId })
    } catch (error) {
      toast.error(errorMessage(error), { id: toastId })
    } finally {
      exitSelectMode()
      await refetch()
    }
  }

  const bulkDownload = async () => {
    const mails = items.filter((m) => checked.has(m.id))
    if (mails.length === 0) return toast.error(t('pleaseSelect'))
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const m of mails) {
      const name = `${m.id}-${(m.subject || 'mail').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60)}.eml`
      zip.file(name, m.raw || '')
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mails-${Date.now()}.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const allChecked = filtered.length > 0 && filtered.every((m) => checked.has(m.id))

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      {/* list toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
        {selectMode ? (
          <>
            <Checkbox
              className="mx-2"
              checked={allChecked}
              onCheckedChange={(v) => setChecked(v === true ? new Set(filtered.map((m) => m.id)) : new Set())}
              aria-label={t('selectAll')}
            />
            <span className="flex-1 truncate text-sm">{t('selected', { n: checked.size })}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={bulkDownload} aria-label={t('downloadSelected')}>
                  <DownloadIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('downloadSelected')}</TooltipContent>
            </Tooltip>
            {deleteMail && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={bulkDelete} aria-label={t('deleteSelected')}>
                    <Trash2Icon className="text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('deleteSelected')}</TooltipContent>
              </Tooltip>
            )}
            <Button variant="ghost" size="icon-sm" onClick={exitSelectMode} aria-label={t('cancel')}>
              <XIcon />
            </Button>
          </>
        ) : (
          <>
            <InputGroup className="h-8 flex-1">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t('searchPlaceholder')} />
            </InputGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => (page === 1 ? refetch() : setPage(1))} aria-label={t('refresh')}>
                  <RefreshCwIcon className={cn(isFetching && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{autoRefresh ? t('autoRefreshIn', { n: countdown }) : t('refresh')}</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t('more')} className="relative">
                  <ListChecksIcon />
                  {autoRefresh && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setSelectMode(true)}>
                  <CheckSquareIcon />
                  {t('selectMode')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={autoRefresh}
                  onCheckedChange={(v) => usePrefs.getState().set({ autoRefresh: v === true })}
                >
                  <TimerIcon />
                  {t('autoRefresh')}
                  {autoRefresh && <span className="ml-auto text-xs text-muted-foreground tabular-nums">{countdown}s</span>}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      {listHeader && <div className="shrink-0 border-b p-2">{listHeader}</div>}
      <ScrollArea className="min-h-0 flex-1">
        {paged.isLoading ? (
          <div className="grid gap-px">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 border-b px-3 py-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            className="py-16"
            icon={<InboxIcon />}
            title={keyword ? t('noMatch') : emptyTitle || t('emptyTitle')}
            description={keyword ? undefined : emptyDescription || t('emptyDesc')}
          />
        ) : (
          filtered.map((mail) => (
            <MailListItem
              key={mail.id}
              mail={mail}
              selected={!selectMode && mail.id === selectedId}
              unread={isUnread(mail)}
              showRecipient={showRecipient}
              selectable={selectMode}
              checked={checked.has(mail.id)}
              onCheckedChange={(v) => toggleChecked(mail.id, v)}
              onClick={() => openMail(mail)}
            />
          ))
        )}
      </ScrollArea>
      <DataPagination
        compact
        className="h-11 shrink-0 border-t px-3"
        page={page}
        pageSize={paged.pageSize}
        total={paged.total}
        onPageChange={setPage}
      />
    </div>
  )

  const reader = selected ? (
    <MailReader
      key={selected.id}
      mail={selected}
      unread={isUnread(selected)}
      showRecipient={showRecipient}
      onBack={isMobile ? () => setSelectedId(null) : undefined}
      onPrev={goPrev}
      onNext={goNext}
      onReply={onReply ? () => onReply(selected) : undefined}
      onForward={onForward ? () => onForward(selected) : undefined}
      onDelete={handleDelete}
      onToggleRead={markRead ? () => void setRead(selected, !isUnread(selected), true) : undefined}
      onSaveToS3={saveToS3 ? (a) => saveToS3(selected.id, a) : undefined}
    />
  ) : (
    <EmptyState className="h-full" icon={<MailOpenIcon />} title={t('selectMail')} description={t('selectMailDesc')} />
  )

  return <ThreePane list={list} reader={reader} hasSelection={!!selected} />
}
