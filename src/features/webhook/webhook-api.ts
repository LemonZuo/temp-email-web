import { api } from '@/lib/api'
import type { FilterExpression } from './filter'

/** Worker `WebhookSettings` (`worker/src/models/index.ts`). */
export type WebhookSettings = {
  filter?: FilterExpression | null
  enabled: boolean
  url: string
  method: string
  headers: string
  body: string
}

export type MailIdBody = { mail_id?: number }

export type WebhookApi = {
  fetchSettings: () => Promise<Partial<WebhookSettings>>
  saveSettings: (settings: WebhookSettings) => Promise<unknown>
  testSettings: (settings: WebhookSettings & MailIdBody) => Promise<unknown>
  checkFilter: (body: { filter?: FilterExpression | null } & MailIdBody) => Promise<{ matched?: boolean }>
}

/** `/api/webhook` (mailbox) or `/admin/mail_webhook` (admin): `GET|POST settings`, `POST test`, `POST check_filter`. */
export const createWebhookApi = (base: string): WebhookApi => ({
  fetchSettings: () => api.get<Partial<WebhookSettings>>(`${base}/settings`),
  saveSettings: (settings) => api.post(`${base}/settings`, settings),
  testSettings: (settings) => api.post(`${base}/test`, settings),
  checkFilter: (body) => api.post<{ matched?: boolean }>(`${base}/check_filter`, body),
})
