import type { Layout, RstBlock, RstLink, RstSection } from './types'
import { KNOWN_BLOCKS, type KnownBlockName } from './types'

const SECTION_RULE = /^={3,}\s*$/
const DIVIDER_RULE = /^-{3,}\s*$/
const SECTION_OPT = /^:([a-z-]+):\s*(.*)$/i
const BLOCK_OPT = /^\s+:([a-z-]+):\s*(.*)$/i
const DIRECTIVE = /^\.\.\s+([a-z]+)::\s*(.*)$/i
const INDENTED = /^\s{2,}/
const LINK_VALUE = /^(.*?)\s*<(.+)>$/

/** Section ids and figure ids are slugified the same way. */
export const rstSlug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const asLayout = (v: string): Layout =>
  v === 'grid' || v === 'list' || v === 'stack' ? v : 'stack'

const known = new Set<string>(KNOWN_BLOCKS)
const isKnown = (name: string): name is KnownBlockName => known.has(name)

/** `:link: Label <https://…>` — a value with no `<…>` links to `#`. */
export const parseLink = (value: string): RstLink => {
  const m = value.match(LINK_VALUE)
  return m ? { label: (m[1] ?? '').trim(), href: m[2] ?? '#' } : { label: value, href: '#' }
}

interface Draft {
  name: string
  title: string
  links: RstLink[]
  tags: string[]
  bullets: string[]
  items: string[]
  body: string
  opts: Record<string, string>
}

const finish = (d: Draft): RstBlock => {
  const shared = {
    links: d.links,
    tags: d.tags,
    bullets: d.bullets,
    items: d.items,
    body: d.body,
    opts: d.opts,
  }
  if (!isKnown(d.name)) {
    return { type: 'unknown', name: d.name, title: d.title, ...shared }
  }
  // Scalar options are promoted onto the block so renderers read a field, not
  // a bag. Every one of them stays available in `opts` as well.
  const o = d.opts
  switch (d.name) {
    case 'card':
      return { type: 'card', title: d.title, num: o.num, meta: o.meta, ...shared }
    case 'lede':
      return { type: 'lede', title: d.title, ...shared }
    case 'quote':
      return { type: 'quote', title: d.title, cite: o.cite, ...shared }
    case 'stats':
      return { type: 'stats', title: d.title, ...shared }
    case 'field':
      return { type: 'field', title: d.title, ...shared }
    case 'diagram':
      return { type: 'diagram', title: d.title, cite: o.cite, ...shared }
    case 'embed':
      return { type: 'embed', title: d.title, caption: o.caption, ...shared }
    case 'figure':
      return {
        type: 'figure',
        title: d.title,
        id: o.id,
        ratio: o.ratio,
        placeholder: o.placeholder,
        src: o.src,
        ...shared,
      }
    case 'refs':
      return { type: 'refs', title: d.title, ...shared }
    case 'series':
      return { type: 'series', title: d.title, ...shared }
    case 'velog':
      return { type: 'velog', title: d.title, ...shared }
    case 'pills':
      return { type: 'pills', title: d.title, ...shared }
    case 'entry':
      return { type: 'entry', title: d.title, date: o.date, org: o.org, ...shared }
    case 'post':
      return { type: 'post', title: d.title, date: o.date, href: o.href, ...shared }
  }
}

/**
 * Source → sections. Pure: no DOM, no React, no globals.
 *
 * A section is a title line under an `={3,}` rule, followed by `:key: value`
 * option lines (`:id:`, `:layout:`). Blocks are `.. name:: argument`
 * directives with indented `:key: value` options and an indented body,
 * `-{3,}` dividers, and bare paragraph runs. Content appearing before any
 * section header lands in an implicit untitled section.
 */
export function parseRst(src: string | null | undefined): RstSection[] {
  const lines = String(src ?? '')
    .replace(/\r/g, '')
    .split('\n')
  const out: RstSection[] = []
  let cur: RstSection | null = null
  let i = 0

  const push = (b: RstBlock) => {
    if (!cur) {
      cur = { title: '', id: `section-${out.length}`, layout: 'stack', blocks: [] }
      out.push(cur)
    }
    cur.blocks.push(b)
  }

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const next = lines[i + 1] ?? ''

    // --- section header ------------------------------------------------
    if (line.trim() && SECTION_RULE.test(next)) {
      const title = line.trim()
      cur = { title, id: rstSlug(title), layout: 'stack', blocks: [] }
      out.push(cur)
      i += 2
      while (i < lines.length && SECTION_OPT.test(lines[i] ?? '')) {
        const m = (lines[i] ?? '').match(SECTION_OPT)
        const key = (m?.[1] ?? '').toLowerCase()
        const value = m?.[2] ?? ''
        if (key === 'id') cur.id = rstSlug(value)
        if (key === 'layout') cur.layout = asLayout(value.trim())
        i++
      }
      continue
    }

    // --- directive -----------------------------------------------------
    const dir = line.match(DIRECTIVE)
    if (dir) {
      const draft: Draft = {
        name: (dir[1] ?? '').toLowerCase(),
        title: (dir[2] ?? '').trim(),
        links: [],
        tags: [],
        bullets: [],
        items: [],
        body: '',
        opts: {},
      }
      i++
      const bodyLines: string[] = []
      while (i < lines.length) {
        const l = lines[i] ?? ''
        // A blank line does not end a directive — options and body may be
        // separated by one, as they are in every card in the content.
        if (l.trim() === '') {
          bodyLines.push('')
          i++
          continue
        }
        if (!INDENTED.test(l)) break
        const opt = l.match(BLOCK_OPT)
        if (opt) {
          const k = (opt[1] ?? '').toLowerCase()
          const v = (opt[2] ?? '').trim()
          if (k === 'link') draft.links.push(parseLink(v))
          else if (k === 'tag') draft.tags.push(v)
          else if (k === 'bullet') draft.bullets.push(v)
          else if (k === 'item') draft.items.push(v)
          else draft.opts[k] = v
        } else {
          bodyLines.push(l.trim())
        }
        i++
      }
      draft.body = bodyLines.join(' ').replace(/\s+/g, ' ').trim()
      push(finish(draft))
      continue
    }

    // --- divider -------------------------------------------------------
    if (DIVIDER_RULE.test(line)) {
      push({ type: 'divider' })
      i++
      continue
    }

    // --- paragraph -----------------------------------------------------
    if (line.trim()) {
      const para = [line.trim()]
      i++
      while (
        i < lines.length &&
        (lines[i] ?? '').trim() &&
        !/^\.\.\s/.test(lines[i] ?? '') &&
        !SECTION_RULE.test(lines[i] ?? '') &&
        !SECTION_RULE.test(lines[i + 1] ?? '')
      ) {
        para.push((lines[i] ?? '').trim())
        i++
      }
      push({ type: 'para', body: para.join(' ') })
      continue
    }

    i++
  }

  return out
}

/** `value | label` splits used by `.. stats::` and `.. refs::`. */
export const splitPipes = (item: string, n: number): string[] => {
  const parts = item.split('|')
  return Array.from({ length: n }, (_, k) => (parts[k] ?? '').trim())
}
