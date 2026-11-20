import { PaperclipIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { getAiExtract } from '@/lib/ai-extract'
import type { ParsedMail } from '@/lib/mail-parser'
import { formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/store/prefs'
import { AiExtractCopyChip } from './ai-extract'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: { noSubject: '（无主题）', to: '收件人' },
  en: { noSubject: '(no subject)', to: 'To' },
})

const AVATAR_COLORS = [
  'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
]

export function SenderAvatar({ name, className }: { name: string; className?: string }) {
  const clean = (name || '?').replace(/^["'<\s]+/, '')
  let hash = 0
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) | 0
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase',
        AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length],
        className,
      )}
      aria-hidden
    >
      {clean.charAt(0) || '?'}
    </div>
  )
}

export function MailListItem({
  mail,
  selected,
  unread,
  showRecipient,
  selectable,
  checked,
  onCheckedChange,
  onClick,
}: {
  mail: ParsedMail
  selected: boolean
  unread: boolean
  showRecipient?: boolean
  selectable?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  onClick: () => void
}) {
  const t = useT(messages)
  const previewLines = usePrefs((s) => s.previewLines)
  const extract = getAiExtract(mail.metadata)
  const senderLabel = mail.senderName || mail.senderAddress || mail.originalSource
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      data-selected={selected || undefined}
      className={cn(
        'group relative flex w-full cursor-pointer gap-3 border-b px-3 py-3 text-left outline-none transition-colors',
        'hover:bg-accent/60 focus-visible:bg-accent/60',
        'data-[selected]:bg-primary/8 data-[selected]:before:absolute data-[selected]:before:inset-y-0 data-[selected]:before:left-0 data-[selected]:before:w-0.5 data-[selected]:before:bg-primary',
      )}
    >
      {selectable ? (
        <div className="flex size-9 shrink-0 items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange?.(v === true)} aria-label="select" />
        </div>
      ) : (
        <SenderAvatar name={senderLabel} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {unread && <span className="size-2 shrink-0 translate-y-[-1px] self-center rounded-full bg-primary" aria-label="unread" />}
          <span className={cn('min-w-0 flex-1 truncate text-sm', unread ? 'font-semibold' : 'font-medium text-foreground/90')}>
            {senderLabel}
          </span>
          <span className={cn('shrink-0 text-xs tabular-nums', unread ? 'font-medium text-primary' : 'text-muted-foreground')}>
            {formatShortDate(mail.created_at)}
          </span>
        </div>
        {showRecipient && mail.address && (
          <div className="truncate text-xs text-muted-foreground">
            {t('to')}: {mail.address}
          </div>
        )}
        <div className={cn('truncate text-sm', unread ? 'font-semibold' : 'text-foreground/80')}>
          {mail.subject || t('noSubject')}
        </div>
        {previewLines > 0 && mail.preview && (
          <p
            className="mt-0.5 text-xs leading-relaxed text-muted-foreground"
            style={{ display: '-webkit-box', WebkitLineClamp: previewLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {mail.preview}
          </p>
        )}
        {(extract || mail.attachments.length > 0) && (
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            {extract && <AiExtractCopyChip extract={extract} />}
            {mail.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <PaperclipIcon className="size-3" />
                {mail.attachments.length}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
