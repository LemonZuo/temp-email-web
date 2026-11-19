// Control characters (0x00-0x1F, DEL) are forbidden in HTTP header values (RFC 7230);
// fetch() throws before sending if one sneaks in from stale localStorage.
const hasControlChar = (str: string) => {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 32 || code === 127) return true
  }
  return false
}

/** Returns a header value safe to send, or undefined to skip the header. */
export const safeHeaderValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') return undefined
  if (hasControlChar(trimmed)) return undefined
  return trimmed
}

export const safeBearerHeader = (jwt: unknown): string | undefined => {
  const safe = safeHeaderValue(jwt)
  return safe ? `Bearer ${safe}` : undefined
}
