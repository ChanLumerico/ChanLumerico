import type { Reader } from './reader'
import type { ArticleBody } from './types'

const STRIP = 'script,style,iframe,object,embed,link,noscript'

/** Sanitise a velog article container in place, then return its markup. */
export const sanitise = (body: Element): void => {
  for (const n of Array.from(body.querySelectorAll(STRIP))) n.remove()
  for (const img of Array.from(body.querySelectorAll('img'))) {
    img.setAttribute('loading', 'lazy')
    img.setAttribute('decoding', 'async')
    if (!img.getAttribute('alt')) img.setAttribute('alt', '')
  }
  for (const a of Array.from(body.querySelectorAll('a'))) {
    const href = a.getAttribute('href') ?? ''
    if (href.startsWith('/')) a.setAttribute('href', `https://velog.io${href}`)
    a.setAttribute('target', '_blank')
    a.setAttribute('rel', 'noopener')
  }
}

/** Sanitise a runtime HTML string that did not come from `.atom-one`. */
export const sanitiseHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  sanitise(doc.body)
  return doc.body.innerHTML
}

/**
 * Ask for the rendered HTML and take velog's article container: it is the
 * only deterministic extraction — the markdown conversion sometimes returns
 * the whole page and flattens every formula into single-token lines.
 */
export const fetchArticle = async (reader: Reader, url: string): Promise<ArticleBody> => {
  const html = await reader.read(url, 'html', {
    urgent: true,
    validate: h => h.includes('atom-one'),
  })
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const body = doc.querySelector('.atom-one')
  if (!body) throw new Error('no article body')
  sanitise(body)
  // KaTeX output is already in the markup when velog rendered it, so leave the
  // rendered math alone and skip a second typeset pass.
  return { html: body.innerHTML, typeset: body.querySelectorAll('.katex').length === 0 }
}
