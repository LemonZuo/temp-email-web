/** Row shape returned by `/api/sendbox`, `/user_api/sendbox`, `/admin/sendbox`. */
export type RawSentMail = {
  id: number
  address?: string
  raw?: string
  created_at?: string
  [key: string]: unknown
}

export type ParsedSentMail = RawSentMail & {
  toMail: string
  subject: string
  isHtml: boolean
  content: string
  prettyRaw: string
}

/** The sendbox `raw` column is the JSON request body (v2 format, or legacy MailChannels format). */
export function parseSentMail(item: RawSentMail): ParsedSentMail {
  const result: ParsedSentMail = { ...item, toMail: '', subject: '', isHtml: false, content: '', prettyRaw: item.raw || '' }
  try {
    const data = JSON.parse(item.raw || '{}')
    result.prettyRaw = JSON.stringify(data, null, 2)
    if (data.version === 'v2') {
      result.toMail = data.to_name ? `${data.to_name} <${data.to_mail}>` : data.to_mail || ''
      result.subject = data.subject || ''
      result.isHtml = !!data.is_html
      result.content = data.content || ''
    } else {
      result.toMail = (data?.personalizations || [])
        .map((p: { to?: { email: string }[] }) => p.to?.map((t) => t.email).join(','))
        .join(';')
      result.subject = data.subject || ''
      result.isHtml = data.content?.[0]?.type !== 'text/plain'
      result.content = data.content?.[0]?.value || ''
    }
  } catch (error) {
    console.error(error)
  }
  return result
}
