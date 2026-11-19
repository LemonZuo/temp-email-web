export type AddressTokenPayload = {
  address: string
  address_id?: number
  type?: string
  exp?: number
  [key: string]: unknown
}

/** Decodes (without verifying) an address JWT payload. */
export const decodeAddressToken = (token: string | null | undefined): AddressTokenPayload | null => {
  if (!token) return null
  try {
    const bytes = Uint8Array.from(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
    )
    const payload = JSON.parse(new TextDecoder().decode(bytes))
    return typeof payload?.address === 'string' ? payload : null
  } catch {
    return null
  }
}

export const isPasswordLoginToken = (payload: AddressTokenPayload | null) =>
  payload?.type === 'address_password_login'
