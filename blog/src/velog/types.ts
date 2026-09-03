export interface VelogPost {
  /** Raw velog title, including any `[Series]` prefix. */
  title: string
  /** Title with the `[Series]` prefix removed. */
  cleanTitle: string
  /** The `[Series]` prefix, or '' when the title carries none. */
  series: string
  href: string
  /** Last path segment of `href`. Feed slugs arrive percent-encoded. */
  slug: string
  /** RFC-822 stamp from the feed, when it came from the feed. */
  date?: string
  /** Korean date text from a series listing, when it came from a listing. */
  dateText?: string
  summary: string
  /** Full HTML body, present only for posts the feed carried. */
  content?: string
  /** Index within its series, from the listing page. 0 when unknown. */
  n?: number
  /** The velog slug of the series this post belongs to, once known. */
  seriesSlug?: string
}

export interface SeriesRecord {
  slug: string
  /** Display name, from the series page's <title>. */
  name: string
  posts: VelogPost[]
}

export interface ArticleBody {
  html: string
  /** False when velog's own KaTeX output is already in the markup. */
  typeset: boolean
}

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'
