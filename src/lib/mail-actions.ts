import DOMPurify from 'dompurify'
import { escapeHtml } from './sanitize'
import type { ParsedMail } from './mail-parser'
import type { ComposeDraft } from '@/store/compose'

const sanitizeContent = (mail: ParsedMail) => {
  if (mail.message) return DOMPurify.sanitize(mail.message)
  if (mail.text) return escapeHtml(mail.text).replace(/\n/g, '<br>')
  return ''
}

export function buildReplyDraft(mail: ParsedMail, replyLabel: string): Partial<ComposeDraft> {
  const safeContent = sanitizeContent(mail)
  return {
    toName: mail.senderName,
    toMail: mail.senderAddress || mail.originalSource,
    subject: `${replyLabel}: ${mail.subject}`,
    contentType: 'rich',
    content: safeContent ? `<p></p><blockquote>${safeContent}</blockquote><p></p>` : '',
  }
}

export function buildForwardDraft(mail: ParsedMail, forwardLabel: string): Partial<ComposeDraft> {
  return {
    toName: '',
    toMail: '',
    subject: `${forwardLabel}: ${mail.subject}`,
    contentType: mail.message ? 'html' : 'text',
    content: mail.message ? sanitizeContent(mail) : mail.text,
  }
}
