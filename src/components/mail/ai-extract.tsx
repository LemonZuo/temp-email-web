import { CopyIcon, ExternalLinkIcon, KeyRoundIcon, LinkIcon, SparklesIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
  },
  en: {
    authCode: 'Verification code',
    authLink: 'Verification link',
    serviceLink: 'Service link',
    subscriptionLink: 'Subscription link',
    otherLink: 'Link',
    open: 'Open',
    aiExtract: 'AI extract',
  },
})

const TYPE_KEYS = {
  auth_code: 'authCode',
  auth_link: 'authLink',
  service_link: 'serviceLink',
  subscription_link: 'subscriptionLink',
  other_link: 'otherLink',
} as const

/** Compact badge for list rows: shows verification codes inline. */
export function AiExtractBadge({ extract }: { extract: AiExtract }) {
  if (extract.type !== 'auth_code') return null
  return (
    <Badge variant="secondary" className="gap-1 font-mono">
      <KeyRoundIcon className="size-3" />
      {extract.result}
    </Badge>
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
