import { describe, expect, it } from 'vitest'
import { parseRst, parseLink, rstSlug, splitPipes } from './parse'
import type { CardBlock, EntryBlock, RstBlock } from './types'
import mainRst from '../content/main.rst?raw'
import researchRst from '../content/research.rst?raw'
import writingRst from '../content/writing.rst?raw'

const only = <T extends RstBlock['type']>(blocks: RstBlock[], type: T) =>
  blocks.filter(b => b.type === type) as Extract<RstBlock, { type: T }>[]

describe('rstSlug', () => {
  it('lowercases, collapses non-alphanumerics and trims edge dashes', () => {
    expect(rstSlug('Awards & activities')).toBe('awards-activities')
    expect(rstSlug('  Where the two meet  ')).toBe('where-the-two-meet')
    expect(rstSlug('---x---')).toBe('x')
    expect(rstSlug('Diffusion & flow models')).toBe('diffusion-flow-models')
  })
})

describe('parseLink', () => {
  it('splits `Label <url>`', () => {
    expect(parseLink('Source code <https://github.com/ChanLumerico/lucid>')).toEqual({
      label: 'Source code',
      href: 'https://github.com/ChanLumerico/lucid',
    })
  })

  it('falls back to `#` with no angle brackets', () => {
    expect(parseLink('Just a label')).toEqual({ label: 'Just a label', href: '#' })
  })

  it('splits at the first `<`, matching the prototype’s lazy label group', () => {
    expect(parseLink('a <b> c <https://x.dev>')).toEqual({
      label: 'a',
      href: 'b> c <https://x.dev',
    })
  })
})

describe('splitPipes', () => {
  it('trims each field and pads missing ones', () => {
    expect(splitPipes('State | what the model holds', 2)).toEqual([
      'State',
      'what the model holds',
    ])
    expect(splitPipes('Only a title', 3)).toEqual(['Only a title', '', ''])
  })
})

describe('parseRst — sections', () => {
  it('returns nothing for empty input', () => {
    expect(parseRst('')).toEqual([])
    expect(parseRst(null)).toEqual([])
    expect(parseRst(undefined)).toEqual([])
  })

  it('reads a title, its `=====` rule, and its options', () => {
    const [sec] = parseRst(
      ['About', '=====', ':id: about', ':layout: stack', '', 'Hello.'].join('\n')
    )
    expect(sec?.title).toBe('About')
    expect(sec?.id).toBe('about')
    expect(sec?.layout).toBe('stack')
    expect(sec?.blocks).toEqual([{ type: 'para', body: 'Hello.' }])
  })

  it('slugifies the title when `:id:` is absent', () => {
    const [sec] = parseRst('Awards & activities\n===================\n')
    expect(sec?.id).toBe('awards-activities')
  })

  it('coerces an unknown `:layout:` to stack', () => {
    const [sec] = parseRst('T\n===\n:layout: masonry\n')
    expect(sec?.layout).toBe('stack')
  })

  it('accepts grid and list layouts', () => {
    expect(parseRst('T\n===\n:layout: grid\n')[0]?.layout).toBe('grid')
    expect(parseRst('T\n===\n:layout: list\n')[0]?.layout).toBe('list')
  })

  it('puts content before any header in an implicit untitled section', () => {
    const secs = parseRst('Loose text.\n\nReal title\n==========\n')
    expect(secs).toHaveLength(2)
    expect(secs[0]?.title).toBe('')
    expect(secs[0]?.id).toBe('section-0')
    expect(secs[0]?.blocks[0]).toEqual({ type: 'para', body: 'Loose text.' })
  })

  it('tolerates CRLF input', () => {
    const secs = parseRst('About\r\n=====\r\n:id: about\r\n\r\nBody.\r\n')
    expect(secs[0]?.id).toBe('about')
    expect(secs[0]?.blocks[0]).toEqual({ type: 'para', body: 'Body.' })
  })
})

describe('parseRst — directives', () => {
  it('collects repeatable options into arrays and scalars onto fields', () => {
    const src = [
      '.. card:: Lucid',
      '   :num: 01',
      '   :meta: Python · NumPy',
      '   :link: Source code <https://github.com/x>',
      '   :link: PyPI <https://pypi.org/project/y/>',
      '   :tag: one metric',
      '   :tag: another metric',
      '   :bullet: first point',
      '   :bullet: second point',
      '',
      '   Body copy, indented three spaces.',
    ].join('\n')
    const block = parseRst(src)[0]?.blocks[0] as CardBlock
    expect(block.type).toBe('card')
    expect(block.title).toBe('Lucid')
    expect(block.num).toBe('01')
    expect(block.meta).toBe('Python · NumPy')
    expect(block.links).toHaveLength(2)
    expect(block.links[1]).toEqual({ label: 'PyPI', href: 'https://pypi.org/project/y/' })
    expect(block.tags).toEqual(['one metric', 'another metric'])
    expect(block.bullets).toEqual(['first point', 'second point'])
    expect(block.body).toBe('Body copy, indented three spaces.')
  })

  it('collapses a multi-line indented body into one whitespace-normalised string', () => {
    const src = ['.. card:: T', '', '   one', '   two', '', '   three'].join('\n')
    const block = parseRst(src)[0]?.blocks[0] as CardBlock
    expect(block.body).toBe('one two three')
  })

  it('ends a directive at the first non-indented line', () => {
    const src = ['.. card:: T', '   :num: 01', 'Not indented.'].join('\n')
    const blocks = parseRst(src)[0]?.blocks ?? []
    expect(blocks.map(b => b.type)).toEqual(['card', 'para'])
  })

  it('reads `:item:` lists', () => {
    const src = [
      '.. stats::',
      '   :item: State | what the model holds, unseen, between frames',
      '   :item: Action | the intervention it must stay consistent with',
    ].join('\n')
    const block = parseRst(src)[0]?.blocks[0]
    expect(block?.type).toBe('stats')
    expect(block && 'items' in block ? block.items : []).toHaveLength(2)
  })

  it('keeps the directive argument as the title, even when it is a URL or a count', () => {
    expect(
      (
        parseRst('.. embed:: https://www.youtube.com/watch?v=PDKhUknuQDg')[0]?.blocks[0] as {
          title: string
        }
      ).title
    ).toBe('https://www.youtube.com/watch?v=PDKhUknuQDg')
    expect((parseRst('.. velog:: 4')[0]?.blocks[0] as { title: string }).title).toBe('4')
  })

  it('parses an entry’s date and org', () => {
    const src = [
      '.. entry:: Research Intern',
      '   :date: 2025 — Present',
      '   :org: Vision & AI Lab, Korea University',
    ].join('\n')
    const block = parseRst(src)[0]?.blocks[0] as EntryBlock
    expect(block).toMatchObject({
      type: 'entry',
      title: 'Research Intern',
      date: '2025 — Present',
      org: 'Vision & AI Lab, Korea University',
    })
  })

  it('files an unrecognised directive as `unknown` without losing anything', () => {
    const block = parseRst('.. marquee:: Hi\n   :speed: 3\n\n   Body.')[0]?.blocks[0]
    expect(block).toMatchObject({
      type: 'unknown',
      name: 'marquee',
      title: 'Hi',
      body: 'Body.',
      opts: { speed: '3' },
    })
  })

  it('keeps every option available in `opts`', () => {
    const block = parseRst('.. card:: T\n   :num: 07')[0]?.blocks[0] as CardBlock
    expect(block.opts.num).toBe('07')
  })
})

describe('parseRst — dividers and paragraphs', () => {
  it('reads `----` as a divider', () => {
    const blocks = parseRst('a\n\n----\n\nb')[0]?.blocks ?? []
    expect(blocks.map(b => b.type)).toEqual(['para', 'divider', 'para'])
  })

  it('joins a wrapped paragraph but stops at a blank line', () => {
    const blocks = parseRst('one\ntwo\n\nthree')[0]?.blocks ?? []
    expect(blocks).toEqual([
      { type: 'para', body: 'one two' },
      { type: 'para', body: 'three' },
    ])
  })

  it('does not swallow the next section’s title into a paragraph', () => {
    const secs = parseRst('Body line.\nNext title\n==========\n')
    expect(secs[0]?.blocks[0]).toEqual({ type: 'para', body: 'Body line.' })
    expect(secs[1]?.title).toBe('Next title')
  })

  it('does not swallow a following directive into a paragraph', () => {
    const blocks = parseRst('Intro line.\n.. lede:: Big.')[0]?.blocks ?? []
    expect(blocks.map(b => b.type)).toEqual(['para', 'lede'])
  })
})

describe('parseRst — the shipped content', () => {
  it('main.rst reproduces the prototype’s six CV sections', () => {
    const secs = parseRst(mainRst)
    expect(secs.map(s => s.id)).toEqual([
      'about',
      'research',
      'experience',
      'projects',
      'writing',
      'awards',
    ])
    expect(secs.map(s => s.layout)).toEqual(['stack', 'grid', 'list', 'stack', 'list', 'grid'])
    expect(secs.map(s => s.title)).toEqual([
      'About',
      'Research interests',
      'Experience',
      'Projects',
      'Writing',
      'Awards & activities',
    ])
  })

  it('main.rst keeps the Lucid card’s two links and the LoRA card’s two tags', () => {
    const cards = only(
      parseRst(mainRst).flatMap(s => s.blocks),
      'card'
    )
    const lucid = cards.find(c => c.title.startsWith('Lucid'))
    expect(lucid?.links.map(l => l.href)).toEqual([
      'https://github.com/ChanLumerico/lucid',
      'https://pypi.org/project/lucid-dl/',
    ])
    const lora = cards.find(c => c.title.startsWith('Hybrid'))
    expect(lora?.tags).toHaveLength(2)
    expect(lora?.tags[0]).toBe('+0.030 NDCG@10 on SciFact, 3/3 seeds')
  })

  it('main.rst has three experience entries, each with a date and an org', () => {
    const entries = only(
      parseRst(mainRst).flatMap(s => s.blocks),
      'entry'
    )
    expect(entries).toHaveLength(3)
    for (const e of entries) {
      expect(e.date).toBeTruthy()
      expect(e.org).toBeTruthy()
    }
  })

  it('main.rst asks for four velog posts', () => {
    const velog = only(
      parseRst(mainRst).flatMap(s => s.blocks),
      'velog'
    )
    expect(velog).toHaveLength(1)
    expect(velog[0]?.title).toBe('4')
  })

  it('research.rst reproduces the prototype’s section order', () => {
    expect(parseRst(researchRst).map(s => s.id)).toEqual([
      'research',
      'world-models',
      'wm-hard',
      'wm-refs',
      'diffusion',
      'three-views',
      'why',
      'overlap',
    ])
  })

  it('research.rst carries every editorial block type the page needs', () => {
    const blocks = parseRst(researchRst).flatMap(s => s.blocks)
    const counts = blocks.reduce<Record<string, number>>((acc, b) => {
      acc[b.type] = (acc[b.type] ?? 0) + 1
      return acc
    }, {})
    expect(counts).toMatchObject({
      lede: 3,
      stats: 1,
      embed: 1,
      diagram: 1,
      field: 1,
      refs: 2,
      pills: 1,
      divider: 2,
      card: 7,
    })
    expect(counts.unknown).toBeUndefined()
  })

  it('research.rst keeps the diagram’s citation link intact', () => {
    const diagram = only(
      parseRst(researchRst).flatMap(s => s.blocks),
      'diagram'
    )[0]
    expect(diagram?.cite).toContain('https://arxiv.org/abs/2209.03003')
    expect(diagram?.title).toContain('Same endpoints, different trajectories.')
  })

  it('research.rst keeps the embed URL and its caption', () => {
    const embed = only(
      parseRst(researchRst).flatMap(s => s.blocks),
      'embed'
    )[0]
    expect(embed?.title).toBe('https://www.youtube.com/watch?v=PDKhUknuQDg')
    expect(embed?.caption).toContain('Genie 3')
  })

  it('research.rst’s “why” card carries four bullets and a trailing body', () => {
    const card = only(
      parseRst(researchRst).flatMap(s => s.blocks),
      'card'
    ).find(c => c.title === 'The same model, four ways to ask it a question')
    expect(card?.bullets).toHaveLength(4)
    expect(card?.meta).toBe('Parameterisation')
    expect(card?.body).toMatch(/^Reading the field this way/)
  })

  it('writing.rst is one section, one paragraph, one series gallery', () => {
    const secs = parseRst(writingRst)
    expect(secs).toHaveLength(1)
    expect(secs[0]?.id).toBe('writing')
    expect(secs[0]?.blocks.map(b => b.type)).toEqual(['para', 'series'])
    const series = only(secs[0]?.blocks ?? [], 'series')[0]
    expect(series?.items).toEqual([])
  })
})
