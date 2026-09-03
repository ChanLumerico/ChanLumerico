import { SERIES_ALLOW, seriesIndexUrl, seriesUrl } from './constants'
import { decodeSlug } from './format'
import type { Reader } from './reader'
import type { SeriesRecord, VelogPost } from './types'

/**
 * The rendered series page carries every entry — number, title, the post's
 * own blurb and its date — while the markdown view only samples a window, so
 * parse the HTML with the DOM.
 */
export const parseSeriesHtml = (html: string): VelogPost[] => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: VelogPost[] = []
  for (const h2 of Array.from(doc.querySelectorAll('h2'))) {
    const link = h2.querySelector('a[href*="/@"]')
    if (!link) continue
    const num = h2.querySelector('.number')
    const title = (link.textContent ?? '').trim()
    const cut = title.match(/^\s*\[([^\]]+)\]\s*(.+)$/)
    const info = h2.parentElement?.querySelector('.post-info') ?? null
    const blurbText = info?.querySelector('p')?.textContent ?? ''
    const dateText = info?.querySelector('.date')?.textContent ?? ''
    const href = link.getAttribute('href') ?? ''
    const abs = href.startsWith('/') ? `https://velog.io${href}` : href
    out.push({
      n: num ? Number((num.textContent ?? '').replace(/\D/g, '')) : 0,
      title,
      cleanTitle: cut ? (cut[2] ?? '').trim() : title,
      series: cut ? (cut[1] ?? '').trim() : '',
      href: abs,
      slug: decodeSlug(abs.split('/').filter(Boolean).pop() ?? ''),
      summary: blurbText.trim(),
      dateText: dateText.trim(),
    })
  }
  const seen = new Set<string>()
  return out
    .filter(p => {
      if (!p.slug || seen.has(p.slug)) return false
      seen.add(p.slug)
      return true
    })
    .sort((a, b) => (b.n ?? 0) - (a.n ?? 0))
}

export const seriesNameFromHtml = (html: string, slug: string): string => {
  const m = html.match(/<title[^>]*>([^<]+)</i)
  const tail = m?.[1]?.split('|')[1]
  if (tail) return tail.split(' - ')[0]?.trim() ?? slug.replace(/-/g, ' ')
  return slug.replace(/-/g, ' ')
}

/** Slugs a velog series index page links to. */
export const pickSlugs = (body: string): string[] => {
  const slugs: string[] = []
  const re = /\/series\/([A-Za-z0-9%._-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    const slug = m[1]
    if (slug && !slugs.includes(slug)) slugs.push(slug)
  }
  return slugs
}

/**
 * `SERIES_ALLOW` whitelists which series are surfaced, and also fixes the
 * order they appear in.
 */
export const keepAllowed = (found: readonly string[]): string[] =>
  SERIES_ALLOW.filter(s => found.includes(s))

/**
 * The index page's cards hydrate after the reader's HTML snapshot, but its
 * markdown view does carry the links — so read markdown first there, and only
 * fall back to HTML.
 */
export const discoverSeries = async (reader: Reader): Promise<string[]> => {
  const url = seriesIndexUrl()
  const md = await reader.read(url)
  const fromMd = pickSlugs(md)
  if (fromMd.length > 0) return keepAllowed(fromMd)
  const html = await reader.read(url, 'html')
  return keepAllowed(pickSlugs(html))
}

/**
 * Load one series listing and merge in whatever the feed already knows.
 *
 * The feed carries dates, blurbs and bodies for the newest posts; slugs are
 * compared *decoded* because feed slugs arrive percent-encoded and listing
 * slugs decoded, and comparing the raw forms appends the same post twice.
 */
export const loadSeries = async (
  reader: Reader,
  slug: string,
  feed: readonly VelogPost[],
  urgent = false
): Promise<SeriesRecord> => {
  const html = await reader.read(seriesUrl(slug), 'html', { urgent })
  const posts = parseSeriesHtml(html)
  if (posts.length === 0) throw new Error('no posts parsed')

  for (const p of posts) {
    p.seriesSlug = slug
    const hit = feed.find(f => decodeSlug(f.slug) === decodeSlug(p.slug))
    if (hit) {
      p.date = hit.date
      if (!p.summary) p.summary = hit.summary
      if (hit.content) p.content = hit.content
    }
  }

  const known = new Set(posts.map(p => decodeSlug(p.slug)))
  const seriesName = posts[0]?.series ?? ''
  for (const f of feed) {
    if (f.series && seriesName && f.series === seriesName && !known.has(decodeSlug(f.slug))) {
      posts.push({ ...f, n: 0, seriesSlug: slug })
    }
  }

  posts.sort((a, b) => {
    if (a.n && b.n) return b.n - a.n
    return new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
  })

  return { slug, name: seriesNameFromHtml(html, slug), posts }
}
