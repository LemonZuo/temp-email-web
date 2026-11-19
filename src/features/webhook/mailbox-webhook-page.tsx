import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'
import { createWebhookApi } from './webhook-api'
import { WebhookSettingsPage } from './webhook-settings'

const messages = defineMessages({
  zh: {
    title: 'Webhook',
    description: '当前邮箱收到新邮件时，向你的服务推送通知。',
    enableDesc: '收到新邮件后按下方配置发送请求，可配合过滤条件只推送需要的邮件。',
  },
  en: {
    title: 'Webhook',
    description: 'Push a notification to your service when this mailbox receives an email.',
    enableDesc: 'Sends the request below for every new email; use filters to push only the ones you need.',
  },
})

const webhookApi = createWebhookApi('/api/webhook')

/** `/webhook` — per-address webhook settings. */
export default function MailboxWebhookPage() {
  const t = useT(messages)
  const address = useApp((s) => s.addressSettings.address)
  return (
    <WebhookSettingsPage
      key={address}
      queryKey={['mailbox', address, 'webhook']}
      webhookApi={webhookApi}
      title={t('title')}
      description={t('description')}
      enableDescription={t('enableDesc')}
    />
  )
}
