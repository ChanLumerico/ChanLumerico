import { READER_PREFIX } from './constants'

/** Every localStorage touch is guarded — a private window throws on access. */
export const readRaw = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const readJson = <T>(key: string): T | null => {
  const raw = readRaw(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const writeJson = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const removeKey = (key: string): void => {
  try {
    localStorage.removeItem(key)
  } catch {
    /* nothing to do */
  }
}

interface ReaderEntry {
  t: number
  md: string
}

/**
 * localStorage fills quickly with rendered pages; on quota failure drop the
 * oldest reader entries and retry once rather than losing the write.
 */
export const cachePut = (key: string, md: string): void => {
  if (writeJson(key, { t: Date.now(), md })) return
  try {
    const entries = Object.keys(localStorage)
      .filter(k => k.startsWith(READER_PREFIX) && k !== key)
      .map(k => ({ k, t: readJson<ReaderEntry>(k)?.t ?? 0 }))
      .sort((a, b) => a.t - b.t)
    for (const e of entries.slice(0, Math.max(3, Math.ceil(entries.length / 2)))) {
      removeKey(e.k)
    }
  } catch {
    /* enumeration itself can throw */
  }
  writeJson(key, { t: Date.now(), md })
}

export const cacheGet = (key: string): ReaderEntry | null => {
  const entry = readJson<ReaderEntry>(key)
  return entry && typeof entry.md === 'string' ? entry : null
}
