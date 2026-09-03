import { describe, expect, it, vi } from 'vitest'
import {
  allowedByWhitelist,
  blurb,
  decorate,
  FEED_SOURCES,
  parseJsonFeed,
  parseRss,
} from './feed'
import { keepAllowed, parseSeriesHtml, pickSlugs, seriesNameFromHtml } from './series'
import { sanitiseHtml } from './article'
import { goodArticle, inline, mdToHtml, repairMath } from './markdown'
import { fetchWithTimeout, Pool, race, retry } from './net'
import { decodeSlug, fmtDate, plural } from './format'
import { FEED_FORMAT, SERIES_ALLOW } from './constants'

describe('decorate', () => {
  it('splits velog’s `[Series] Title` convention', () => {
    const p = decorate({
      title: '[Diffusion 101] Score matching, part 2',
      href: 'https://velog.io/@lumerico284/score-matching-2',
    })
    expect(p.series).toBe('Diffusion 101')
    expect(p.cleanTitle).toBe('Score matching, part 2')
    expect(p.slug).toBe('score-matching-2')
  })

  it('leaves an unprefixed title alone', () => {
    const p = decorate({ title: 'Just a note', href: 'https://velog.io/@x/note' })
    expect(p.series).toBe('')
    expect(p.cleanTitle).toBe('Just a note')
  })

  it('takes the last path segment as the slug, trailing slash or not', () => {
    expect(decorate({ title: 't', href: 'https://velog.io/@x/a/b/' }).slug).toBe('b')
  })
})

describe('blurb', () => {
  it('takes the first paragraph longer than 24 characters', () => {
    const html = '<p>Too short.</p><p>This paragraph is comfortably longer than the floor.</p>'
    expect(blurb(html)).toBe('This paragraph is comfortably longer than the floor.')
  })

  it('strips inline LaTeX, which reads as noise in a one-liner', () => {
    const html = '<p>The score $\\nabla_x \\log p(x)$ points uphill in density, always.</p>'
    expect(blurb(html)).not.toContain('$')
    expect(blurb(html)).toContain('points uphill in density')
  })

  it('clamps to 130 characters with an ellipsis', () => {
    const long = `<p>${'x'.repeat(400)}</p>`
    const out = blurb(long)
    expect(out).toHaveLength(130)
    expect(out.endsWith('…')).toBe(true)
  })

  it('falls back to the whole body when no paragraph clears the floor', () => {
    expect(blurb('<div>A bare div with enough words to be useful here.</div>')).toContain(
      'A bare div'
    )
  })
})

describe('parseRss', () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item>
      <title>[Diffusion-101] DDPM</title>
      <link>https://velog.io/@lumerico284/ddpm</link>
      <pubDate>Tue, 04 Mar 2025 09:00:00 GMT</pubDate>
      <description>&lt;p&gt;A derivation I wanted to get right, at length.&lt;/p&gt;</description>
    </item>
    <item><title>No link</title><link></link></item>
  </channel></rss>`

  it('reads items and drops any without a title and a link', () => {
    const posts = parseRss(xml)
    expect(posts).toHaveLength(1)
    expect(posts[0]?.cleanTitle).toBe('DDPM')
    expect(posts[0]?.summary).toContain('A derivation I wanted to get right')
    expect(posts[0]?.content).toContain('<p>')
  })

  it('returns nothing for malformed XML instead of throwing', () => {
    expect(parseRss('<rss><channel><item>')).toEqual([])
    expect(parseRss('not xml at all')).toEqual([])
  })
})

describe('parseJsonFeed', () => {
  it('reads the rss2json shape', () => {
    const body = JSON.stringify({
      items: [
        {
          title: '[Reinforcement-Learning] Policy gradients',
          link: 'https://velog.io/@lumerico284/pg',
          pubDate: '2025-02-01 10:00:00',
          content: '<p>Long enough to be a real summary of the post body.</p>',
        },
      ],
    })
    const posts = parseJsonFeed(body)
    expect(posts).toHaveLength(1)
    expect(posts[0]?.series).toBe('Reinforcement-Learning')
  })

  it('returns nothing for non-JSON and for a missing items array', () => {
    expect(parseJsonFeed('<html>')).toEqual([])
    expect(parseJsonFeed('{"status":"error"}')).toEqual([])
  })
})

describe('FEED_SOURCES', () => {
  it('keeps the direct velog URL first and three CORS-enabled readers behind it', () => {
    expect(FEED_SOURCES.map(s => s.name)).toEqual([
      'velog',
      'rss2json',
      'allorigins',
      'codetabs',
    ])
    expect(FEED_SOURCES[0]?.url).toBe('https://api.velog.io/rss/@lumerico284')
    expect(FEED_SOURCES.filter(s => s.json)).toHaveLength(1)
  })
})

describe('allowedByWhitelist', () => {
  const post = (series: string) => decorate({ title: `[${series}] T`, href: 'https://v/@x/t' })

  it('keeps whitelisted series', () => {
    expect(allowedByWhitelist([post('Diffusion 101')])).toHaveLength(1)
    expect(allowedByWhitelist([post('Reinforcement Learning')])).toHaveLength(1)
  })

  it('drops a series that is not on the list', () => {
    expect(allowedByWhitelist([post('Kubernetes diary')])).toHaveLength(0)
  })

  it('always keeps a post with no series', () => {
    expect(
      allowedByWhitelist([decorate({ title: 'Loose note', href: 'https://v/@x/n' })])
    ).toHaveLength(1)
  })
})

describe('keepAllowed / pickSlugs', () => {
  it('finds every /series/<slug> link and dedupes', () => {
    const body = `
      [a](/@lumerico284/series/Diffusion-101)
      [b](/@lumerico284/series/Reinforcement-Learning)
      [c](/@lumerico284/series/Diffusion-101)
      [d](/@lumerico284/series/Something-Else)
    `
    expect(pickSlugs(body)).toEqual([
      'Diffusion-101',
      'Reinforcement-Learning',
      'Something-Else',
    ])
  })

  it('filters to the whitelist and takes its order, not the page’s', () => {
    expect(keepAllowed(['Something-Else', 'Reinforcement-Learning', 'Diffusion-101'])).toEqual([
      ...SERIES_ALLOW,
    ])
  })

  it('returns nothing when the page linked no whitelisted series', () => {
    expect(keepAllowed(['Other'])).toEqual([])
  })
})

describe('parseSeriesHtml', () => {
  const html = `<html><body>
    <div>
      <h2><span class="number">3.</span><a href="/@lumerico284/flow-matching">[Diffusion-101] Flow matching</a></h2>
      <div class="post-info"><p>What the velocity field actually is.</p><span class="date">2025년 3월 7일</span></div>
    </div>
    <div>
      <h2><span class="number">1.</span><a href="/@lumerico284/ddpm">[Diffusion-101] DDPM</a></h2>
      <div class="post-info"><p>The variational account.</p><span class="date">2025년 1월 4일</span></div>
    </div>
    <div>
      <h2><span class="number">3.</span><a href="/@lumerico284/flow-matching">duplicate</a></h2>
    </div>
    <div><h2>No link at all</h2></div>
  </body></html>`

  it('reads the number, title, blurb and date of each entry', () => {
    const posts = parseSeriesHtml(html)
    expect(posts).toHaveLength(2)
    expect(posts[0]).toMatchObject({
      n: 3,
      cleanTitle: 'Flow matching',
      series: 'Diffusion-101',
      slug: 'flow-matching',
      summary: 'What the velocity field actually is.',
      dateText: '2025년 3월 7일',
      href: 'https://velog.io/@lumerico284/flow-matching',
    })
  })

  it('sorts by index descending and drops duplicate slugs', () => {
    expect(parseSeriesHtml(html).map(p => p.n)).toEqual([3, 1])
  })

  it('skips an h2 with no post link', () => {
    expect(parseSeriesHtml(html).every(p => p.slug !== '')).toBe(true)
  })

  it('returns nothing for a page with no entries', () => {
    expect(parseSeriesHtml('<html><body><h1>Nothing</h1></body></html>')).toEqual([])
  })
})

describe('seriesNameFromHtml', () => {
  it('reads the display name out of velog’s <title>', () => {
    const html = '<title>시리즈 | Diffusion 101 - lumerico284.log</title>'
    expect(seriesNameFromHtml(html, 'Diffusion-101')).toBe('Diffusion 101')
  })

  it('falls back to the de-hyphenated slug', () => {
    expect(seriesNameFromHtml('<title>lumerico284.log</title>', 'Diffusion-101')).toBe(
      'Diffusion 101'
    )
    expect(seriesNameFromHtml('no title tag', 'Reinforcement-Learning')).toBe(
      'Reinforcement Learning'
    )
  })
})

describe('sanitiseHtml', () => {
  it('strips scripts, styles and frames', () => {
    const out = sanitiseHtml(
      '<p>ok</p><script>evil()</script><style>x{}</style><iframe src="x"></iframe>'
    )
    expect(out).toContain('<p>ok</p>')
    expect(out).not.toContain('script')
    expect(out).not.toContain('iframe')
  })

  it('makes velog-relative links absolute and opens them safely', () => {
    const out = sanitiseHtml('<a href="/@lumerico284/x">x</a>')
    expect(out).toContain('href="https://velog.io/@lumerico284/x"')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener"')
  })

  it('leaves an absolute link’s href alone but still forces the rel', () => {
    const out = sanitiseHtml('<a href="https://arxiv.org/abs/2209.03003">paper</a>')
    expect(out).toContain('href="https://arxiv.org/abs/2209.03003"')
    expect(out).toContain('rel="noopener"')
  })

  it('makes images lazy and gives every one an alt', () => {
    const out = sanitiseHtml('<img src="a.png"><img src="b.png" alt="b">')
    expect(out.match(/loading="lazy"/g)).toHaveLength(2)
    expect(out).toContain('alt=""')
    expect(out).toContain('alt="b"')
  })
})

describe('repairMath', () => {
  it('restores an underscore delimiter eaten inside math', () => {
    expect(repairMath('$x<em>t</em>$')).toBe('$x_t_$')
  })

  it('uses `*` when the delimiter followed a sub- or superscript marker', () => {
    expect(repairMath('$x^<em>2</em>$')).toBe('$x^*2*$')
  })

  it('leaves italics in prose alone', () => {
    expect(repairMath('an <em>emphatic</em> word')).toBe('an <em>emphatic</em> word')
  })

  it('tracks $$ display math as one delimiter', () => {
    expect(repairMath('$$a<strong>b</strong>$$')).toBe('$$a**b**$$')
  })

  it('does not let a `$` inside an attribute flip the math state', () => {
    const out = repairMath('<a href="/x?p=$1">l</a> then <em>real</em>')
    expect(out).toContain('<em>real</em>')
  })

  it('ignores an escaped dollar sign', () => {
    expect(repairMath('\\$5 and <em>text</em>')).toBe('\\$5 and <em>text</em>')
  })
})

describe('inline', () => {
  it('escapes HTML before applying markdown', () => {
    expect(inline('<script>')).toBe('&lt;script&gt;')
  })

  it('renders code, links, images, bold and italics', () => {
    expect(inline('`x`')).toBe('<code>x</code>')
    expect(inline('[t](https://x.dev)')).toContain('href="https://x.dev"')
    expect(inline('![a](x.png)')).toBe('<img src="x.png" alt="a">')
    expect(inline('**b**')).toBe('<strong>b</strong>')
    expect(inline('*i*')).toBe('<em>i</em>')
  })

  it('leaves snake_case identifiers untouched', () => {
    expect(inline('some_long_name')).toBe('some_long_name')
  })
})

describe('mdToHtml', () => {
  it('strips the reader’s preamble', () => {
    const out = mdToHtml('Title: X\nURL Source: https://y\nMarkdown Content:\n\nBody.')
    expect(out).not.toContain('URL Source')
    expect(out).toContain('<p>Body.</p>')
  })

  it('shifts headings down one level', () => {
    expect(mdToHtml('# One')).toBe('<h2>One</h2>')
    expect(mdToHtml('### Three')).toBe('<h4>Three</h4>')
  })

  it('keeps fenced code verbatim and escaped', () => {
    const out = mdToHtml('```py\nif a < b:\n    pass\n```')
    expect(out).toContain('<pre><code>if a &lt; b:')
    expect(out).not.toContain('<em>')
  })

  it('does not touch markdown inside math', () => {
    expect(mdToHtml('$a_b_c$')).toContain('$a_b_c$')
  })

  it('opens and closes lists correctly', () => {
    expect(mdToHtml('- a\n- b')).toBe('<ul>\n<li>a</li>\n<li>b</li>\n</ul>')
    expect(mdToHtml('1. a\n2. b')).toBe('<ol>\n<li>a</li>\n<li>b</li>\n</ol>')
  })

  it('reads blockquotes and rules', () => {
    expect(mdToHtml('> quoted')).toBe('<blockquote>quoted</blockquote>')
    expect(mdToHtml('---')).toBe('<hr>')
  })
})

describe('goodArticle', () => {
  it('rejects a login/chrome dump', () => {
    expect(goodArticle('Title: x\nURL Source: y\nMarkdown Content:\nlumerico284.log')).toBe(
      false
    )
  })

  it('rejects a page carrying velog’s comment furniture', () => {
    expect(goodArticle('Title: x\n\nbody\n\n댓글 작성')).toBe(false)
  })

  it('accepts a real article body', () => {
    expect(
      goodArticle('Title: x\nURL Source: y\nMarkdown Content:\n\nA real derivation.')
    ).toBe(true)
  })
})

describe('fmtDate', () => {
  it('reads an RFC-822 feed stamp', () => {
    expect(fmtDate('Tue, 04 Mar 2025 09:00:00 GMT')).toBe('Mar 2025')
  })

  it('reads Korean date text from a series listing', () => {
    expect(fmtDate('2025년 3월 7일')).toBe('Mar 2025')
  })

  it('returns an empty string for nothing and for junk', () => {
    expect(fmtDate('')).toBe('')
    expect(fmtDate(undefined)).toBe('')
    expect(fmtDate('not a date')).toBe('')
  })
})

describe('decodeSlug', () => {
  it('decodes a percent-encoded feed slug', () => {
    expect(decodeSlug('Diffusion-101-%EA%B0%9C%EC%9A%94')).toBe('Diffusion-101-개요')
  })

  it('returns the input unchanged when it is not decodable', () => {
    expect(decodeSlug('100%-sure')).toBe('100%-sure')
    expect(decodeSlug(undefined)).toBe('')
  })
})

describe('plural', () => {
  it('agrees with the count', () => {
    expect(plural(1, 'post', 'posts')).toBe('1 post')
    expect(plural(4, 'post', 'posts')).toBe('4 posts')
    expect(plural(0, 'post', 'posts')).toBe('0 posts')
  })
})

describe('race', () => {
  const later = <T>(ms: number, value: T) => new Promise<T>(r => setTimeout(() => r(value), ms))
  const failsAfter = (ms: number) =>
    new Promise<never>((_r, j) => setTimeout(() => j(new Error('nope')), ms))

  it('returns the first usable result, not the first to settle', async () => {
    await expect(race([() => failsAfter(5), () => later(20, 'slow-but-good')])).resolves.toBe(
      'slow-but-good'
    )
  })

  it('rejects only once every source has failed', async () => {
    await expect(race([() => failsAfter(1), () => failsAfter(2)])).rejects.toBeInstanceOf(
      AggregateError
    )
  })

  it('rejects immediately with no sources', async () => {
    await expect(race([])).rejects.toThrow('no sources')
  })

  it('resolves as soon as a winner appears, without waiting for the losers', async () => {
    let loserSettled = false
    const p = race([
      () => later(1, 'fast'),
      () =>
        later(80, 'slow').then(v => {
          loserSettled = true
          return v
        }),
    ])
    await expect(p).resolves.toBe('fast')
    expect(loserSettled).toBe(false)
  })
})

describe('retry', () => {
  it('returns the first success without retrying', async () => {
    const task = vi.fn().mockResolvedValue('ok')
    await expect(retry(task, 2, 0)).resolves.toBe('ok')
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('retries up to the limit, then surfaces the last error', async () => {
    const task = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(retry(task, 2, 0)).rejects.toThrow('boom')
    expect(task).toHaveBeenCalledTimes(3)
  })

  it('succeeds on a later attempt', async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(new Error('once'))
      .mockResolvedValue('eventually')
    await expect(retry(task, 2, 0)).resolves.toBe('eventually')
  })
})

describe('Pool', () => {
  it('runs at most `size` tasks at a time', async () => {
    const pool = new Pool(2)
    let live = 0
    let peak = 0
    const task = () => async () => {
      live++
      peak = Math.max(peak, live)
      await new Promise(r => setTimeout(r, 5))
      live--
      return 1
    }
    await Promise.all(Array.from({ length: 6 }, () => pool.submit(task())))
    expect(peak).toBe(2)
  })

  it('lets a lower priority number jump the queue', async () => {
    const pool = new Pool(1)
    const order: string[] = []
    const job = (name: string) => () =>
      new Promise<void>(r =>
        setTimeout(() => {
          order.push(name)
          r()
        }, 1)
      )
    const blocker = pool.submit(job('blocker'), 0)
    const background = pool.submit(job('background'), 1)
    const urgent = pool.submit(job('urgent'), 0)
    await Promise.all([blocker, background, urgent])
    expect(order).toEqual(['blocker', 'urgent', 'background'])
  })

  it('frees its slot when a task rejects', async () => {
    const pool = new Pool(1)
    await expect(pool.submit(() => Promise.reject(new Error('x')))).rejects.toThrow('x')
    await expect(pool.submit(() => Promise.resolve('after'))).resolves.toBe('after')
  })
})

describe('fetchWithTimeout', () => {
  it('aborts a request that outlives its deadline', async () => {
    const original = globalThis.fetch
    globalThis.fetch = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as typeof fetch
    try {
      await expect(fetchWithTimeout('https://x.dev', 10)).rejects.toThrow('aborted')
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('cache format', () => {
  it('pins the feed cache version so a bump discards older entries', () => {
    expect(FEED_FORMAT).toBe(5)
  })
})
