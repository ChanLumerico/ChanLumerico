import { FEED_MAX_POSTS, FEED_TIMEOUT_MS, rssUrl, SERIES_ALLOW } from './constants'
import { fetchWithTimeout, race } from './net'
import type { VelogPost } from './types'

/**
 * velog posts are titled "[Series] Title"; that prefix is what groups a run
 * of posts into a series here.
 */
export const decorate = (raw: {
  title: string
  href: string
  date?: string
  summary?: string
  content?: string
}): VelogPost => {
  const m = raw.title.match(/^\s*\[([^\]]+)\]\s*(.+)$/)
  return {
    title: raw.title,
    series: m ? (m[1] ?? '').trim() : '',
    cleanTitle: m ? (m[2] ?? '').trim() : raw.title,
    href: raw.href,
    slug: raw.href.split('/').filter(Boolean).pop() ?? '',
    date: raw.date,
    summary: raw.summary ?? '',
    content: raw.content,
  }
}

/**
 * Each velog post opens with its own intro section, so take the first real
 * paragraph of the body rather than a blind slice of the whole article.
 */
export const blurb = (html: string): string => {
  const src = String(html ?? '')
  let text = ''
  try {
    const doc = new DOMParser().parseFromString(`<body>${src}</body>`, 'text/html')
    const clean = (n: Element | HTMLElement) =>
      (n.textContent ?? '').replace(/\s+/g, ' ').trim()
    const paras = Array.from(doc.querySelectorAll('p'))
      .map(clean)
      .filter(t => t.length > 24)
    text = paras[0] ?? clean(doc.body)
  } catch {
    text = src
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  // Inline LaTeX reads as noise in a one-line blurb.
  text = text
    .replace(/\$\$?[^$]*\$\$?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 130 ? `${text.slice(0, 129).trimEnd()}…` : text
}

export const parseRss = (xml: string): VelogPost[] => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) return []
  const text = (node: Element, tag: string) =>
    (node.getElementsByTagName(tag)[0]?.textContent ?? '').trim()
  return Array.from(doc.getElementsByTagName('item'))
    .map(item =>
      decorate({
        title: text(item, 'title'),
        href: text(item, 'link'),
        date: text(item, 'pubDate'),
        summary: blurb(text(item, 'description')),
        content: text(item, 'description'),
      })
    )
    .filter(p => p.title && p.href)
}

export const parseJsonFeed = (body: string): VelogPost[] => {
  let data: { items?: unknown } | null = null
  try {
    data = JSON.parse(body) as { items?: unknown }
  } catch {
    return []
  }
  const items = Array.isArray(data?.items) ? (data.items as Record<string, unknown>[]) : []
  return items
    .map(it =>
      decorate({
        title: String(it.title ?? '').trim(),
        href: String(it.link ?? '').trim(),
        date: String(it.pubDate ?? '').trim(),
        summary: blurb(String(it.description ?? it.content ?? '')),
        content: String(it.content ?? it.description ?? ''),
      })
    )
    .filter(p => p.title && p.href)
}

/**
 * velog's feed sends no CORS header. The direct URL is tried anyway in case
 * that ever changes, alongside three CORS-enabled feed readers.
 */
export const FEED_SOURCES: readonly { name: string; url: string; json: boolean }[] = (() => {
  const feed = rssUrl()
  return [
    { name: 'velog', url: feed, json: false },
    {
      name: 'rss2json',
      url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`,
      json: true,
    },
    {
      name: 'allorigins',
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(feed)}`,
      json: false,
    },
    {
      name: 'codetabs',
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feed)}`,
      json: false,
    },
  ]
})()

/**
 * All sources fire at once and the first *usable* response wins. A source
 * that answers with an empty or unparseable feed counts as a failure, so a
 * fast 200 carrying nothing cannot beat a slower real answer. Each request
 * carries its own deadline, so one hanging host can never stall the section.
 */
export const fetchFeed = async (): Promise<VelogPost[]> =>
  race(
    FEED_SOURCES.map(src => async () => {
      const res = await fetchWithTimeout(src.url, FEED_TIMEOUT_MS, { cache: 'no-store' })
      if (!res.ok) throw new Error(`${src.name}: ${res.status}`)
      const body = await res.text()
      const posts = src.json ? parseJsonFeed(body) : parseRss(body)
      if (posts.length === 0) throw new Error(`${src.name}: empty feed`)
      return posts.slice(0, FEED_MAX_POSTS)
    })
  )

/**
 * Keep the latest-posts list to the same series the gallery allows: each
 * whitelisted slug is loosened to a display name, and a post's `[Prefix]`
 * matched against it. Posts with no series always pass.
 */
export const allowedByWhitelist = (posts: readonly VelogPost[]): VelogPost[] => {
  const names = SERIES_ALLOW.map(s => s.replace(/-\d+$/, '').replace(/-/g, ' ').toLowerCase())
  return posts.filter(p => {
    if (!p.series) return true
    const n = p.series.toLowerCase()
    return names.some(a => a.includes(n) || n.includes(a.split(' ')[0] ?? a))
  })
}
