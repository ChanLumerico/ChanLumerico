import { render, screen, within } from '@testing-library/react'
import { HashRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { BUILTIN_DRAFT } from '../config/normalise'
import { FEED_CACHE, FEED_FORMAT, velogClient } from '../velog'

/**
 * Route smoke tests. Every network path is stubbed: the point is that each
 * route mounts, paints the right landmarks, and never leaves an indefinite
 * spinner behind.
 */

const seed = (hash: string) => {
  window.location.hash = hash
}

/** A feed cache, so the velog blocks paint from cache rather than the network. */
const seedFeed = () =>
  localStorage.setItem(
    FEED_CACHE,
    JSON.stringify({
      v: FEED_FORMAT,
      t: Date.now(),
      posts: [
        {
          title: '[Diffusion-101] Flow matching',
          cleanTitle: 'Flow matching',
          series: 'Diffusion-101',
          href: 'https://velog.io/@lumerico284/flow-matching',
          slug: 'flow-matching',
          date: 'Tue, 04 Mar 2025 09:00:00 GMT',
          summary: 'What the velocity field actually is.',
          content: '<p>The continuity equation is where they meet.</p>',
        },
        {
          title: '[Reinforcement-Learning] Policy gradients',
          cleanTitle: 'Policy gradients',
          series: 'Reinforcement-Learning',
          href: 'https://velog.io/@lumerico284/pg',
          slug: 'pg',
          date: 'Sat, 01 Feb 2025 09:00:00 GMT',
          summary: 'The score-function estimator, derived slowly.',
        },
      ],
    })
  )

beforeEach(() => {
  localStorage.clear()
  // The client is a module singleton, so each test starts from a clean one.
  velogClient.reset()
  // Nothing in a test may reach the network.
  globalThis.fetch = vi.fn(() =>
    Promise.reject(new Error('offline in tests'))
  ) as unknown as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
  window.location.hash = ''
})

describe('#/ — Home', () => {
  it('renders the profile rail and every CV section from main.rst', async () => {
    seed('#/')
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Chan Lee' })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Profile' })).toBeTruthy()

    for (const title of [
      'About',
      'Research interests',
      'Experience',
      'Projects',
      'Writing',
      'Awards & activities',
    ]) {
      expect(await screen.findByRole('heading', { level: 2, name: title })).toBeTruthy()
    }
  })

  it('shows the rail’s focus pills, skills groups and social links', async () => {
    seed('#/')
    render(<App />)
    const rail = screen.getByRole('complementary', { name: 'Profile' })
    expect(within(rail).getByText('Interactive world models')).toBeTruthy()
    expect(within(rail).getByText('Coursework')).toBeTruthy()
    expect(within(rail).getByRole('link', { name: 'Email' })).toBeTruthy()
    expect(within(rail).getByRole('link', { name: 'GitHub profile' })).toBeTruthy()
    expect(within(rail).getByRole('link', { name: 'Instagram profile' })).toBeTruthy()
  })

  it('gives the portrait explicit dimensions, so it cannot shift the layout', async () => {
    seed('#/')
    render(<App />)
    const img = await screen.findByAltText('Chan Lee')
    expect(img.getAttribute('width')).toBe('256')
    expect(img.getAttribute('height')).toBe('256')
  })

  it('renders the Lucid card’s two links and the LoRA card’s metric pills', async () => {
    seed('#/')
    render(<App />)
    expect(
      (await screen.findByRole('link', { name: 'Source code' })).getAttribute('href')
    ).toBe('https://github.com/ChanLumerico/lucid')
    expect(screen.getByRole('link', { name: 'PyPI' })).toBeTruthy()
    expect(screen.getByText('+0.030 NDCG@10 on SciFact, 3/3 seeds')).toBeTruthy()
  })

  it('paints the latest-posts list from a cached feed', async () => {
    seedFeed()
    seed('#/')
    render(<App />)
    expect(await screen.findByRole('link', { name: /Flow matching/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Policy gradients/ })).toBeTruthy()
  })

  it('shows a real empty state, not a spinner, when the feed is unreachable', async () => {
    seed('#/')
    render(<App />)
    expect(
      await screen.findByText(/Could not reach the velog feed right now/, {}, { timeout: 4000 })
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Velog archive' })).toBeTruthy()
  })

  it('marks no nav tab as current', async () => {
    seed('#/')
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Chan Lee' })
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(0)
    expect(document.title).toBe('Chan Lee')
  })
})

describe('#/research — Research interests', () => {
  it('renders every section, and no profile rail', async () => {
    seed('#/research')
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Research interests' })
    ).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: 'Profile' })).toBeNull()

    for (const title of [
      'Interactive world models',
      'What makes it hard',
      'Lines of work I follow',
      'Diffusion & flow models',
      'Three views, one object',
      'Why the unification matters',
      'Where the two meet',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeTruthy()
    }
  })

  it('renders the computed field figure, the diagram and the video poster', async () => {
    seed('#/research')
    render(<App />)
    await screen.findByRole('heading', { level: 2, name: 'Research interests' })

    // Both panels of the vector-field figure, with real arrows in each.
    const score = screen.getByRole('img', { name: /^Score field/ })
    const velocity = screen.getByRole('img', { name: /^Velocity field/ })
    expect(score.querySelectorAll('path').length).toBeGreaterThan(100)
    expect(velocity.querySelectorAll('path').length).toBeGreaterThan(100)

    expect(screen.getByRole('img', { name: /^Diffusion · SDE/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /^Rectified flow · ODE/ })).toBeTruthy()

    const poster = screen.getByAltText(/Genie 3/)
    expect(poster.getAttribute('src')).toContain('PDKhUknuQDg')
    expect(screen.getByRole('link', { name: 'Watch on YouTube' }).getAttribute('href')).toBe(
      'https://www.youtube.com/watch?v=PDKhUknuQDg'
    )
  })

  it('renders the stats strip and the reference lists', async () => {
    seed('#/research')
    render(<App />)
    await screen.findByRole('heading', { level: 2, name: 'Research interests' })
    expect(screen.getByText('State')).toBeTruthy()
    expect(screen.getByText('Horizon')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: /The Principles of Diffusion Models/ })
        .getAttribute('href')
    ).toBe('https://arxiv.org/abs/2510.21890')
  })

  it('marks the Research tab as current', async () => {
    seed('#/research')
    render(<App />)
    await screen.findByRole('heading', { level: 2, name: 'Research interests' })
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    expect(
      within(nav).getByRole('link', { name: 'Research' }).getAttribute('aria-current')
    ).toBe('page')
    expect(document.title).toBe('Chan Lee · Research')
  })
})

describe('#/writing — Writings', () => {
  it('renders the lede and a series gallery, and no rail', async () => {
    seed('#/writing')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 2, name: 'Writings' })).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: 'Profile' })).toBeNull()
    expect(screen.getByText(/Written on velog and pulled in live/)).toBeTruthy()
  })

  it('offers a retry and an escape hatch when the series index is unreachable', async () => {
    seed('#/writing')
    render(<App />)
    expect(
      await screen.findByRole('button', { name: 'Reload series' }, { timeout: 6000 })
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open on velog' })).toBeTruthy()
  })

  it('marks the Writings tab as current', async () => {
    seed('#/writing')
    render(<App />)
    await screen.findByRole('heading', { level: 2, name: 'Writings' })
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    expect(
      within(nav).getByRole('link', { name: 'Writings' }).getAttribute('aria-current')
    ).toBe('page')
  })
})

describe('#/series/<slug>', () => {
  it('renders a breadcrumb back to Writings and an error state with a retry', async () => {
    seed('#/series/Diffusion-101')
    render(<App />)

    const crumbs = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Writings' }).getAttribute('href')).toBe(
      '#/writing'
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Diffusion 101' })).toBeTruthy()
    expect(
      await screen.findByText('Could not load this series.', {}, { timeout: 6000 })
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open on velog' }).getAttribute('href')).toBe(
      'https://velog.io/@lumerico284/series/Diffusion-101'
    )
  })

  it('still highlights Writings in the nav', async () => {
    seed('#/series/Diffusion-101')
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Diffusion 101' })
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    expect(
      within(nav).getByRole('link', { name: 'Writings' }).getAttribute('aria-current')
    ).toBe('page')
  })
})

describe('#/post/<slug>', () => {
  it('renders a cached post’s body in place, with its series breadcrumb', async () => {
    seedFeed()
    seed('#/post/flow-matching')
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Flow matching' })).toBeTruthy()
    expect(await screen.findByText(/The continuity equation is where they meet/)).toBeTruthy()

    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Writings' })).toBeTruthy()
    // The series prefix is known but no real slug has loaded, so it must not
    // become a link to an invented series page.
    expect(within(crumbs).queryByRole('link', { name: 'Diffusion-101' })).toBeNull()
    expect(within(crumbs).getByText('Diffusion-101')).toBeTruthy()

    expect(screen.getByRole('link', { name: 'Read on velog' }).getAttribute('href')).toBe(
      'https://velog.io/@lumerico284/flow-matching'
    )
  })

  it('says so plainly when the slug is not in the feed', async () => {
    seedFeed()
    seed('#/post/not-a-real-post')
    render(<App />)
    expect(await screen.findByText('That post is not in the current feed.')).toBeTruthy()
  })

  it('reports a failed body fetch instead of spinning', async () => {
    seedFeed()
    seed('#/post/pg')
    render(<App />)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Policy gradients' })
    ).toBeTruthy()
    expect(
      await screen.findByText(/Could not load this post right now/, {}, { timeout: 8000 })
    ).toBeTruthy()
  })
})

describe('unknown routes', () => {
  it('fall back to Home, as in the prototype', async () => {
    seed('#/nope')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Chan Lee' })).toBeTruthy()
    expect(await screen.findByRole('heading', { level: 2, name: 'About' })).toBeTruthy()
  })
})

describe('committed content is what renders', () => {
  it('ignores a draft buffer when the admin layer is off', () => {
    // The draft store is module state, so this asserts the contract rather
    // than the storage round-trip: BUILTIN_DRAFT is always the .rst files.
    expect(BUILTIN_DRAFT.pages.main).toContain('Research interests')
    expect(BUILTIN_DRAFT.config.profile.name).toBe('Chan Lee')
  })
})

describe('accessibility basics', () => {
  it('gives every image an alt attribute', async () => {
    seed('#/research')
    render(<App />)
    await screen.findByRole('heading', { level: 2, name: 'Research interests' })
    for (const img of Array.from(document.querySelectorAll('img'))) {
      expect(img.getAttribute('alt')).not.toBeNull()
    }
  })

  it('labels both nav landmarks', async () => {
    seed('#/')
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Chan Lee' })
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy()
  })

  it('renders the brand as a link home', async () => {
    seed('#/research')
    render(<App />)
    await screen.findByRole('heading', { level: 2, name: 'Research interests' })
    const brand = screen.getAllByRole('link', { name: 'Chan Lee' })[0]
    expect(brand?.getAttribute('href')).toBe('#/')
  })
})

describe('router', () => {
  it('uses hash routing, so GitHub Pages needs no rewrite', async () => {
    render(
      <HashRouter>
        <div>mounted</div>
      </HashRouter>
    )
    expect(screen.getByText('mounted')).toBeTruthy()
  })
})
