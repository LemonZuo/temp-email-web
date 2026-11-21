import { useMemo, useState } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import { ArrowLeftIcon, Code2Icon, RefreshCwIcon, SearchIcon, SendIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataPagination } from '@/components/common/data-pagination'
import { EmptyState } from '@/components/common/empty-state'
import { confirm } from '@/components/common/confirm'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePagedQuery } from '@/hooks/use-paged-query'
import type { ListResponse } from '@/lib/api'
import { errorMessage, formatDateTime, formatShortDate } from '@/lib/format'
import { parseSentMail, type ParsedSentMail, type RawSentMail } from '@/lib/sendbox'
import { blockRemoteContent } from '@/lib/remote-content-policy'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/store/prefs'
import { MailHtml, READER_MAIL_FRAME } from './mail-html'
import { ThreePane } from './three-pane'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    searchPlaceholder: '搜索当前页',
    emptyTitle: '发件箱是空的',
    emptyDesc: '发送的邮件会显示在这里',
    noMatch: '没有匹配的邮件',
    selectMail: '选择一封已发送邮件',
    selectMailDesc: '从左侧列表中选择邮件查看内容',
    to: '收件人',
    from: '发件地址',
    noSubject: '（无主题）',
    showRaw: '查看原始 JSON',
    deleteConfirm: '确定删除这封已发送邮件吗？',
  },
  en: {
    searchPlaceholder: 'Search this page',
    emptyTitle: 'No sent mail',
    emptyDesc: 'Mails you send will show up here',
    noMatch: 'No matching mails',
    selectMail: 'Select a sent mail',
    selectMailDesc: 'Choose a mail from the list to view it here',
    to: 'To',
    from: 'From',
    noSubject: '(no subject)',
    showRaw: 'Show raw JSON',
    deleteConfirm: 'Delete this sent mail?',
  },
})

export type SendboxWorkspaceProps = {
  queryKey: QueryKey
  fetchMails: (limit: number, offset: number) => Promise<ListResponse<RawSentMail>>
  deleteMail?: (id: number) => Promise<unknown>
  /** Show the sender address (admin view) */
  showSender?: boolean
  listHeader?: React.ReactNode
}

function SentReader({
  mail,
  showSender,
  onBack,
  onDelete,
}: {
  mail: ParsedSentMail
  showSender?: boolean
  onBack?: () => void
  onDelete?: () => void
}) {
  const t = useT(messages)
  const [raw, setRaw] = useState(false)
  const autoLoad = usePrefs((s) => s.autoLoadRemoteImages)
  const html = useMemo(
    () => (mail.isHtml ? blockRemoteContent(mail.content, { allowRemoteImages: autoLoad }).html : ''),
    [mail, autoLoad],
  )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
        {onBack && (
          <Button variant="ghost" size="icon-sm" className="max-md:size-9" onClick={onBack} aria-label={t('back')}>
            <ArrowLeftIcon />
          </Button>
        )}
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle size="sm" className="max-md:size-9" pressed={raw} onPressedChange={setRaw} aria-label={t('showRaw')}>
              <Code2Icon />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>{t('showRaw')}</TooltipContent>
        </Tooltip>
        {onDelete && (
          <Button variant="ghost" size="icon-sm" className="max-md:size-9" onClick={onDelete} aria-label={t('delete')}>
            <Trash2Icon className="text-destructive" />
          </Button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <article className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:p-6">
          <h2 className="text-xl font-semibold break-words">{mail.subject || t('noSubject')}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {showSender && (
              <>
                <dt className="text-muted-foreground">{t('from')}</dt>
                <dd className="break-all">{mail.address}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{t('to')}</dt>
            <dd className="break-all">{mail.toMail}</dd>
            <dt className="text-muted-foreground">{t('createdAt')}</dt>
            <dd>{formatDateTime(mail.created_at)}</dd>
          </dl>
          <Separator />
          {raw ? (
            <pre className="overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap break-all">{mail.prettyRaw}</pre>
          ) : mail.isHtml ? (
            <MailHtml html={html} className={READER_MAIL_FRAME} />
          ) : (
            <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap break-words">{mail.content}</pre>
          )}
        </article>
      </ScrollArea>
    </div>
  )
}

/** List + reader for sent mails (sendbox). */
export function SendboxWorkspace({ queryKey, fetchMails, deleteMail, showSender, listHeader }: SendboxWorkspaceProps) {
  const t = useT(messages)
  const isMobile = useIsMobile()
  const paged = usePagedQuery<RawSentMail, ParsedSentMail>({
    queryKey,
    fetchPage: fetchMails,
    transform: (rows) => rows.map(parseSentMail),
  })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return paged.items
    return paged.items.filter((m) => [m.subject, m.toMail, m.content].some((f) => (f || '').toLowerCase().includes(kw)))
  }, [paged.items, keyword])
  // nothing is opened until the user picks a mail (same as the inbox)
  const selected = filtered.find((m) => m.id === selectedId) || null

  const onDelete =
    deleteMail && selected
      ? async () => {
          if (!(await confirm({ title: t('deleteConfirm'), description: selected.subject, destructive: true, confirmText: t('delete') }))) return
          try {
            await deleteMail(selected.id)
            toast.success(t('deleted'))
            setSelectedId(null)
            await paged.refetch()
          } catch (error) {
            toast.error(errorMessage(error))
          }
        }
      : undefined

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
        <InputGroup className="h-8 flex-1">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t('searchPlaceholder')} />
        </InputGroup>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => (paged.page === 1 ? paged.refetch() : paged.setPage(1))}
          aria-label={t('refresh')}
        >
          <RefreshCwIcon className={cn(paged.isFetching && 'animate-spin')} />
        </Button>
      </div>
      {listHeader && <div className="shrink-0 border-b p-2">{listHeader}</div>}
      <ScrollArea className="min-h-0 flex-1">
        {paged.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid gap-2 border-b px-4 py-3">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            className="py-16"
            icon={<SendIcon />}
            title={keyword ? t('noMatch') : t('emptyTitle')}
            description={keyword ? undefined : t('emptyDesc')}
          />
        ) : (
          filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedId(m.id)}
              data-selected={m.id === selectedId || undefined}
              className="relative grid w-full gap-0.5 border-b px-4 py-3 text-left transition-colors hover:bg-accent/60 data-[selected]:bg-primary/8 data-[selected]:before:absolute data-[selected]:before:inset-y-0 data-[selected]:before:left-0 data-[selected]:before:w-0.5 data-[selected]:before:bg-primary"
            >
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {t('to')}: {m.toMail}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatShortDate(m.created_at)}</span>
              </div>
              {showSender && <span className="truncate text-xs text-muted-foreground">{m.address}</span>}
              <span className="truncate text-sm text-foreground/80">{m.subject || t('noSubject')}</span>
            </button>
          ))
        )}
      </ScrollArea>
      <DataPagination
        compact
        className="h-11 shrink-0 border-t px-3"
        page={paged.page}
        pageSize={paged.pageSize}
        total={paged.total}
        onPageChange={paged.setPage}
      />
    </div>
  )

  const reader = selected ? (
    <SentReader
      key={selected.id}
      mail={selected}
      showSender={showSender}
      onBack={isMobile ? () => setSelectedId(null) : undefined}
      onDelete={onDelete}
    />
  ) : (
    <EmptyState className="h-full" icon={<SendIcon />} title={t('selectMail')} description={t('selectMailDesc')} />
  )

  return <ThreePane list={list} reader={reader} hasSelection={!!selected} />
}
