/**
 * velog's markdown pass italicises `*…*` / `_…_` pairs even inside math, so
 * some formulas reach us with `<em>` where a delimiter used to be. Restore it
 * inside math spans only — italics in prose stay italics.
 */
export const repairMath = (html: string): string => {
  const s = String(html)
  const DELIMS: Record<string, string> = {
    strong: '**',
    b: '**',
    del: '~',
    s: '~',
    em: '_',
    i: '_',
  }
  let out = ''
  let i = 0
  let inMath = false
  const open: { tag: string; delim: string | null }[] = []

  while (i < s.length) {
    const ch = s[i] as string
    if (ch === '$' && s[i - 1] !== '\\') {
      const dbl = s[i + 1] === '$'
      out += dbl ? '$$' : '$'
      i += dbl ? 2 : 1
      inMath = !inMath
      continue
    }
    if (ch === '<') {
      const m = /^<(\/?)(em|strong|del|s|i|b)>/i.exec(s.slice(i, i + 12))
      if (m) {
        const tag = (m[2] ?? '').toLowerCase()
        if (m[1] !== '/') {
          // A pair that starts inside math had its delimiter eaten; close it
          // with the same delimiter even if the closing tag lands later.
          let delim: string | null = null
          if (inMath) {
            const prev = out.slice(-1)
            delim =
              tag === 'em' || tag === 'i'
                ? prev === '^' || prev === '_'
                  ? '*'
                  : '_'
                : (DELIMS[tag] ?? null)
          }
          open.push({ tag, delim })
          out += delim ?? m[0]
        } else {
          let idx = -1
          for (let k = open.length - 1; k >= 0; k--) {
            if (open[k]?.tag === tag) {
              idx = k
              break
            }
          }
          const rec = idx >= 0 ? open.splice(idx, 1)[0] : null
          out += rec?.delim ?? m[0]
        }
        i += m[0].length
        continue
      }
      // Any other tag is copied verbatim so a `$` in an attribute cannot flip
      // the math state.
      const gt = s.indexOf('>', i)
      if (gt < 0) {
        out += s.slice(i)
        break
      }
      out += s.slice(i, gt + 1)
      i = gt + 1
      continue
    }
    out += ch
    i++
  }
  return out
}

export const esc = (s: string): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const inline = (s: string): string => {
  let t = esc(s)
  t = t.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`)
  t = t.replace(
    /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g,
    (_m, alt, url) => `<img src="${url}" alt="${alt}">`
  )
  t = t.replace(
    /\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g,
    (_m, txt, url) => `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`
  )
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  t = t.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  // Underscore emphasis. JS \w is ASCII-only, so Hangul already counts as a
  // word boundary — Korean particles may follow the closing marker directly,
  // while snake_case identifiers stay untouched.
  t = t.replace(/(^|[^\w*])_([^_\n]+?)_(?!\w)/g, '$1<em>$2</em>')
  return t
}

const READER_PREAMBLE = [
  /^Title:.*$/m,
  /^URL Source:.*$/m,
  /^Markdown Content:\s*/m,
  /^Warning:.*$/m,
]

/**
 * Sentinels for the math and code spans lifted out before block parsing.
 * NUL cannot appear in the source text, so a placeholder can never collide
 * with real copy.
 */
const NUL = '\u0000'
const MATH_PH = new RegExp(`${NUL}M(\\d+)${NUL}`, 'g')
const CODE_PH = new RegExp(`^${NUL}C(\\d+)${NUL}$`)
const CODE_PH_ALL = new RegExp(`${NUL}C(\\d+)${NUL}`, 'g')

/** Minimal markdown → HTML, enough for a velog article read as markdown. */
export const mdToHtml = (src: string): string => {
  let md = String(src ?? '')
  for (const re of READER_PREAMBLE) md = md.replace(re, '')
  md = md.trim()

  const math: string[] = []
  md = md.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g, m => {
    math.push(m)
    return `${NUL}M${math.length - 1}${NUL}`
  })

  const code: string[] = []
  md = md.replace(/```([a-z0-9+#-]*)\n([\s\S]*?)```/gi, (_m, _lang, body: string) => {
    code.push(`<pre><code>${esc(body.replace(/\n$/, ''))}</code></pre>`)
    return `${NUL}C${code.length - 1}${NUL}`
  })

  const html: string[] = []
  let list: 'ul' | 'ol' | null = null
  const closeList = () => {
    if (list) {
      html.push(`</${list}>`)
      list = null
    }
  }

  for (const raw of md.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      closeList()
      continue
    }
    const ph = line.match(CODE_PH)
    if (ph) {
      closeList()
      html.push(code[Number(ph[1])] ?? '')
      continue
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList()
      html.push('<hr>')
      continue
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeList()
      const lvl = Math.min((h[1] ?? '').length + 1, 6)
      html.push(`<h${lvl}>${inline(h[2] ?? '')}</h${lvl}>`)
      continue
    }
    const q = line.match(/^>\s?(.*)$/)
    if (q) {
      closeList()
      html.push(`<blockquote>${inline(q[1] ?? '')}</blockquote>`)
      continue
    }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/)
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ol || ul) {
      const want = ol ? 'ol' : 'ul'
      if (list !== want) {
        closeList()
        html.push(`<${want}>`)
        list = want
      }
      html.push(`<li>${inline((ol ?? ul)?.[1] ?? '')}</li>`)
      continue
    }
    closeList()
    html.push(`<p>${inline(line)}</p>`)
  }
  closeList()

  let out = html.join('\n')
  out = out.replace(CODE_PH_ALL, (_m, i: string) => code[Number(i)] ?? '')
  out = out.replace(MATH_PH, (_m, i: string) => math[Number(i)] ?? '')
  return out
}

/**
 * The reader sometimes returns velog's whole page instead of the article.
 * Reject a chrome dump outright.
 */
export const goodArticle = (md: string): boolean => {
  const body = String(md ?? '')
  if (!/^(?:\s*|Title:.*|URL Source:.*|Markdown Content:\s*|Warning:.*)$/m.test(body))
    return true
  const head = body
    .replace(/^Title:.*$/m, '')
    .replace(/^URL Source:.*$/m, '')
    .replace(/^Markdown Content:\s*/m, '')
    .trim()
    .slice(0, 200)
  if (/lumerico284\.log|로그인/.test(head)) return false
  if (/목록 보기|댓글 작성/.test(body)) return false
  return true
}

/** Trim velog's header/footer furniture from a markdown snapshot. */
export const stripChrome = (md: string): string => {
  let body = String(md ?? '')
  // Head: everything up to the series widget ("목록 보기" + "n/m") or the
  // author·date line that velog prints above the article.
  const heads = [
    /목록 보기\s*\n+\s*\d+\s*\/\s*\d+\s*\n/,
    /^.*·\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일.*$/m,
  ]
  for (const re of heads) {
    const m = body.match(re)
    if (m?.index !== undefined && m.index < body.length * 0.4) {
      body = body.slice(m.index + m[0].length)
    }
  }
  // Tail: previous/next post navigation, the author bio, comments.
  const tails = [
    /^\s*이전 포스트\s*$/m,
    /^\s*다음 포스트\s*$/m,
    /^\s*\d+개의 댓글\s*$/m,
    /^\s*댓글 작성\s*$/m,
    /^\s*팔로우\s*$/m,
  ]
  for (const re of tails) {
    const m = body.match(re)
    if (m?.index !== undefined && m.index > body.length * 0.4) body = body.slice(0, m.index)
  }
  return body.trim()
}
