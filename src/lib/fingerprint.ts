import FingerprintJS from '@fingerprintjs/fingerprintjs'

let cached: Promise<string> | null = null

/** Browser fingerprint sent as `x-fingerprint`; computed once per page load. */
export const getFingerprint = (): Promise<string> => {
  if (!cached) {
    cached = FingerprintJS.load()
      .then((fp) => fp.get())
      .then((r) => r.visitorId)
      .catch((error) => {
        console.error('Failed to get fingerprint:', error)
        return 'ERROR'
      })
  }
  return cached
}
