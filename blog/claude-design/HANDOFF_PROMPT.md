# Claude Code prompt — rebuild as a real React app

Copy everything below the line into Claude Code, in the repo root, with
`Personal Site v2.dc.html` present.

---

I have a working single-file prototype of my personal site / CV at
`Personal Site v2.dc.html`. It renders through a proprietary runtime, so I want you
to rebuild it as a real React codebase I own, deployed to GitHub Pages at
`https://ChanLumerico.github.io`.

**Read `Personal Site v2.dc.html` first and treat it as the design spec.** It is one
HTML file: a template in `<x-dc>…</x-dc>`, and a `class Component` in the
`<script type="text/x-dc">` block. Every number in it is deliberate — lift the exact
values (hex codes, font sizes, letter-spacing, radii, spacing, breakpoints,
`cubic-bezier` easings) rather than approximating them. My CSS is written inline as
`style="…"` strings and as a small `<helmet><style>` block; port both faithfully.

## Stack

- Vite + React 18 + TypeScript
- React Router (`HashRouter` — GitHub Pages has no server rewrite, and the prototype's
  URLs are already `#/research`, `#/writing`, `#/series/<slug>`, `#/post/<slug>`)
- CSS Modules or vanilla-extract. Keep the token values in one place
  (`src/styles/tokens.css` as CSS custom properties) and reference them everywhere;
  do not scatter literals.
- No component library, no Tailwind, no CSS-in-JS runtime. The design is
  Apple-Human-Interface-flavoured and hand-tuned.
- `gh-pages` (or a GitHub Actions workflow) for deployment, `base: '/'` in Vite config
  since this is the user-root Pages repo.

## What the site is

An academic CV / blog for an AI research student. Three routes plus two dynamic ones:

1. **`#/` — Home.** Two-column: a sticky left profile rail (circular photo, name,
   affiliation, Email / GitHub / Instagram circular icon buttons) and a right column
   of CV sections (About, Research interests, Experience, Projects, Writings, Awards &
   activities). Below ~1024px it collapses to one column and the rail un-sticks.
2. **`#/research` — Research interests.** Single wide column, no rail. Long-form
   editorial page with lede lines, stat strips, 3-up cards, an embedded video poster,
   a hand-computed vector-field figure, and reference lists.
3. **`#/writing` — Writings.** Single wide column, no rail. A gallery of velog series
   cards. Clicking one goes to `#/series/<slug>` (post list), clicking a post goes to
   `#/post/<slug>` (the article rendered in-page). Notion-style drill-down with a
   breadcrumb back out.

The top nav has only the brand ("Chan Lee", returns home), `Research`, `Writings`, and
a gear icon. The active tab is `font-weight: 600` + full opacity and carries
`aria-current="page"`.

## Content model — port the custom RST layer

The prototype's page content is authored in a small reStructuredText-like DSL and
parsed at runtime by `parseRst` / `rstBlock` in the logic class. **Keep this.** It is
the whole point of the site's editability.

- Section: a title line, an `=====` underline, then `:id:` and
  `:layout: grid | stack | list` options.
- Blocks are directives: `.. card::`, `.. entry::`, `.. lede::`, `.. stats::`,
  `.. pills::`, `.. refs::`, `.. figure::`, `.. diagram::`, `.. embed::`,
  `.. field::`, `.. velog::`, `.. series::`, plus bare paragraphs and `----` dividers.
- Directive options are `:key: value` lines (`:num:`, `:meta:`, `:date:`, `:org:`,
  `:tag:`, `:bullet:`, `:item:`, `:link: Label <url>`, `:cite:`, `:ratio:`, `:id:`).
- Read `RST_LEGEND`, `RST_DEFAULT` and `RST_PAGES` in the file: `RST_LEGEND` is the
  authoring cheatsheet, and the other two are the actual current content of the three
  pages. Port that content verbatim as `.rst` files under `src/content/`
  (`main.rst`, `research.rst`, `writing.rst`) and import them with `?raw`.

Structure this as: `src/rst/parse.ts` (source → typed block AST, pure and unit-tested)
and `src/rst/blocks/*.tsx` (one small component per block type). Give the AST real
types — a discriminated union on `type`. Every block type in the prototype must render
identically; diff them side by side.

`.. field::` is a scientific figure that computes a score field (∇ₓ log p of a
two-mode Gaussian mixture) and a rectified-flow velocity field on a grid and emits
SVG arrows. Port the math exactly — it is real, not decorative — and keep it a pure
function so it can be tested.

## velog integration — runtime, client-side

Writings pulls live from velog (`@lumerico284`), in the browser, with no build step
and no backend. The prototype's fetch layer is the part that took the longest to get
right, so port its behaviour, not just its shape:

- The RSS feed only returns recent posts, so full series listings are scraped from
  `https://velog.io/@lumerico284/series/<slug>`, and the series index from the
  author's `/series` page. Article bodies come from the post page's `.atom-one`
  container.
- velog sends no CORS headers, so every request goes through a **race across several
  public proxies with a per-request timeout**, first usable response wins, and each
  fetch is retried. See the `PROXIES` list and the `urgent` / `jina` / `race` helpers.
  Keep the racing — a single proxy is why the prototype was flaky for days.
- Results are **cached in `localStorage` behind a format version** (`FEED_CACHE`,
  `FEED_FORMAT`); a version bump discards older entries instead of painting them.
  Cached data paints immediately, then refreshes in the background.
- `SERIES_ALLOW` whitelists which series are surfaced (`Diffusion-101`,
  `Reinforcement-Learning`). Series membership is also inferred from a `[Prefix]`
  title convention.
- Every network path needs a real empty/error state. Never an indefinite spinner.
- Post bodies are sanitised (`script`/`style`/`iframe`/`link` stripped, links
  rewritten to absolute + `target="_blank" rel="noopener"`, images lazy with an `alt`
  fallback) and their math is rendered with KaTeX. Article typography lives in one
  stylesheet since the markup arrives at runtime.

Put all of this behind one hook — `useVelog()` — or TanStack Query if you prefer,
with `localStorage` persistence. It must not import anything React-specific below the
hook boundary.

## Admin / editing layer

The prototype has a gear-icon admin panel that writes to `localStorage` (key
`chanlee-cv-config-v6`): reorder and hide sections, edit the profile, pick an accent
colour from Apple's system set (`ACCENTS`), crop a profile photo in a modal with a
1:1 circular guide, inline-edit any text block on Home, add/delete Notion-style
blocks, and edit each page's RST source in a centred code-editor modal with the
legend as a floating cheatsheet.

Port it, but change where it persists. `localStorage` means edits live in one browser
and never reach a visitor. Instead:

- Content of record is the `.rst` files and a `src/content/config.json` in the repo.
- The admin UI edits in memory and its save action produces the file contents, which I
  commit (a download button and a copy-to-clipboard button are fine; a GitHub API
  write path behind a token is a nice-to-have, not required).
- `localStorage` stays only as an unsaved-draft buffer, clearly labelled as such in
  the UI.
- Gate the admin UI behind a `?admin=1` query param or a dev-only build flag so
  visitors never see the gear.

## Requirements

- **Responsive across form factors.** Breakpoints at 1240 / 1024 / 768 / 480px are
  already in the prototype's media queries — port them. Touch targets ≥ 44px, and
  hover transforms disabled under `@media (hover: none)`.
- **Accessible.** Keyboard-reachable nav and modals (focus trap, Escape to close,
  focus restore), visible focus rings, `aria-current` on the active tab, `alt` on
  every image, `prefers-reduced-motion` respected for the fade-in animations.
- **Fast.** Route-level code splitting, KaTeX loaded only on the reader route, no
  layout shift on the profile photo.
- Unit tests for the RST parser and the vector-field math (Vitest). A smoke test per
  route.
- ESLint + Prettier + `tsc --noEmit` clean.
- `README.md` covering local dev, how to edit content, how the velog fetch layer
  works, and how deployment happens.

## How to work

1. Read the prototype end to end and write `DESIGN.md`: the extracted token table
   (colours, type scale, spacing, radii, easings), the block-type inventory, the route
   map, and the velog data flow. Show me that before writing app code.
2. Scaffold, port the tokens and the RST parser with its tests, then the blocks, then
   the routes, then the velog layer, then the admin layer.
3. Commit in small steps with real messages. Do not reorganise or "improve" the visual
   design — this is a port, and any deviation from the prototype should be something
   you flag to me rather than decide.
