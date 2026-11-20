import { lazy, Suspense, useMemo, useState } from 'react'
import { EyeIcon, PencilIcon, SendIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MailHtml } from '@/components/mail/mail-html'
import { blockRemoteContent } from '@/lib/remote-content-policy'
import { errorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCompose, type ComposeStore, type ContentType } from '@/store/compose'
import { usePrefs } from '@/store/prefs'
import { defineMessages, useT } from '@/i18n'

const RichEditor = lazy(() => import('./rich-editor').then((m) => ({ default: m.RichEditor })))

const messages = defineMessages({
  zh: {
    from: '发件人',
    fromName: '发件人名称（可选）',
    to: '收件人',
    toName: '收件人名称（可选）',
    toMail: '收件人邮箱',
    subject: '主题',
    text: '纯文本',
    html: 'HTML',
    rich: '富文本',
    contentPlaceholder: '在这里输入正文…',
    htmlPlaceholder: '在这里粘贴 HTML…',
    preview: '预览',
    editing: '编辑',
    discard: '清空草稿',
    discardConfirm: '草稿已清空',
    send: '发送',
    sending: '发送中…',
    sent: '邮件已发送',
    subjectEmpty: '请输入主题',
    toMailEmpty: '请输入收件人邮箱',
    contentEmpty: '请输入正文',
  },
  en: {
    from: 'From',
    fromName: 'Sender name (optional)',
    to: 'To',
    toName: 'Recipient name (optional)',
    toMail: 'Recipient email',
    subject: 'Subject',
    text: 'Plain text',
    html: 'HTML',
    rich: 'Rich text',
    contentPlaceholder: 'Write your message…',
    htmlPlaceholder: 'Paste HTML here…',
    preview: 'Preview',
    editing: 'Edit',
    discard: 'Discard draft',
    discardConfirm: 'Draft discarded',
    send: 'Send',
    sending: 'Sending…',
    sent: 'Mail sent',
    subjectEmpty: 'Subject is required',
    toMailEmpty: 'Recipient email is required',
    contentEmpty: 'Content is required',
  },
})

/** Request body accepted by every send endpoint (`/api/send_mail`, `/user_api/address/:id/send_mail`, `/admin/send_mail`...). */
export type SendMailPayload = {
  from_name: string
  to_name: string
  to_mail: string
  subject: string
  is_html: boolean
  content: string
}

const normalizeText = (content: string) => content.replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '').replace(/\s+/g, ' ').trim()

const hasContent = (content: string, contentType: ContentType) => {
  if (!content) return false
  if (contentType === 'text') return normalizeText(content).length > 0
  // DOMParser builds an inert document: no image loads or event handlers (unlike innerHTML on a live element),
  // which matters because the draft may hold untrusted text from a forwarded mail.
  const container = new DOMParser().parseFromString(content, 'text/html').body
  container.querySelectorAll('script, style, noscript, template').forEach((n) => n.remove())
  if (normalizeText(container.textContent ?? '').length > 0) return true
  return !!container.querySelector('img, audio, video, iframe, svg, canvas, table')
}

/** Label + fields. Fields wrap, so a `nameInput` drops onto its own line on phones instead of squeezing the address. */
function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-11 items-start gap-3 border-b px-4', className)}>
      <span className="flex h-11 w-16 shrink-0 items-center text-sm text-muted-foreground">{label}</span>
      <div className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-2">{children}</div>
    </div>
  )
}

const bareInput = 'h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent'
/** Optional display name next to an address: its own line on phones, a right-aligned 14rem field from `sm` */
const nameInput = cn(bareInput, 'basis-full sm:basis-56 sm:text-right')

/**
 * Mail composer bound to the shared session draft (so reply/forward can prefill it).
 * The caller decides which endpoint to send to via `onSend`.
 */
export function ComposeForm({
  fromAddress,
  fromSlot,
  onSend,
  onSent,
  sentHint,
  disabled,
  notice,
  store = useCompose,
}: {
  /** Read-only sender address shown in the From row */
  fromAddress?: string
  /** Replaces the From address display (e.g. admin picks a sender) */
  fromSlot?: React.ReactNode
  onSend: (payload: SendMailPayload) => Promise<unknown>
  onSent?: () => void
  /** Extra line under the "sent" toast */
  sentHint?: string
  disabled?: boolean
  /** Shown above the form (balance, permission request...) */
  notice?: React.ReactNode
  /** Draft store, defaults to the shared mailbox draft */
  store?: ComposeStore
}) {
  const t = useT(messages)
  const { draft, revision, setDraft, reset } = store()
  const autoLoad = usePrefs((s) => s.autoLoadRemoteImages)
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)

  const previewHtml = useMemo(
    () => (preview && draft.contentType !== 'text' ? blockRemoteContent(draft.content, { allowRemoteImages: autoLoad }).html : ''),
    [preview, draft.content, draft.contentType, autoLoad],
  )

  const send = async () => {
    if (sending) return
    const subject = draft.subject.trim()
    const toMail = draft.toMail.trim()
    if (!subject) return toast.error(t('subjectEmpty'))
    if (!toMail) return toast.error(t('toMailEmpty'))
    if (!hasContent(draft.content, draft.contentType)) return toast.error(t('contentEmpty'))
    setSending(true)
    try {
      await onSend({
        from_name: draft.fromName,
        to_name: draft.toName,
        to_mail: toMail,
        subject,
        is_html: draft.contentType !== 'text',
        content: draft.content,
      })
      reset()
      setPreview(false)
      toast.success(t('sent'), { description: sentHint })
      onSent?.()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {notice && <div className="shrink-0 border-b px-4 py-3">{notice}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col">
          <Row label={t('from')}>
            {fromSlot ?? <span className="min-w-0 flex-1 py-2.5 text-sm font-medium break-all sm:truncate">{fromAddress}</span>}
            <Input
              className={nameInput}
              value={draft.fromName}
              onChange={(e) => setDraft({ fromName: e.target.value })}
              placeholder={t('fromName')}
            />
          </Row>
          <Row label={t('to')}>
            <Input
              className={cn(bareInput, 'flex-1 basis-48')}
              type="email"
              value={draft.toMail}
              onChange={(e) => setDraft({ toMail: e.target.value })}
              placeholder={t('toMail')}
              autoComplete="email"
            />
            <Input
              className={nameInput}
              value={draft.toName}
              onChange={(e) => setDraft({ toName: e.target.value })}
              placeholder={t('toName')}
            />
          </Row>
          <Row label={t('subject')}>
            <Input
              className={cn(bareInput, 'font-medium')}
              value={draft.subject}
              onChange={(e) => setDraft({ subject: e.target.value })}
              placeholder={t('subject')}
            />
          </Row>
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={draft.contentType}
              onValueChange={(v) => v && setDraft({ contentType: v as ContentType })}
            >
              <ToggleGroupItem value="text">{t('text')}</ToggleGroupItem>
              <ToggleGroupItem value="html">{t('html')}</ToggleGroupItem>
              <ToggleGroupItem value="rich">{t('rich')}</ToggleGroupItem>
            </ToggleGroup>
            {draft.contentType !== 'text' && (
              <Button variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>
                {preview ? <PencilIcon /> : <EyeIcon />}
                {preview ? t('editing') : t('preview')}
              </Button>
            )}
          </div>
          <div className="px-4 pb-4">
            {preview && draft.contentType !== 'text' ? (
              <MailHtml html={previewHtml} className="min-h-[280px] border" />
            ) : draft.contentType === 'rich' ? (
              <Suspense fallback={<Skeleton className="h-[320px] w-full" />}>
                <RichEditor key={revision} value={draft.content} onChange={(content) => setDraft({ content })} />
              </Suspense>
            ) : (
              <Textarea
                className={cn(
                  'min-h-[320px] resize-y',
                  draft.contentType === 'html' && 'font-mono text-xs',
                )}
                value={draft.content}
                onChange={(e) => setDraft({ content: e.target.value })}
                placeholder={draft.contentType === 'html' ? t('htmlPlaceholder') : t('contentPlaceholder')}
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-t px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            reset()
            setPreview(false)
            toast(t('discardConfirm'))
          }}
        >
          <Trash2Icon />
          {t('discard')}
        </Button>
        <Button onClick={send} disabled={disabled || sending} className="min-w-28">
          {sending ? <Spinner /> : <SendIcon />}
          {sending ? t('sending') : t('send')}
        </Button>
      </div>
    </div>
  )
}
