export const EXPIRY_PRESET_SECONDS: Record<string, number> = {
  '1h': 3600,
  '24h': 86400,
  '3d': 259200,
  '7d': 604800,
  '30d': 2592000,
}

export type ExpiryMode = 'never' | '1h' | '24h' | '3d' | '7d' | '30d' | 'custom'
export const EXPIRY_MODES: ExpiryMode[] = ['never', '1h', '24h', '3d', '7d', '30d', 'custom']

/**
 * Builds the `expiresAt` part of a new-address request (presets become an absolute ISO time, like the
 * upstream frontend; newer workers no longer accept `expiresIn`).
 * Returns null when a custom date is missing or not in the future.
 */
export const resolveExpiryPayload = (
  expiryMode: string,
  customExpiresAt: number | null | undefined,
  nowMs: number = Date.now(),
): { expiresAt?: string } | null => {
  if (expiryMode === 'custom') {
    if (
      typeof customExpiresAt !== 'number' ||
      !Number.isFinite(customExpiresAt) ||
      Math.floor(customExpiresAt / 1000) <= Math.floor(nowMs / 1000)
    ) {
      return null
    }
    const date = new Date(customExpiresAt)
    if (Number.isNaN(date.getTime())) return null
    return { expiresAt: date.toISOString() }
  }
  const seconds = Object.hasOwn(EXPIRY_PRESET_SECONDS, expiryMode) ? EXPIRY_PRESET_SECONDS[expiryMode] : undefined
  return seconds ? { expiresAt: new Date(nowMs + seconds * 1000).toISOString() } : {}
}
