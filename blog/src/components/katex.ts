/**
 * KaTeX, loaded only on the reader route.
 *
 * The prototype pulled katex.min.css and two scripts from a CDN on *every*
 * page. Here it is an npm dependency behind a dynamic import, so Home and
 * Research never pay for it and the fonts are only fetched once a post is
 * actually opened.
 */

type Typeset = (node: HTMLElement) => void

let loader: Promise<Typeset> | null = null

/** Delimiters, verbatim from the prototype's `typeset`. */
const DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false },
]

export const loadTypeset = (): Promise<Typeset> => {
  loader ??= (async () => {
    const [, autoRender] = await Promise.all([
      import('katex/dist/katex.min.css'),
      import('katex/contrib/auto-render'),
    ])
    const render = autoRender.default
    return (node: HTMLElement) => {
      try {
        render(node, { delimiters: DELIMITERS, throwOnError: false, strict: false })
      } catch {
        // A malformed formula must never take the article down with it.
      }
    }
  })()
  return loader
}
