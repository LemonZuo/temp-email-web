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

/**
 * Invisible characters newsletters pad their preheader with (zero-width space / non-joiner, U+034F, soft hyphen,
 * direction marks, word joiner, BOM...) so mail apps show only the teaser. `\s` does not match them, so the preview
 * showed a long blank run before the ellipsis. ZWJ (U+200D) stays: it joins emoji sequences.
 */
const INVISIBLE_CHARS = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180e\u200b\u200c\u200e\u200f\u202a-\u202e\u2060-\u2064\u3164\ufeff\uffa0]/g

const toPreview = (text: string, html: string) => {
  let plain = text
  if (!plain && html) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('style,script,head,title').forEach((n) => n.remove())
    plain = doc.body?.textContent || ''
  }
  return plain.replace(INVISIBLE_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, 200)
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

type ParsedContent = Pick<ParsedMail, 'sender' | 'senderName' | 'senderAddress' | 'subject' | 'message' | 'text' | 'preview' | 'attachments'>

/** Parses the raw source; the rest of the row (read state, metadata ...) is merged in by `parseMail`. */
async function parseContent(raw: string, originalSource: string): Promise<ParsedContent> {
  const result: ParsedContent = {
    sender: originalSource,
    senderName: '',
    senderAddress: originalSource,
    subject: '',
    message: '',
    text: '',
    preview: '',
    attachments: [],
  }
  try {
    const parsed = await PostalMime.parse(raw)
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
    result.text = raw
    result.preview = raw.slice(0, 200)
  }
  return result
}


/**
 * Parsed content per mail, so refetches (auto refresh) reuse the same attachment object URLs instead of
 * creating new ones every time. Least recently used entries are dropped and their URLs revoked.
 */
const CONTENT_CACHE_LIMIT = 300
const contentCache = new Map<string, Promise<ParsedContent>>()

function cachedContent(item: RawMail & { raw: string }) {
  if (item.id == null) return parseContent(item.raw, item.source || '')
  const key = `${item.id}:${item.raw.length}`
  const hit = contentCache.get(key)
  if (hit) {
    contentCache.delete(key)
    contentCache.set(key, hit)
    return hit
  }
  const entry = parseContent(item.raw, item.source || '')
  contentCache.set(key, entry)
  while (contentCache.size > CONTENT_CACHE_LIMIT) {
    const [oldestKey, oldest] = contentCache.entries().next().value!
    contentCache.delete(oldestKey)
    void oldest.then((c) => c.attachments.forEach((a) => URL.revokeObjectURL(a.url))).catch(() => undefined)
  }
  return entry
}

/** Parses a raw RFC822 mail in the browser (cid: images are rewritten to blob: URLs). */
export async function parseMail(item: RawMail): Promise<ParsedMail> {
  const originalSource = item.source || ''
  const base = {
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
  if (!item.raw) return base
  return { ...base, ...(await cachedContent(item as RawMail & { raw: string })) }
}

export const parseMails = (items: RawMail[]) => Promise.all(items.map(parseMail))

/** Downloads the raw source as `<name>.eml` (the object URL is created on demand and revoked afterwards). */
export function downloadEml(raw: string | undefined, name: string) {
  const url = URL.createObjectURL(new Blob([raw || ''], { type: 'message/rfc822' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export { getAiExtract, type AiExtract } from './ai-extract'
