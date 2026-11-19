/**
 * Raw string storage helpers. Keys and raw-string encoding match the previous Vue frontend
 * (VueUse `useStorage(key, '')`), so switching frontends keeps users logged in.
 */
export const readRaw = (storage: Storage, key: string, fallback = ''): string => {
  try {
    return storage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export const writeRaw = (storage: Storage, key: string, value: string | null | undefined) => {
  try {
    if (value === null || value === undefined || value === '') storage.removeItem(key)
    else storage.setItem(key, value)
  } catch {
    // storage may be unavailable (private mode / quota)
  }
}

export const readJson = <T,>(storage: Storage, key: string, fallback: T): T => {
  try {
    const value = storage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export const writeJson = (storage: Storage, key: string, value: unknown) => {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}
