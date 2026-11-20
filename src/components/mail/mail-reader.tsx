import { useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CloudUploadIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FileTextIcon,
  ForwardIcon,
  ImageOffIcon,
  InfoIcon,
  MailIcon,
  MailOpenIcon,
  Maximize2Icon,
  PaperclipIcon,
  ReplyIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { confirm } from '@/components/common/confirm'
import { CopyButton } from '@/components/common/copy-button'
import { blockRemoteContent } from '@/lib/remote-content-policy'
import { downloadEml, getAiExtract, type MailAttachment, type ParsedMail } from '@/lib/mail-parser'
import { formatDateTime } from '@/lib/format'
import { usePrefs } from '@/store/prefs'
import { AiExtractCard } from './ai-extract'
import { MailHtml, READER_MAIL_FRAME } from './mail-html'
import { SenderAvatar } from './mail-list'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    noSubject: '（无主题）',
    from: '发件人',
    to: '收件人',
    date: '时间',
    reply: '回复',
    forward: '转发',
    delete: '删除',
    deleteConfirm: '确定删除这封邮件吗？',
    markAsRead: '标为已读',
    markAsUnread: '标为未读',
    downloadEml: '下载 .eml',
    showText: '查看纯文本',
    showHtml: '查看 HTML',
    fullscreen: '全屏查看',
    details: '邮件详情',
    attachments: '附件',
    saveToS3: '保存到 S3',
    remoteBlocked: '已拦截 {n} 处远程内容以保护隐私。',
    loadImages: '显示远程图片',
    prevMail: '上一封',
    nextMail: '下一封',
    messageId: 'Message-ID',
    envelopeFrom: '信封发件人',
    rawSource: '原始邮件',
    empty: '（空）',
  },
  en: {
    noSubject: '(no subject)',
    from: 'From',
    to: 'To',
    date: 'Date',
    reply: 'Reply',
    forward: 'Forward',
    delete: 'Delete',
    deleteConfirm: 'Delete this mail?',
    markAsRead: 'Mark as read',
    markAsUnread: 'Mark as unread',
    downloadEml: 'Download .eml',
    showText: 'Show plain text',
    showHtml: 'Show HTML',
    fullscreen: 'Fullscreen',
    details: 'Details',
    attachments: 'Attachments',
    saveToS3: 'Save to S3',
    remoteBlocked: 'Blocked {n} remote resources to protect your privacy.',
    loadImages: 'Load remote images',
    prevMail: 'Previous',
    nextMail: 'Next',
    messageId: 'Message-ID',
    envelopeFrom: 'Envelope from',
    rawSource: 'Raw source',
    empty: '(empty)',
  },
})

export type MailReaderProps = {
  mail: ParsedMail
  unread?: boolean
  showRecipient?: boolean
  onBack?: () => void
  onPrev?: () => void
  onNext?: () => void
  onReply?: () => void
  onForward?: () => void
  onDelete?: () => Promise<void> | void
  onToggleRead?: () => void
  onSaveToS3?: (attachment: MailAttachment) => Promise<void>
}

function IconAction({ label, onClick, children, disabled }: { label: string; onClick?: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="max-md:size-9" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function AttachmentChip({ attachment, onSaveToS3 }: { attachment: MailAttachment; onSaveToS3?: (a: MailAttachment) => Promise<void> }) {
  const t = useT(messages)
  const [saving, setSaving] = useState(false)
  return (
    <div className="flex max-w-full items-center gap-2 rounded-lg border bg-muted/30 py-1.5 pr-1 pl-3 text-sm">
      <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <a href={attachment.url} download={attachment.filename} className="min-w-0 truncate hover:underline" title={attachment.filename}>
        {attachment.filename}
      </a>
      <span className="shrink-0 text-xs text-muted-foreground">{attachment.size}</span>
      <Button variant="ghost" size="icon-xs" asChild aria-label={t('download')}>
        <a href={attachment.url} download={attachment.filename}>
          <DownloadIcon />
        </a>
      </Button>
      {onSaveToS3 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={saving}
              aria-label={t('saveToS3')}
              onClick={async () => {
                setSaving(true)
                try {
                  await onSaveToS3(attachment)
                } finally {
                  setSaving(false)
                }
              }}
            >
              <CloudUploadIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('saveToS3')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

/** `inPane`: rendered in the reader pane (edge-to-edge on phones), not the fullscreen dialog. */
function MailBody({ mail, showText, inPane }: { mail: ParsedMail; showText: boolean; inPane?: boolean }) {
  const t = useT(messages)
  const autoLoad = usePrefs((s) => s.autoLoadRemoteImages)
  // Per-mail consent; resets when another mail is shown (component is keyed by mail id)
  const [allowRemote, setAllowRemote] = useState(false)
  const allow = autoLoad || allowRemote
  const processed = useMemo(() => {
    if (!mail.message) return { html: '', blocked: 0 }
    return blockRemoteContent(mail.message, { allowRemoteImages: allow })
  }, [mail.message, allow])

  if (showText || !mail.message) {
    return (
      <pre className="font-sans text-sm leading-relaxed break-words whitespace-pre-wrap">{mail.text || mail.raw || t('empty')}</pre>
    )
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {processed.blocked > 0 && !allow && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
          <ImageOffIcon className="size-4 text-amber-600 dark:text-amber-400" />
          <span className="flex-1">{t('remoteBlocked', { n: processed.blocked })}</span>
          <Button size="xs" variant="outline" onClick={() => setAllowRemote(true)}>
            {t('loadImages')}
          </Button>
        </div>
      )}
      <MailHtml html={processed.html} className={inPane ? READER_MAIL_FRAME : 'border'} />
    </div>
  )
}

/** Reading pane for a parsed mail. */
export function MailReader({
  mail,
  unread,
  showRecipient,
  onBack,
  onPrev,
  onNext,
  onReply,
  onForward,
  onDelete,
  onToggleRead,
  onSaveToS3,
}: MailReaderProps) {
  const t = useT(messages)
  const preferText = usePrefs((s) => s.preferShowTextMail)
  const [showText, setShowText] = useState(preferText)
  const [fullscreen, setFullscreen] = useState(false)
  const [details, setDetails] = useState(false)
  const extract = getAiExtract(mail.metadata)

  const handleDelete = async () => {
    if (!onDelete) return
    if (await confirm({ title: t('deleteConfirm'), description: mail.subject, destructive: true, confirmText: t('delete') })) {
      await onDelete()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
        {onBack && (
          <IconAction label={t('back')} onClick={onBack}>
            <ArrowLeftIcon />
          </IconAction>
        )}
        {onReply && (
          <Button variant="ghost" size="sm" className="max-sm:size-9" onClick={onReply} aria-label={t('reply')}>
            <ReplyIcon />
            <span className="hidden sm:inline">{t('reply')}</span>
          </Button>
        )}
        {onForward && (
          <Button variant="ghost" size="sm" className="max-sm:size-9" onClick={onForward} aria-label={t('forward')}>
            <ForwardIcon />
            <span className="hidden sm:inline">{t('forward')}</span>
          </Button>
        )}
        {onToggleRead && (
          <IconAction label={unread ? t('markAsRead') : t('markAsUnread')} onClick={onToggleRead}>
            {unread ? <MailOpenIcon /> : <MailIcon />}
          </IconAction>
        )}
        {onDelete && (
          <IconAction label={t('delete')} onClick={handleDelete}>
            <Trash2Icon className="text-destructive" />
          </IconAction>
        )}
        <div className="flex-1" />
        {(onPrev || onNext) && (
          <>
            <IconAction label={t('prevMail')} onClick={onPrev} disabled={!onPrev}>
              <ChevronUpIcon />
            </IconAction>
            <IconAction label={t('nextMail')} onClick={onNext} disabled={!onNext}>
              <ChevronDownIcon />
            </IconAction>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="max-md:size-9" aria-label={t('more')}>
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => downloadEml(mail.raw, `${mail.id}.eml`)}>
              <DownloadIcon />
              {t('downloadEml')}
            </DropdownMenuItem>
            {mail.message && (
              <DropdownMenuItem onClick={() => setShowText((s) => !s)}>
                <FileTextIcon />
                {showText ? t('showHtml') : t('showText')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setFullscreen(true)}>
              <Maximize2Icon />
              {t('fullscreen')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDetails(true)}>
              <InfoIcon />
              {t('details')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* content */}
      <ScrollArea className="min-h-0 flex-1">
        <article className="grid grid-cols-[minmax(0,1fr)] gap-5 p-4 md:p-6">
          <h2 className="text-xl leading-snug font-semibold break-words">{mail.subject || t('noSubject')}</h2>
          <div className="flex items-start gap-3">
            <SenderAvatar name={mail.senderName || mail.senderAddress} className="size-10" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold">{mail.senderName || mail.senderAddress}</span>
                {mail.senderName && <span className="truncate text-muted-foreground">&lt;{mail.senderAddress}&gt;</span>}
              </div>
              {showRecipient && mail.address && (
                <div className="truncate text-muted-foreground">
                  {t('to')}: {mail.address}
                </div>
              )}
            </div>
            <time className="shrink-0 text-xs text-muted-foreground">{formatDateTime(mail.created_at)}</time>
          </div>
          {extract && <AiExtractCard extract={extract} />}
          {mail.attachments.length > 0 && (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <PaperclipIcon className="size-3.5" />
                {t('attachments')} ({mail.attachments.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {mail.attachments.map((a) => (
                  <AttachmentChip key={a.id} attachment={a} onSaveToS3={onSaveToS3} />
                ))}
              </div>
            </div>
          )}
          <Separator />
          <MailBody key={mail.id} mail={mail} showText={showText} inPane />
        </article>
      </ScrollArea>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex h-[95vh] max-w-[95vw] flex-col sm:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{mail.subject || t('noSubject')}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto">
            <MailBody key={mail.id} mail={mail} showText={showText} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={details} onOpenChange={setDetails}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('details')}</DialogTitle>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">{t('id')}</dt>
            <dd className="font-mono">{mail.id}</dd>
            {mail.message_id && (
              <>
                <dt className="text-muted-foreground">{t('messageId')}</dt>
                <dd className="font-mono break-all">{mail.message_id}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{t('from')}</dt>
            <dd className="break-all">{mail.sender}</dd>
            <dt className="text-muted-foreground">{t('envelopeFrom')}</dt>
            <dd className="break-all">{mail.originalSource}</dd>
            <dt className="text-muted-foreground">{t('to')}</dt>
            <dd className="break-all">{mail.address}</dd>
            <dt className="text-muted-foreground">{t('date')}</dt>
            <dd>{formatDateTime(mail.created_at)}</dd>
          </dl>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('rawSource')}</span>
            <CopyButton value={mail.raw || ''} label />
          </div>
          <pre className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap break-all">
            {mail.raw}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
