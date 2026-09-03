import { fetchArticle } from './article'
import {
  FEED_CACHE,
  FEED_FORMAT,
  FEED_TTL_MS,
  LEGACY_KEYS,
  READER_PREFIX,
  seriesUrl,
} from './constants'
import { allowedByWhitelist, fetchFeed } from './feed'
import { decodeSlug } from './format'
import { Reader } from './reader'
import { discoverSeries, loadSeries } from './series'
import { readJson, removeKey, writeJson } from './store'
import type { ArticleBody, LoadState, SeriesRecord, VelogPost } from './types'

interface FeedCache {
  v: number
  t: number
  posts: VelogPost[]
}

export interface SeriesSlot {
  state: LoadState
  record?: SeriesRecord
}

export interface VelogState {
  feed: VelogPost[] | null
  feedState: LoadState
  /** True while a background refresh is repainting already-visible data. */
  feedRefreshing: boolean
  index: string[] | null
  indexState: LoadState
  series: Readonly<Record<string, SeriesSlot>>
}

const EMPTY: VelogState = {
  feed: null,
  feedState: 'idle',
  feedRefreshing: false,
  index: null,
  indexState: 'idle',
  series: {},
}

/**
 * The velog data layer. One source of truth, framework-free: it holds the
 * feed, the discovered series index and every loaded series, and notifies
 * subscribers when any of it changes.
 *
 * Nothing here imports React. `useVelog()` is the only boundary.
 */
export class VelogClient {
  private state: VelogState = EMPTY
  private readonly listeners = new Set<() => void>()
  private readonly reader = new Reader()
  private feedJob: Promise<void> | null = null
  private indexJob: Promise<void> | null = null
  private readonly seriesJobs = new Map<string, Promise<void>>()

  getState = (): VelogState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private set(patch: Partial<VelogState>): void {
    this.state = { ...this.state, ...patch }
    for (const l of this.listeners) l()
  }

  private setSeries(slug: string, slot: SeriesSlot): void {
    this.set({ series: { ...this.state.series, [slug]: slot } })
  }

  // --- feed --------------------------------------------------------------

  /**
   * Cached data paints immediately, then refreshes in the background. A cache
   * written by an older format is discarded rather than painted.
   */
  ensureFeed = (): Promise<void> => {
    if (this.feedJob) return this.feedJob
    for (const key of LEGACY_KEYS) removeKey(key)

    const cached = readJson<FeedCache>(FEED_CACHE)
    const usable = cached?.v === FEED_FORMAT && Array.isArray(cached.posts) ? cached : null
    if (usable && usable.posts.length > 0) {
      this.set({ feed: usable.posts, feedState: 'ready' })
    } else {
      this.set({ feedState: 'loading' })
    }

    const fresh = usable !== null && Date.now() - (usable.t ?? 0) < FEED_TTL_MS
    if (fresh) {
      this.feedJob = Promise.resolve()
      return this.feedJob
    }

    if (this.state.feed) this.set({ feedRefreshing: true })

    this.feedJob = fetchFeed()
      .then(posts => {
        writeJson(FEED_CACHE, { v: FEED_FORMAT, t: Date.now(), posts } satisfies FeedCache)
        this.set({ feed: posts, feedState: 'ready', feedRefreshing: false })
      })
      .catch(() => {
        // Keep whatever was painted from cache; only an empty feed is an error.
        if (this.state.feed) {
          this.set({ feedRefreshing: false })
          return
        }
        this.set({ feed: [], feedState: 'error', feedRefreshing: false })
      })
    return this.feedJob
  }

  /**
   * Refetch the feed from scratch.
   *
   * `ensureFeed` memoises its job so a hundred mounted blocks share one
   * request — which also means a failed load can never recover on its own.
   * This is what a "Try again" is allowed to call.
   */
  retryFeed = (): Promise<void> => {
    this.feedJob = null
    this.set({ feedState: 'loading' })
    return this.ensureFeed()
  }

  /** Latest posts for `.. velog:: n`, whitelist-filtered. */
  latest = (limit: number): VelogPost[] =>
    allowedByWhitelist(this.state.feed ?? []).slice(0, limit)

  // --- series index ------------------------------------------------------

  ensureIndex = (): Promise<void> => {
    if (this.indexJob) return this.indexJob
    this.set({ indexState: 'loading' })
    this.indexJob = discoverSeries(this.reader)
      .then(slugs => {
        this.set({ index: slugs, indexState: 'ready' })
        // Fill the gallery one card at a time, in whitelist order.
        return slugs.reduce(
          (chain, slug) => chain.then(() => this.ensureSeries(slug).catch(() => {})),
          Promise.resolve()
        )
      })
      .catch(() => {
        this.set({ index: null, indexState: 'error' })
      })
    return this.indexJob
  }

  retryIndex = (): Promise<void> => {
    this.indexJob = null
    this.set({ index: null, indexState: 'idle' })
    return this.ensureIndex()
  }

  // --- one series --------------------------------------------------------

  ensureSeries = (slug: string, urgent = false): Promise<void> => {
    const existing = this.seriesJobs.get(slug)
    if (existing) return existing
    const slot = this.state.series[slug]
    if (slot?.state === 'ready') return Promise.resolve()

    this.setSeries(slug, { state: 'loading' })
    const job = loadSeries(this.reader, slug, this.state.feed ?? [], urgent)
      .then(record => {
        this.seriesJobs.delete(slug)
        this.setSeries(slug, { state: 'ready', record })
      })
      .catch(err => {
        this.seriesJobs.delete(slug)
        this.setSeries(slug, { state: 'error' })
        throw err
      })
    this.seriesJobs.set(slug, job)
    return job
  }

  /** A failure is terminal until the user retries; this is that retry. */
  retrySeries = (slug: string): Promise<void> => {
    this.seriesJobs.delete(slug)
    removeKey(`${READER_PREFIX}:html:${seriesUrl(slug)}`)
    this.setSeries(slug, { state: 'idle' })
    return this.ensureSeries(slug, true).catch(() => {})
  }

  // --- posts -------------------------------------------------------------

  /** Look in the feed first, then every loaded series. */
  findPost = (rawSlug: string): VelogPost | null => {
    const want = decodeSlug(rawSlug)
    const fromFeed = (this.state.feed ?? []).find(p => decodeSlug(p.slug) === want)
    if (fromFeed) return fromFeed
    for (const [slug, slot] of Object.entries(this.state.series)) {
      const hit = slot.record?.posts.find(p => decodeSlug(p.slug) === want)
      if (hit) return { ...hit, seriesSlug: hit.seriesSlug ?? slug }
    }
    return null
  }

  /**
   * Resolve a feed post's `[Prefix]` display name to the slug of a series we
   * have actually loaded, by matching a post it contains. Only a real velog
   * slug may be linked; a display name would open an invented series page
   * with fabricated numbering.
   */
  slugForSeriesName = (name: string): string => {
    if (!name) return ''
    for (const [slug, slot] of Object.entries(this.state.series)) {
      const rec = slot.record
      if (!rec) continue
      if (rec.posts[0]?.series === name) return slug
      if (rec.name === name) return slug
    }
    return ''
  }

  seriesName = (slug: string): string =>
    this.state.series[slug]?.record?.name ?? slug.replace(/-/g, ' ')

  fetchArticle = (url: string): Promise<ArticleBody> => fetchArticle(this.reader, url)

  /** Drop every in-memory result and every memoised job. */
  reset = (): void => {
    this.feedJob = null
    this.indexJob = null
    this.seriesJobs.clear()
    this.state = EMPTY
    for (const l of this.listeners) l()
  }
}

/** One client per document. */
export const velogClient = new VelogClient()
