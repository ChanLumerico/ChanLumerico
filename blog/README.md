# Chan Lee — personal site

An academic CV and blog, rebuilt from the single-file `.dc.html` prototype in
[`claude-design/`](claude-design/) as a React codebase with no proprietary
runtime. The design is a straight port: see [`DESIGN.md`](DESIGN.md) for the
extracted token table, the block-type inventory, the route map, the figure
maths, the velog data flow, and every place the port deliberately differs
from the prototype.

- Vite + React 18 + TypeScript
- `HashRouter` — GitHub Pages has no server rewrite, and the prototype's URLs
  were already `#/research`, `#/writing`, `#/series/<slug>`, `#/post/<slug>`
- CSS Modules over CSS custom properties. Every colour, size, radius and
  easing lives in [`src/styles/tokens.css`](src/styles/tokens.css); nothing
  downstream hard-codes a literal
- No component library, no Tailwind, no CSS-in-JS runtime

---

## Local development

```bash
cd blog
npm install
npm run dev          # http://localhost:5173, admin UI always on
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc --noEmit` then `vite build` into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Vitest, once |
| `npm run test:watch` | Vitest, watching |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, writing |
| `npm run deploy` | Build and push `dist/` to a `gh-pages` branch |

### Tests

149 of them, in four files:

- `src/rst/parse.test.ts` — the RST parser, including the section order,
  layouts and block counts of all three shipped pages
- `src/field/field.test.ts` — the vector-field maths, including a
  central-difference cross-check that the score really is ∇ₓ log p of the
  mixture, and a pin on the prototype's arrowhead normal
- `src/velog/velog.test.ts` — the feed and series parsers, the sanitiser, the
  math repair, the proxy race, the retry, and the pool's concurrency and
  priority
- `src/routes/routes.test.tsx` — one smoke test group per route, with every
  network path stubbed, asserting that each route mounts, paints the right
  landmarks, and never leaves an indefinite spinner behind

---

## Editing content

**The content of record is in the repo, not in a browser.**

| File | Holds |
|---|---|
| `src/content/main.rst` | Home — About, Research interests, Experience, Projects, Writing, Awards |
| `src/content/research.rst` | `#/research` |
| `src/content/writing.rst` | `#/writing` |
| `src/content/config.json` | profile, focus pills, skills, accent, sidebar side, section order and visibility, footer |

Edit a file, commit, push. That is the whole flow — the `.rst` files are
imported with `?raw` and parsed at runtime, so there is no build step for
content beyond the usual one.

### The RST-flavoured DSL

A section is a title line under an `=====` rule, followed by option lines:

```rst
Research interests
==================
:id: research
:layout: grid
```

`:layout:` is `grid` (auto-fit cards, min 240px), `stack` (a column with a
16px gap) or `list` (a column whose rows carry their own rules).

Blocks are directives. Options are `:key: value` lines indented under them;
the body is any other indented line, whitespace-collapsed:

```rst
.. card:: Lucid — deep learning framework from scratch
   :meta: Python · NumPy · Reverse-mode autodiff
   :link: Source code <https://github.com/ChanLumerico/lucid>
   :link: PyPI <https://pypi.org/project/lucid-dl/>

   A mini-PyTorch deep learning framework built entirely from scratch.
```

`:link:`, `:tag:`, `:bullet:` and `:item:` repeat; every other key is a
scalar. A bare line is a paragraph and `----` is a divider.

| Directive | Renders |
|---|---|
| `.. card::` | A fog card. `:num:` or `:meta:` eyebrow, `:bullet:` list, `:link:` buttons, `:tag:` pills |
| `.. entry::` | A timeline row — `:date:`, `:org:` |
| `.. lede::` | One large opening statement |
| `.. quote::` | A pull quote with an accent rule — `:cite:` |
| `.. stats::` | A rule-bounded figure strip — `:item: value \| label` |
| `.. pills::` | A comma-separated pill row |
| `.. refs::` | A reference list — `:item: title \| year \| url?`; a url makes the row a link |
| `.. figure::` | An image frame — `:src:`, `:ratio:`, `:id:`, `:placeholder:` |
| `.. diagram::` | The SDE-vs-ODE path figure, drawn in-page — `:cite:` |
| `.. field::` | The score-field / velocity-field figure, computed on a grid |
| `.. embed::` | A YouTube poster that links out — `:caption:` |
| `.. velog:: n` | The n newest whitelisted velog posts, live |
| `.. series::` | The velog series gallery; `:item:` pins specific slugs |
| `.. post::` | An authored post row — `:date:`, `:href:` |

An unrecognised directive still renders its copy rather than vanishing.

The same table lives in the app as a floating cheatsheet beside the source
editor (`src/components/admin/rstLegend.ts`), ported verbatim from the
prototype's `RST_LEGEND`.

### The profile photo

`config.json` points `profile.photo` at `portrait.jpg`, resolved against the
Vite base. Drop a square image at `public/portrait.jpg`. Until one exists the
rail shows the initials on a fog circle — the frame reserves its own space
either way, so the photo can never shift the layout as it loads.

The admin panel's photo cropper will produce that file for you: pick an
image, pan and zoom it under the 1:1 circular guide, then **Download
portrait.jpg**.

### The admin UI

Gated behind `?admin=1` — `/?admin=1#/research` or `/#/research?admin=1` —
and always on in a dev build. It is also lazily imported behind that check,
so a visitor never downloads it.

It reorders and hides sections and rail blocks, edits the profile, picks an
accent from Apple's system set, crops the photo, and edits each page's RST
source in a centred editor with the legend floating beside it.

**It does not publish.** Edits live in memory, backed by an explicitly
labelled unsaved-draft buffer in `localStorage` (`chanlee-cv-draft-v1`) that
survives a reload but reaches nobody else — a visitor always sees the
committed files, never a draft. The panel's Save section hands you each
changed file to **Copy** or **Save**; write it back to its path in
`src/content/` and commit. That is the only thing that changes the site.

---

## How the velog layer works

Writings pulls live from velog (`@lumerico284`) in the browser: no build
step, no backend. Everything below `useVelog()` is framework-free — see
[`src/velog/`](src/velog/).

```
useVelog()            the one React boundary (useSyncExternalStore)
  └── VelogClient     the feed, the series index, every loaded series
        ├── feed.ts      RSS/JSON parsing, the proxy race, whitelisting
        ├── reader.ts    the rendering reader, its pool, retries and cache
        ├── series.ts    series discovery and listing-page scraping
        ├── article.ts   `.atom-one` extraction and sanitising
        └── markdown.ts  markdown → HTML, and velog's eaten math delimiters
```

**Latest posts** (`.. velog:: n`). velog's RSS feed sends no CORS header, so
four sources are **raced** — the feed URL directly, in case that ever
changes, plus `rss2json`, `allorigins` and `codetabs` — each with its own
4.5s `AbortController` deadline. The first *usable* response wins: a source
that answers with an empty or unparseable feed counts as a failure, so a fast
200 carrying nothing cannot beat a slower real answer. Results are cached in
`localStorage` behind `FEED_FORMAT`; a version bump discards older entries
instead of painting them, cached data paints immediately, and a cache older
than 6h refreshes in the background.

**Series** (`.. series::`). The RSS feed only carries the ten newest posts
site-wide, so it cannot describe a full series. Series pages are scraped from
`velog.io/@lumerico284/series/<slug>` and the index from the author's
`/series` page — but velog renders both on the client, so a plain CORS proxy
returns only the empty SPA shell. `r.jina.ai` runs the page in a real browser
first, which is why it is the reader's only member; `READERS` is a raced list
so a second renderer can join it without touching anything else. Each call
gets a 30s deadline and two retries, runs in a concurrency-2 pool where
whatever the user just opened takes priority, and is cached per URL for 12h.
On total failure a stale cached copy is served rather than an error.

`SERIES_ALLOW` whitelists which series are surfaced (`Diffusion-101`,
`Reinforcement-Learning`) and fixes their order. Membership is also inferred
from velog's `[Prefix] Title` convention.

**Article bodies** come from the post page's `.atom-one` container:
`script`/`style`/`iframe`/`link` stripped, links rewritten to absolute with
`target="_blank" rel="noopener"`, images made lazy with an `alt` fallback.
Math is rendered with KaTeX — an npm dependency dynamically imported on the
reader route only, and only when velog did not already render it. Feed-
sourced bodies first pass through `repairMath`, because velog's markdown pass
italicises `*…*` / `_…_` **inside** formulas and leaves `<em>` where a
delimiter used to be. Article typography lives in one stylesheet
(`src/styles/article.css`) since the markup arrives at runtime.

Every network path has a real empty or error state with a retry and a link
out to velog. Never an indefinite spinner.

---

## Deployment

[`.github/workflows/deploy-site.yml`](../.github/workflows/deploy-site.yml)
(at the repo root, where Actions requires it) runs on any push to `main` that
touches `blog/`. It typechecks, lints, tests, builds, and publishes
`blog/dist` to GitHub Pages.

**On the base path.** This checkout is `ChanLumerico/ChanLumerico` — the
profile repo, with the snake and waka workflows — so Pages serves it under
`/ChanLumerico/`, and the workflow sets `BASE_PATH=/ChanLumerico/` to match.
The Vite config defaults to `'/'`, which is what the user-root repo
(`ChanLumerico.github.io`) needs; to move the site there, drop `BASE_PATH`
from the workflow. Routing is hash-based either way, so only asset URLs are
affected.

Enable it once under **Settings → Pages → Build and deployment → Source →
GitHub Actions**.

`npm run deploy` is the alternative: it builds and pushes `dist/` to a
`gh-pages` branch with `gh-pages`. `public/.nojekyll` is committed so Pages
serves the hashed asset filenames untouched.

---

## Layout

```
blog/
├── DESIGN.md                 the port spec: tokens, blocks, routes, maths, velog
├── claude-design/            the DC prototype, kept as the reference to diff against
├── index.html
├── public/                   .nojekyll, and portrait.jpg once you add one
└── src/
    ├── App.tsx               the shell: topbar, frame, routes, footer
    ├── content/              THE CONTENT OF RECORD — *.rst and config.json
    ├── config/               config types and normalisation
    ├── rst/
    │   ├── parse.ts          source → typed block AST (pure, tested)
    │   ├── types.ts          the discriminated union
    │   ├── RstSection.tsx    :layout: → grid / stack / list
    │   └── blocks/           one component per block type
    ├── field/field.ts        the `.. field::` maths (pure, tested)
    ├── velog/                the fetch layer (no React below useVelog)
    ├── hooks/                useVelog, reveal, scroll fade, focus trap, accent
    ├── components/           topbar, rail, footer, crumbs, icons, admin/
    ├── routes/               Home, Research, Writing, SeriesPage, PostPage
    └── styles/               tokens.css, global.css, article.css
```

---

## Accessibility and performance notes

- Keyboard-reachable nav and modals: focus moves in on open, Tab cycles
  inside, Escape closes, focus returns to whatever opened it
- Visible focus rings (`2px` accent, `2px` offset) on every link, button,
  textarea and editable
- `aria-current="page"` on the active tab; `series/*` and `post/*` keep
  Writings highlighted
- `alt` on every image, `role="img"` with a descriptive `aria-label` on both
  computed figures
- `prefers-reduced-motion: reduce` shows every block immediately and drops
  the transitions
- Touch targets reach 44px and hover transforms are inert under
  `@media (hover: none)`
- Breakpoints are the prototype's 1240 / 820 / 520; wide content scrolls
  inside its own container, so the page body never scrolls horizontally
- Route-level code splitting; KaTeX (261 kB) only on the reader route; the
  admin layer (20 kB) only behind `?admin=1`
- The portrait frame reserves its own space, so no layout shift
