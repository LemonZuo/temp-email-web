import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { MailQuestionIcon, MailXIcon, RotateCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/common/empty-state'
import { MailReader } from '@/components/mail/mail-reader'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { parseMail, type RawMail } from '@/lib/mail-parser'
import { defineMessages, useT } from '@/i18n'
import { getTelegramInitData } from './telegram-web-app'

const messages = defineMessages({
  zh: {
    noMailId: '缺少邮件 ID',
    noMailIdDesc: '请从 Telegram 机器人推送的消息中打开邮件。',
    notFound: '邮件不存在',
    notFoundDesc: '这封邮件可能已被删除。',
    loadError: '无法加载邮件',
    retry: '重试',
  },
  en: {
    noMailId: 'Missing mail ID',
    noMailIdDesc: 'Open the mail from a message pushed by the Telegram bot.',
    notFound: 'Mail not found',
    notFoundDesc: 'This mail may have been deleted.',
    loadError: 'Unable to load the mail',
    retry: 'Retry',
  },
})

/**
 * `/telegram_mail?mail_id=` — single mail opened from a Telegram push. `POST /telegram/get_mail`
 * accepts the Telegram `initData` (or the admin password header, attached automatically).
 */
export default function TelegramMailPage() {
  const t = useT(messages)
  const [params] = useSearchParams()
  const mailId = params.get('mail_id') || ''

  const query = useQuery({
    queryKey: ['telegram', 'mail', mailId],
    queryFn: async () => {
      const raw = await api.post<RawMail | null>('/telegram/get_mail', { initData: getTelegramInitData(), mailId })
      return raw ? parseMail(raw) : null
    },
    enabled: !!mailId,
  })

  let content: React.ReactNode
  if (!mailId) {
    content = <EmptyState icon={<MailQuestionIcon />} title={t('noMailId')} description={t('noMailIdDesc')} className="flex-1" />
  } else if (query.isLoading) {
    content = (
      <div className="mx-auto grid w-full max-w-4xl gap-5 p-4 md:p-6">
        <Skeleton className="h-7 w-2/3" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    )
  } else if (query.isError) {
    content = (
      <EmptyState icon={<MailXIcon />} title={t('loadError')} description={errorMessage(query.error)} className="flex-1">
        <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? <Spinner /> : <RotateCwIcon />}
          {t('retry')}
        </Button>
      </EmptyState>
    )
  } else if (!query.data) {
    content = <EmptyState icon={<MailXIcon />} title={t('notFound')} description={t('notFoundDesc')} className="flex-1" />
  } else {
    content = <MailReader key={query.data.id} mail={query.data} showRecipient />
  }

  return <div className="flex h-svh min-h-0 flex-col bg-background">{content}</div>
}
