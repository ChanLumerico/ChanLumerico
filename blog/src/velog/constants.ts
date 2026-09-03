export const VELOG_HANDLE = 'lumerico284'

/** Only these velog series are surfaced; anything else stays on velog. */
export const SERIES_ALLOW = ['Diffusion-101', 'Reinforcement-Learning'] as const

export const FEED_CACHE = 'chanlee-velog-feed'

/**
 * Bump whenever the shape or the wording of a cached summary changes; entries
 * written by an older format are discarded instead of being painted.
 */
export const FEED_FORMAT = 5

/** Superseded cache keys, removed on read so they cannot linger. */
export const LEGACY_KEYS = ['chanlee-velog-feed-v2'] as const

export const READER_PREFIX = 'chanlee-jina'

export const FEED_TTL_MS = 6 * 3600 * 1000
export const READER_TTL_MS = 12 * 3600 * 1000

/** Per-request deadline for a feed source. One hung host must not stall the section. */
export const FEED_TIMEOUT_MS = 4500

/** r.jina.ai renders each page in a real browser, so a call can take many seconds. */
export const READER_TIMEOUT_MS = 30000
export const READER_RETRIES = 2
export const READER_RETRY_DELAY_MS = 1200

/**
 * Two readers at a time, and whatever the user just opened goes first — a
 * single strict queue meant a later series waited behind every earlier one,
 * and parallel-everything is what made this flaky.
 */
export const READER_POOL_SIZE = 2

export const FEED_MAX_POSTS = 20

/** A reader body shorter than this is treated as a failed extraction. */
export const MIN_BODY_CHARS = 400

export const velogUrl = (path = ''): string => `https://velog.io/@${VELOG_HANDLE}${path}`
export const seriesUrl = (slug: string): string => velogUrl(`/series/${encodeURI(slug)}`)
export const seriesIndexUrl = (): string => velogUrl('/series')
export const rssUrl = (): string => `https://api.velog.io/rss/@${VELOG_HANDLE}`
