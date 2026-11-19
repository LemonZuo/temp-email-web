import DOMPurify from 'dompurify'

export const sanitizeHtml = (html: unknown) => DOMPurify.sanitize(typeof html === 'string' ? html : '')

export const escapeHtml = (str: unknown) =>
  String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
