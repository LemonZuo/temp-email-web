import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { CheckIcon, CopyIcon, ExternalLinkIcon, KeyRoundIcon, LinkIcon, SparklesIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/clipboard'
import type { AiExtract } from '@/lib/ai-extract'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    authCode: '验证码',
    authLink: '验证链接',
    serviceLink: '服务链接',
    subscriptionLink: '订阅链接',
    otherLink: '链接',
    open: '打开',
    aiExtract: 'AI 提取',
    copyLabel: '复制{label}',
  },
  en: {
    authCode: 'Verification code',
    authLink: 'Verification link',
    serviceLink: 'Service link',
    subscriptionLink: 'Subscription link',
    otherLink: 'Link',
    open: 'Open',
    aiExtract: 'AI extract',
    copyLabel: 'Copy {label}',
  },
})

const TYPE_KEYS = {
  auth_code: 'authCode',
  auth_link: 'authLink',
  service_link: 'serviceLink',
  subscription_link: 'subscriptionLink',
  other_link: 'otherLink',
} as const

/**
 * Chip for list rows that copies the code / link right away. The row itself opens the mail, so clicks and the
 * Enter / Space keys stop here (the row's key handler would otherwise open the mail and cancel the button press).
 * The result shows on the chip itself (green check / red cross) instead of a toast.
 */
export function AiExtractCopyChip({ extract }: { extract: AiExtract }) {
  const t = useT(messages)
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const isCode = extract.type === 'auth_code'
  const label = t(TYPE_KEYS[extract.type as keyof typeof TYPE_KEYS] || 'otherLink')
  const onCopy = async (e: MouseEvent) => {
    e.stopPropagation()
    const ok = await copyText(extract.result)
    clearTimeout(timer.current)
    setStatus(ok ? 'copied' : 'failed')
    timer.current = setTimeout(() => setStatus('idle'), 1500)
  }
  const statusText = status === 'copied' ? t('copied') : status === 'failed' ? t('copyFailed') : t('copyLabel', { label })
  return (
    <Button
      type="button"
      size="xs"
      variant="secondary"
      onClick={onCopy}
      onKeyDown={(e) => e.stopPropagation()}
      title={isCode ? t('copyLabel', { label }) : extract.result}
      aria-label={statusText}
      data-status={status}
      className="min-w-0 max-w-full rounded-full max-md:h-8 max-md:px-3"
    >
      {isCode ? <KeyRoundIcon /> : <LinkIcon />}
      <span className={isCode ? 'font-mono tracking-wider' : 'truncate'}>{isCode ? extract.result : label}</span>
      {status === 'copied' ? (
        <CheckIcon className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
      ) : status === 'failed' ? (
        <XIcon className="text-destructive" strokeWidth={3} />
      ) : (
        <CopyIcon className="opacity-60" />
      )}
    </Button>
  )
}

/** Highlighted card in the reader with copy / open actions. */
export function AiExtractCard({ extract }: { extract: AiExtract }) {
  const t = useT(messages)
  const isCode = extract.type === 'auth_code'
  const label = t(TYPE_KEYS[extract.type as keyof typeof TYPE_KEYS] || 'otherLink')
  const display = isCode ? extract.result : extract.result_text || extract.result
  const onCopy = async () => {
    if (await copyText(extract.result)) toast.success(t('copied'))
    else toast.error(t('copyFailed'))
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {isCode ? <KeyRoundIcon className="size-4" /> : <LinkIcon className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <SparklesIcon className="size-3" />
          {label}
        </div>
        <div className={isCode ? 'font-mono text-xl font-semibold tracking-widest' : 'truncate text-sm font-medium'}>{display}</div>
      </div>
      <Button size="sm" variant="outline" onClick={onCopy}>
        <CopyIcon />
        {t('copy')}
      </Button>
      {!isCode && /^https?:\/\//i.test(extract.result) && (
        <Button size="sm" asChild>
          <a href={extract.result} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon />
            {t('open')}
          </a>
        </Button>
      )}
    </div>
  )
}
