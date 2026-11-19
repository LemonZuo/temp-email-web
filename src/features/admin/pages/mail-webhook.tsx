import { createWebhookApi } from '@/features/webhook/webhook-api'
import { WebhookSettingsPage } from '@/features/webhook/webhook-settings'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '邮件 Webhook',
    description: '所有邮箱收到新邮件时都会触发的全局 Webhook。',
    enableDesc: '每封新邮件都会按下方配置发送请求，与各邮箱自己的 Webhook 相互独立。',
  },
  en: {
    title: 'Mail webhook',
    description: 'A global webhook triggered for every email received by any mailbox.',
    enableDesc: 'Every new email sends the request below, independently of per-address webhooks.',
  },
})

const webhookApi = createWebhookApi('/admin/mail_webhook')

/** `/console/mail-webhook` — global webhook for all incoming mails. */
export default function MailWebhookPage() {
  const t = useT(messages)
  return (
    <WebhookSettingsPage
      queryKey={['admin', 'mail-webhook']}
      webhookApi={webhookApi}
      title={t('title')}
      description={t('description')}
      enableDescription={t('enableDesc')}
    />
  )
}
