import {
  MIN_BODY_CHARS,
  READER_POOL_SIZE,
  READER_PREFIX,
  READER_RETRIES,
  READER_RETRY_DELAY_MS,
  READER_TIMEOUT_MS,
  READER_TTL_MS,
} from './constants'
import { fetchWithTimeout, Pool, race, retry } from './net'
import { cacheGet, cachePut } from './store'

export type ReaderFormat = 'md' | 'html'

export interface ReaderOptions {
  /** Reject (and never cache) a body that fails this check. */
  validate?: (body: string) => boolean
  /** Ask the reader for one container instead of the whole page. */
  selector?: string
  /** Bypass the reader's own cache. */
  fresh?: boolean
  /** Jump the queue: this is what the user just opened. */
  urgent?: boolean
}

/**
 * Readers that render JavaScript and answer with CORS open.
 *
 * velog renders series and post pages on the client, so a plain CORS proxy
 * only ever returns the empty SPA shell — which fails every caller's
 * `validate` and is therefore useless here. `r.jina.ai` is the one public
 * service that runs the page in a real browser first. The list is raced, so a
 * second renderer can join it without touching anything else.
 */
export const READERS: readonly {
  name: string
  url: (target: string) => string
  headers: (fmt: ReaderFormat, opts: ReaderOptions) => Record<string, string>
}[] = [
  {
    name: 'r.jina.ai',
    url: target => `https://r.jina.ai/${target}`,
    headers: (fmt, opts) => {
      const headers: Record<string, string> = { 'x-timeout': '40' }
      if (fmt === 'html') headers['x-return-format'] = 'html'
      if (opts.selector) headers['x-target-selector'] = opts.selector
      if (opts.fresh) headers['x-no-cache'] = 'true'
      return headers
    },
  },
]

const keyFor = (fmt: ReaderFormat, url: string) => `${READER_PREFIX}:${fmt}:${url}`

/**
 * Fetches a velog page through a rendering reader.
 *
 * Cached per URL and format for 12h. In-flight calls are de-duplicated. Each
 * attempt gets its own 30s deadline and is retried twice; a body that is too
 * short, or that fails the caller's `validate`, counts as a failure and is
 * never cached. On total failure any cached copy — even a stale one — is
 * served rather than surfacing an error.
 */
export class Reader {
  private readonly pool = new Pool(READER_POOL_SIZE)
  private readonly inflight = new Map<string, Promise<string>>()

  async read(url: string, fmt: ReaderFormat = 'md', opts: ReaderOptions = {}): Promise<string> {
    const key = keyFor(fmt, url)
    let cached = cacheGet(key)

    if (cached && Date.now() - cached.t < READER_TTL_MS) return cached.md
    // Never serve a stale snapshot the caller has since decided is unusable.
    if (cached && opts.validate && !opts.validate(cached.md)) cached = null

    const existing = this.inflight.get(key)
    if (existing) return existing

    const attempt = async (): Promise<string> => {
      const body = await race(
        READERS.map(reader => async () => {
          const res = await fetchWithTimeout(reader.url(url), READER_TIMEOUT_MS, {
            headers: reader.headers(fmt, opts),
          })
          if (!res.ok) throw new Error(String(res.status))
          const text = await res.text()
          if (!text || text.length < MIN_BODY_CHARS) throw new Error('short body')
          // Never cache a snapshot that came back as whole-page chrome.
          if (opts.validate && !opts.validate(text)) throw new Error('bad extraction')
          return text
        })
      )
      cachePut(key, body)
      return body
    }

    const job = this.pool
      .submit(() => retry(attempt, READER_RETRIES, READER_RETRY_DELAY_MS), opts.urgent ? 0 : 1)
      .then(
        body => body,
        () => null
      )
      .then(body => {
        this.inflight.delete(key)
        if (body) return body
        if (cached) return cached.md
        throw new Error('reader unavailable')
      })

    this.inflight.set(key, job)
    return job
  }
}
