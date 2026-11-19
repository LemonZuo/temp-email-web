import PostalMime from 'postal-mime'
import { humanFileSize } from './format'

/** Row shape returned by `/api/mails`, `/user_api/mails`, `/admin/mails` ... */
export type RawMail = {
  id: number
  message_id?: string
  source?: string
  address?: string
  raw?: string
  metadata?: string | null
  is_unread?: number | null
  created_at?: string
  [key: string]: unknown
}

export type MailAttachment = {
  id: string
  filename: string
  size: string
  mimeType: string
  url: string
  blob: Blob
}

export type ParsedMail = RawMail & {
  /** Display sender, e.g. `Name <a@b.com>` */
  sender: string
  senderName: string
  senderAddress: string
  /** Original `source` column (envelope sender) */
  originalSource: string
  subject: string
  /** HTML body (or text fallback) with cid: images rewritten to blob: urls */
  message: string
  text: string
  /** Short plain-text preview for list rows */
  preview: string
  attachments: MailAttachment[]
}

const toPreview = (text: string, html: string) => {
  let plain = text
  if (!plain && html) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('style,script,head,title').forEach((n) => n.remove())
    plain = doc.body?.textContent || ''
  }
  return plain.replace(/\s+/g, ' ').trim().slice(0, 200)
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Parses a raw RFC822 mail in the browser. Object URLs created for attachments live as long
 * as the page; mail lists are small so we accept that instead of tracking revocation.
 */
export async function parseMail(item: RawMail): Promise<ParsedMail> {
  const originalSource = item.source || ''
  const result: ParsedMail = {
    ...item,
    sender: originalSource,
    senderName: '',
    senderAddress: originalSource,
    originalSource,
    subject: '',
    message: '',
    text: '',
    preview: '',
    attachments: [],
  }
  if (!item.raw) return result
  try {
    const parsed = await PostalMime.parse(item.raw)
    const fromAddress = parsed.from?.address || originalSource
    const fromName = parsed.from?.name || ''
    result.senderAddress = fromAddress
    result.senderName = fromName
    result.sender = fromName && fromAddress ? `${fromName} <${fromAddress}>` : fromAddress
    result.subject = parsed.subject || ''
    result.text = parsed.text || ''
    let message = parsed.html || ''
    result.attachments = (parsed.attachments || []).map((att) => {
      const content = att.content as ArrayBuffer | Uint8Array | string
      const blob = new Blob([content as BlobPart], { type: att.mimeType || 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const contentId = (att.contentId || '').replace(/^<|>$/g, '')
      if (contentId && message) {
        message = message.replace(new RegExp(`cid:${escapeRegExp(contentId)}`, 'g'), url)
      }
      const size = typeof content === 'string' ? content.length : content.byteLength
      return {
        id: contentId || Math.random().toString(36).slice(2, 15),
        filename: att.filename || contentId || 'attachment',
        size: humanFileSize(size),
        mimeType: att.mimeType || 'application/octet-stream',
        url,
        blob,
      }
    })
    result.message = message
    result.preview = toPreview(result.text, message)
  } catch (error) {
    console.error('Failed to parse mail', error)
    result.text = item.raw
    result.preview = item.raw.slice(0, 200)
  }
  return result
}

export const parseMails = (items: RawMail[]) => Promise.all(items.map(parseMail))

export const getEmlDownloadUrl = (raw: string | undefined) =>
  URL.createObjectURL(new Blob([raw || ''], { type: 'message/rfc822' }))

/** `metadata.ai_extract` written by the worker's AI extraction feature. */
export type AiExtract = {
  type: 'auth_code' | 'auth_link' | 'service_link' | 'subscription_link' | 'other_link' | string
  result: string
  result_text?: string
}

export const getAiExtract = (metadata: string | null | undefined): AiExtract | null => {
  if (!metadata) return null
  try {
    const data = JSON.parse(metadata)
    return data?.ai_extract?.result ? data.ai_extract : null
  } catch {
    return null
  }
}
