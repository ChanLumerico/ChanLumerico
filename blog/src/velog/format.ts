/**
 * Dates arrive two ways: an RFC-822 stamp from the RSS feed, and Korean date
 * text ("2025년 3월 7일") scraped from a series listing.
 */
export const fmtDate = (value: string | undefined | null): string => {
  if (!value) return ''
  const raw = String(value)
  const ko = raw.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (ko) {
    const d = new Date(Number(ko[1]), Number(ko[2]) - 1, Number(ko[3]))
    return Number.isNaN(d.getTime()) ? '' : label(d)
  }
  // Feed stamps are RFC 822 ("Tue, 04 Mar 2025 09:00:00 GMT"); the rss2json
  // shape is "2025-02-01 10:00:00", which older Safari will only parse with a
  // `T` separator. The prototype only did the substitution, which silently
  // broke every RFC-822 stamp — so try the string as given first.
  const direct = new Date(raw)
  if (!Number.isNaN(direct.getTime())) return label(direct)
  const patched = new Date(raw.replace(' ', 'T'))
  return Number.isNaN(patched.getTime()) ? '' : label(patched)
}

const label = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

/** Feed slugs arrive percent-encoded, listing slugs decoded. */
export const decodeSlug = (value: string | undefined | null): string => {
  try {
    return decodeURIComponent(value ?? '')
  } catch {
    return value ?? ''
  }
}

export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`
