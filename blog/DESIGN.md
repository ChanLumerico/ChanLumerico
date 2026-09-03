# DESIGN.md — port spec for `Personal Site v2.dc.html`

Extracted from `claude-design/Personal Site v2.dc.html` (2684 lines: an `<x-dc>`
template with inline `style="…"` strings, a `<helmet><style>` block, and a
`class Component extends DCLogic` in `<script type="text/x-dc">`).

Every value below is lifted verbatim from that file. Nothing is rounded,
renamed, or "improved". Section 7 lists every place where the handoff prompt
and the prototype disagree, and what this port does about it.

---

## 1. Token table

### 1.1 Colour

| Token | Value | Where it comes from |
|---|---|---|
| `--ac` | `#0071e3` | filled buttons, bullet dots, focus ring, SVG `currentColor` |
| `--ac2` | `#0066cc` | links, outline buttons, card eyebrows, `→` glyphs |
| `--ac-hover` | `#0077ed` | `style-hover` on every filled pill |
| `--ac-tint` | `rgba(0,102,204,0.06)` | outline-button hover fill |
| `--ink` | `#1d1d1f` | primary text, figure ink |
| `--ink-2` | `#515154` | card body, entry org, panel sub-captions |
| `--ink-3` | `#6e6e73` | eyebrows, captions, dates, muted copy |
| `--ink-4` | `#a1a1a6` | crumb separators, cite line, post-row date on series page |
| `--ink-5` | `#d2d2d7` | series-page index numerals |
| `--surface` | `#ffffff` | page, cards-on-fog, modals |
| `--fog` | `#f5f5f7` | section cards, figure frames, chips, `pre` |
| `--fog-hover` | `#efeff1` | series-card hover background |
| `--hairline` | `rgba(0,0,0,0.08)` | section borders, entry/post/refs rules, topbar underline |
| `--hairline-2` | `rgba(0,0,0,0.1)` | stats strip rules, FAB border |
| `--hairline-3` | `rgba(0,0,0,0.12)` | `.. divider::`, admin outline buttons |
| `--rule-quote` | `rgba(0,0,0,0.14)` | article `blockquote` left border |
| `--selection` | `rgba(0,113,227,0.18)` | `::selection` |
| `--edit-dash` | `rgba(0,113,227,0.45)` | inline-edit dashed outline |
| `--glass-bar` | `rgba(255,255,255,0.72)` | sticky topbar |
| `--glass-fab` | `rgba(255,255,255,0.86)` | gear FAB |
| `--scrim` | `rgba(0,0,0,0.32)` | source-modal scrim |
| `--badge` | `rgba(0,0,0,0.55)` | "Watch on YouTube" badge |
| `--video-frame` | `#000000` | embed frame ground |
| `--gh` / `--gh-hover` | `#181717` / `#2b2929` | GitHub icon button |
| `--ig` | `radial-gradient(circle at 28% 105%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)` | Instagram icon button |

Figure ink opacities (all on `#1d1d1f`): `0.05`, `0.06`, `0.08`, `0.1`,
`0.12`, `0.14`, `0.18`.

Shadows: `0 6px 20px rgba(0,0,0,0.12)` (FAB) · `0 14px 44px rgba(0,0,0,0.2)`
(admin panel, legend) · `0 24px 70px rgba(0,0,0,0.3)` (source modal) ·
`0 6px 24px rgba(0,0,0,0.3)` (play dot).

### 1.2 `ACCENTS` — Apple system accent set

`[filled, deep]` pairs, written to `--ac` / `--ac2`:

| key | filled | deep |
|---|---|---|
| `blue` | `#0071e3` | `#0066cc` |
| `purple` | `#9F4BC4` | `#8236A8` |
| `pink` | `#E0347C` | `#C21E66` |
| `red` | `#D70015` | `#B00013` |
| `orange` | `#C93400` | `#A32A00` |
| `green` | `#248A3D` | `#1D7333` |
| `graphite` | `#48484A` | `#3A3A3C` |

### 1.3 Type

Families:
- body — `"SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif`
- display — `'SF Pro Display',-apple-system,sans-serif`
- mono — `'SF Mono',ui-monospace,SFMono-Regular,Menlo,monospace`

| Role | Family | Size | Line | Weight | Tracking | Extra |
|---|---|---|---|---|---|---|
| Brand | display | 15 | — | 600 | -0.1 | |
| Nav link | body | 12 | — | 400→600 | — | opacity .62 → 1 |
| Profile `h1` | display | 36 | 40 | 600 | -0.4 | |
| Series `h1` | display | `clamp(30px,4vw,44px)` | 1.08 | 600 | -0.6 | |
| Post `h1` | display | `clamp(28px,3.6vw,40px)` | 1.12 | 600 | -0.5 | `max-width:22ch` |
| Section `h2` | display | `clamp(26px,3vw,32px)` | 1.15 | 600 | -0.3 | |
| RST card `h3` | display | 22 | 27 | 600 | -0.2 | `text-wrap:pretty` |
| Series-card title | display | 24 | 29 | 600 | -0.3 | |
| Series post title | display | 21 | 27 | 600 | -0.3 | |
| Entry role | display | 20 | 25 | 600 | — | |
| Post-row title | display | 19 | 25 | 600 | — | |
| Stats value | display | 30 | 34 | 600 | -0.4 | |
| Series numeral | display | 22 | 28 | 600 | — | `tabular-nums`, `#d2d2d7` |
| Lede | body | `clamp(19px,1.9vw,23px)` | 1.42 | 400 | -0.4 | `max-width:44ch` |
| Quote | body | 19 | 29 | 400 | -0.374 | `max-width:60ch` |
| Body L | body | 17 | 25 | 400 | -0.374 | `max-width:66ch` on paras |
| Body M | body | 15 | 22/23 | 400 | -0.3 | refs title / card bullets |
| Body S | body | 14 | 20/21 | 400 | -0.224 | |
| Caption | body | 13 | 19 | 400 | -0.13 | |
| Eyebrow | body | 12 | — | 400 | -0.12 | |
| Micro pill | body | 11 | — | 400 | -0.11 | series tag on post rows |
| Inline code | mono | 15 | — | 400 | — | in prose |
| Source editor | mono | 13 | 1.65 | 400 | — | `tab-size:3` |
| Legend `pre` | mono | 11 | 1.55 | 400 | — | |
| Figure SVG label | — | 10 | — | 400 | — | `#6e6e73` |

`text-wrap:pretty` on every long-form heading and paragraph.

### 1.4 Radii

`980px` (every pill/button/avatar) · `18px` (cards, figure frames, panels,
modals, focus block) · `14px` (article `pre`) · `12px` (article `img`) ·
`10px` (admin rows, legend `pre`) · `7px` / `6px` (skeleton bars, small admin
buttons, SVG rect corners) · `4px` (focus-ring radius) · `3px` (inline-edit
outline radius).

### 1.5 Spacing & layout

| Thing | Value |
|---|---|
| Page frame | `max-width:1080px`, `padding:44px 22px 88px`, `gap:clamp(32px,4vw,56px)` |
| Topbar | `max-width:1080px`, `min-height:48px`, `padding:8px 22px`, `gap:16px` |
| Nav gap | `clamp(14px,2.4vw,26px)` |
| Aside | `flex:1 1 260px`, `max-width:320px`, `gap:28px` |
| Main | `flex:3 1 480px`, `min-width:0`, `gap:56px` |
| Reading column | `max-width:860px`, `margin:0 auto` (writing/research/series/post) |
| Portrait | `width:80%`, `max-width:256px`, `aspect-ratio:1/1`, `margin:0 auto 26px` |
| Focus block | `padding:24px 26px`, `gap:14px` |
| Skills block | `gap:18px`; coursework scroller `max-height:154px` |
| RST grid | `repeat(auto-fit,minmax(240px,1fr))`, `gap:16px` |
| RST stack | `column`, `gap:16px` |
| RST list | `column`, no gap (rows carry their own rules) |
| Series grid | `minmax(280px,1fr)`, `gap:16px`, card `min-height:190px` |
| Field row | `minmax(260px,1fr)`, `gap:30px`; frame `padding:30px` |
| Diagram row | `minmax(240px,1fr)`, `gap:30px`; frame `padding:34px 30px` |
| RST card | `padding:30px 30px 32px` |
| Series card | `padding:26px 26px 24px` |
| Entry row | `padding:24px 0` |
| Post row | `padding:22px 0`, `gap:20px`, date `flex:0 0 96px` |
| Series post row | `padding:26px 0`, `gap:22px` |
| Refs row | `padding:16px 0`, `gap:18px`, year `flex:0 0 74px` |
| Stats strip | `padding:26px 0`, `minmax(150px,1fr)`, `gap:20px` |
| Pill | `height:26px`, `padding:0 12px` |
| Button | `height:36px`, `padding:0 15px` |
| Icon button | `36×36` |
| FAB | `44×44`, `right:20px`, `bottom:20px` |
| Admin panel | `width:min(330px,100vw - 40px)`, `max-height:min(74vh,620px)`, `padding:22px 22px 20px`, `gap:22px`, `right:20px`, `bottom:76px` |
| Legend | `width:min(320px,100vw - 40px)`, `max-height:min(56vh,460px)`, `padding:18px 20px`, `gap:16px` |
| Source modal | `left:20px`, `right:360px`, `max-width:880px`, `height:min(620px,82vh)` |
| Anchor offset | `[id] { scroll-margin-top:88px }` |

### 1.6 Motion

| Thing | Value |
|---|---|
| Reveal | `opacity, transform 800ms cubic-bezier(0.28,0.11,0.32,1)`; from `opacity:0` + `translateY(12px)` to `opacity:1` + `transform:none` |
| Reveal stagger | profile `0ms`, focus `140ms`, skills `200ms` |
| Series-card hover | `transform 240ms cubic-bezier(0.28,0.11,0.32,1)`, `background 240ms ease`; `translateY(-3px)` + `#efeff1` |
| Glass — topbar / FAB | `saturate(180%) blur(20px)` |
| Glass — scrim | `saturate(140%) blur(14px)` |
| Glass — badge | `blur(10px)` |
| Scroll | `html { scroll-behavior:smooth }` |

`transform:none` (not `translateY(0)`) on reveal — a live transform makes the
block a containing block for `position:fixed` descendants.

Reveal observer: `IntersectionObserver` at `threshold:0.08`,
`rootMargin:'0px 0px -6% 0px'`, plus a `sweep()` that shows anything whose
`top < innerHeight * 0.94`. Under `prefers-reduced-motion: reduce` (or with no
`IntersectionObserver`) transitions are set to `none` and everything shows at
once.

Scroll-fade mask on `[data-scrollfade]`:
`linear-gradient(180deg, transparent 0, #000 {top}px, #000 calc(100% - {bottom}px), transparent 100%)`
with `top = scrollTop > 2 ? 22 : 0` and `bottom = (scrollHeight - clientHeight - scrollTop) > 2 ? 26 : 0`.

### 1.7 Breakpoints

| Width | Effect |
|---|---|
| `≤1240px` | source modal `right:20px`; legend hidden |
| `≤820px` | `#top` `padding-top:30px`, `gap:34px`; aside `max-width:none`, `flex-basis:100%`; portrait `max-width:260px`; main `gap:44px`; nav `flex-wrap:nowrap` + horizontal scroll, scrollbar hidden |
| `≤520px` | `#top` gutters `18px`, `padding-bottom:64px`; topbar gutters `18px`; portrait `max-width:200px`; `[data-items] > *` gutters `22px`, except `about` / `experience` / `writing` which go to `0` |
| `(hover:none)` | `[data-series] a { transform:none !important }` |
| `print` | `[data-adminui] { display:none !important }` |

Focus ring: `outline:2px solid var(--ac)`, `outline-offset:2px`,
`border-radius:4px` on `a:focus-visible, button:focus-visible,
[contenteditable="true"]:focus-visible`.

---

## 2. Block-type inventory

Section header: a title line, an `={3,}` underline, then `:key: value` option
lines. `:id:` (slugified) and `:layout:` (`grid` | `stack` | `list`) are read;
anything else is kept on the section.

Directive form: `.. name:: title`, then indented (`\s{2,}`) continuation.
Indented `:key: value` lines are options; every other indented line joins the
body, which is whitespace-collapsed. `:link:` parses `Label <url>`; `:tag:`,
`:bullet:` and `:item:` append to arrays; any other key is a scalar.
`-{3,}` on its own line is a divider. Any other non-blank run is a paragraph.

| `type` | Fields read | Renders as |
|---|---|---|
| `card` | `title`, `num`, `meta`, `body`, `bullets[]`, `links[]`, `tags[]` | `#f5f5f7` / `18px` card, `30px 30px 32px`. Eyebrow = `num` in `--ac2` (`margin-bottom:14px`) **or** `meta` in `#6e6e73` (`margin-bottom:12px`), `num` winning. `h3` 22/27/600/-0.2. Body 17/25 `max-66ch`. Bullets: `5px` `--ac` dot (`margin-top:9px`) + 15/23 text, `gap:10px 12px`, `margin-top:18px`. Links/tags row `margin-top:22px`, `gap:10px`: links are filled `--ac` pills, tags white pills |
| `para` | `body` | 17/25/-0.374 `#515154` `max-66ch` |
| `divider` | — | `1px` `rgba(0,0,0,0.12)`, `margin:6px 0` |
| `lede` | `title` ‖ `body` | `clamp(19px,1.9vw,23px)`/1.42/-0.4 `#1d1d1f` `max-44ch` |
| `quote` | `title` ‖ `body`, `cite` | `3px` `--ac` left rule, `padding:2px 0 2px 20px`; 19/29 text; cite 12/-0.12 `#6e6e73` `margin-top:10px` |
| `stats` | `items[]` as `value \| label` | grid `minmax(150px,1fr)` `gap:20px`, `padding:26px 0`, rules top+bottom `rgba(0,0,0,0.1)`. Value display 30/34/600/-0.4; label 13/19/-0.13 `#6e6e73` `margin-top:6px` |
| `field` | `title` (caption) | computed two-panel SVG figure — see §4 |
| `diagram` | `title`, `cite` (`Text <url>`) | two-panel hand-drawn SVG — see §4 |
| `embed` | `title` (URL), `caption` | `16/9` black `18px` frame; YouTube poster (`maxresdefault` → `hqdefault` on error) under a full-bleed link to `watch?v=`, `66px` white play dot, "Watch on YouTube" badge at `left:16px bottom:14px`. Video id = `/[\w-]{8,}$/` on the URL |
| `figure` | `title` (caption), `id`, `ratio`, `placeholder` | `aspect-ratio` frame (default `16/9`) on `#f5f5f7`/`18px` holding an image drop slot; caption 13/19 `max-60ch` |
| `refs` | `items[]` as `title \| year \| url?` | rows `padding:16px 0` with a top rule (last also bottom). Year `flex:0 0 74px` 12/-0.12 tabular; title 15/22/-0.3; a `url` makes the row an `<a target=_blank rel=noopener>` and appends a `--ac2` `→` |
| `series` | `items[]` (slugs, optional) | velog series gallery: grid `minmax(280px,1fr)` `gap:16px`. No `:item:` ⇒ discovered index |
| `velog` | `title` (count, default `4`) | latest-posts list, `SERIES_ALLOW`-filtered |
| `pills` | `title` (comma list) | `26px` `#f5f5f7` pills, `gap:8px` |
| `entry` | `title`, `date`, `org` | `padding:24px 0`, bottom rule except last. Date 12/-0.12 `#6e6e73`; role display 20/25/600; org 17/25/-0.374 `#515154` |
| `post` | `title`, `date`, `href`, `body` | row `padding:22px 0` + top rule (last also bottom): date `flex:0 0 96px`, display-19/25/600 title, 14/20 summary, `--ac2` `→` |
| *(fallback)* | `body` ‖ `title` | 17/25 `#515154` paragraph |

`RST_LEGEND` (17 rows) is the authoring cheatsheet and ships as-is.

---

## 3. Route map

`routeFromHash()` strips `#/`; `post/…` and `series/…` pass through raw,
otherwise the lowercased value must be in `['main','research','writing']`
(index `> 0`, so `main` is never matched by name) and anything else is `main`.

| Hash | Route | Rail | Column | Source |
|---|---|---|---|---|
| `#/`, `#`, unknown | `main` | yes | `flex:3 1 480px` | `main.rst` |
| `#/research` | `research` | no | `max-width:860px` centred | `research.rst` |
| `#/writing` | `writing` | no | `860px` centred | `writing.rst` |
| `#/series/<slug>` | `series/<slug>` | no | `860px` centred | velog scrape |
| `#/post/<slug>` | `post/<slug>` | no | `860px` centred | velog feed ‖ scrape |

`isWritingRoute` (rail hidden, column narrowed) is true for `writing`,
`research`, `series/*` and `post/*`. `#top` keeps `max-width:1080px` on every
route so page gutters never shift; the *column* narrows instead.

Nav highlight maps `series/*` and `post/*` back to `writing`.
`document.title` is `Chan Lee` on `main`, else `Chan Lee · <label>` with
labels `{main:'Home', research:'Research', writing:'Writings'}`.

Route change scrolls to `(0,0)` and re-runs the reveal sweep.

Breadcrumbs (`crumbs`): `gap:8px`, `margin-bottom:26px`, `13px/-0.13`, `/`
separators in `#a1a1a6`, links in `--ac2`, the tail in `#6e6e73` with
`max-width:46ch` ellipsis.
- series page — `Writings / <name>`
- post page — `Writings / <series> / <post title>`, where the series step is
  only a link when a *real* velog slug is known (`seriesSlug`, or
  `slugForSeriesName`); a bare `[Prefix]` name renders unlinked, because
  linking it would open an invented series page.

---

## 4. Figure maths

### `.. field::` — score field vs. rectified-flow velocity field

Canvas `W=320`, `H=190`, `PAD=16`.

```
modes = [ {x: 0.62, y:-0.42, w:0.55}, {x:-0.55, y: 0.44, w:0.45} ]
s2    = 0.12
toPx(x,y) = [ PAD + ((x+1.6)/3.2)*(W-2*PAD),  PAD + ((1-y)/2)*(H-2*PAD) ]
```

Score of the two-mode Gaussian mixture — responsibility-weighted mean of the
per-component scores, i.e. exactly `∇ₓ log Σ wᵢ N(x; μᵢ, s2·I)`:

```
p_i     = w_i * exp(-|x-μ_i|² / (2*s2))
score   = ( Σ p_i * (μ_i - x)/s2 ) / Σ p_i          (0 when Σ p_i ≤ 1e-9)
```

Rectified-flow velocity, a straightened constant transport:

```
vel(x,y) = [ 1, 0.06 * sin(1.1*x) ]
```

Grid: `i = 0..12`, `j = 0..7`, `x = -1.5 + 3i/12`, `y = -0.9 + 1.8j/7`
(13 × 8 = 104 samples). Arrows skip `mag < 1e-4`. `norm = min(1, mag/max)`.

```
len     = uniform ? 12 : 15 * norm^0.85 + 1.5
opacity = uniform ? 0.7 : (0.12 + 0.76*norm).toFixed(2)
(ux,uy) = (v/mag) * len          tip = (ax + ux, ay - uy)
(nx,ny) = (-uy/len, -ux/len)     barbs at tip - 0.42*(ux,-uy) ± 2.1*(nx,ny)
```

`(nx,ny)` is `(-uy,-ux)/len`, not the true perpendicular `(-uy,ux)/len`. It
is kept verbatim — it is what draws the arrowheads in the prototype — and is
pinned by a unit test so it cannot drift.

Backgrounds. Score panel: per mode, `r = 20*(0.7+w)` at `0.05` plus `0.4r` at
`0.12`. Flow panel: `ellipse rx=18 ry=58` at `x = ∓1.35`, opacity `0.06`,
labelled `noise` / `data` at `y = H-3`, `font-size:10`, `#6e6e73`.

Panel labels: `Score field  ∇ₓ log p(x)` and
`Velocity field  v(x, t) after reflow`, `12px/-0.12` in `--ac2`; sub-caption
`13/19/-0.13` `#515154`. SVG carries `role="img"` and
`aria-label="<label> — <sub>"`, `color:var(--ac)`, arrows in `currentColor`.

### `.. diagram::` — SDE path vs ODE path

`viewBox="0 0 320 150"`, `overflow:visible`.

- noise blob `circle cx=34 cy=75 r=26 @0.08` + `r=13 @0.14`
- data slab `rect x=270 y=49 w=34 h=52 rx=6 @0.1` + `x=279 y=60 w=16 h=30 rx=3 @0.18`
- SDE path `M60 75 C 90 40, 110 110, 138 62 S 176 108, 202 68 S 236 96, 254 75`, `stroke-dasharray="1 5"`, arrowhead `M258 75 l-9 -5 v10 z` at `opacity 0.75`
- ODE path `M60 75 L 254 75`, solid, arrowhead at full opacity
- `stroke-width:2`, `stroke-linecap:round`
- labels `noise` at `x=34`, `data` at `x=287`, `y=130`, `font-size:10`

---

## 5. velog data flow

```
handle          @lumerico284
SERIES_ALLOW    ['Diffusion-101', 'Reinforcement-Learning']
FEED_CACHE      'chanlee-velog-feed'      FEED_FORMAT 5
reader cache    'chanlee-jina:<fmt>:<url>'
```

### 5.1 Latest posts (`.. velog:: n`)

1. Read `FEED_CACHE`. `cached.v !== FEED_FORMAT` ⇒ discard (never paint an
   older format). Legacy key `chanlee-velog-feed-v2` is removed.
2. Any cached posts paint immediately. `Date.now() - t < 6h` ⇒ stop there;
   otherwise refresh in the background and repaint.
3. Fetch, over four sources — `api.velog.io/rss/@handle` direct (in case CORS
   ever opens), `api.rss2json.com`, `api.allorigins.win/raw`,
   `api.codetabs.com/v1/proxy` — each with its own `AbortController`
   deadline of `4500ms` and `cache:'no-store'`. First usable (non-empty,
   parsed) response wins; capped at 20 posts.
4. RSS is parsed with `DOMParser` (`application/xml`, bail on
   `parsererror`); the rss2json shape is parsed as JSON.
5. `decorate()` reads velog's `[Series] Title` convention:
   `series` = prefix, `cleanTitle` = remainder, `slug` = last path segment.
6. `blurb()` takes the **first `<p>` longer than 24 chars** of the RSS
   description (not a blind slice), strips `$…$`, and clamps to 130 chars
   with `…`.
7. Rows are filtered to `SERIES_ALLOW`: each allowed slug is lowercased with
   `-<digits>` suffix dropped and `-` → space, then matched loosely against
   `p.series`. Posts with no series always pass.
8. Empty result renders a rule-bounded 14/21 `#6e6e73` line —
   *"Could not reach the velog feed right now. Open the archive on velog.io."*
   Never a spinner.

### 5.2 Series index and series pages (`.. series::`)

velog renders series and post pages on the client, so RSS (ten newest posts,
site-wide) cannot describe a full series. `r.jina.ai` renders the page in a
real browser and returns it with CORS open.

- `discoverSeries()` reads `/@handle/series` as **markdown first** (its cards
  hydrate after the HTML snapshot, but the markdown view carries the links),
  falling back to HTML. Slugs come from `/\/series\/([A-Za-z0-9%._-]+)/g`,
  then `SERIES_ALLOW.filter(...)` — the whitelist also fixes the order.
- `loadSeries(slug)` reads the series page as HTML and parses it with
  `DOMParser`: each `h2` gives `a[href*="/@"]` (title, href, slug),
  `.number` (`n`), and from the `h2`'s parent `.post-info` a `p` blurb and a
  `.date`. Deduped by slug, sorted by `n` descending.
- Feed data is merged in: matching posts contribute `date`, `summary` and
  `content`. Slugs are compared **decoded** — feed slugs arrive
  percent-encoded, listing slugs decoded, and comparing raw duplicates the
  post. Feed posts of the same series that the listing missed are appended
  with `n = 0`, then everything re-sorts (`n` desc, else date desc).
- Series display name comes from `<title>`: `split('|')[1].split(' - ')[0]`,
  falling back to `slug.replace(/-/g,' ')`.
- Gallery load is sequential (`reduce` over a promise chain) with a repaint
  after each, so cards fill in one at a time. A failed slug is recorded in
  `_failedSeries` and painted as a "Could not load — open to retry" card;
  a failed *index* paints a "Reload series" button.

### 5.3 The reader (`jina`)

- Per-URL `localStorage` cache, `12h` TTL, keyed by format.
- In-flight de-duplication per key.
- `AbortController` timeout `30000ms`; header `x-timeout: 40`; `x-return-format: html`
  for HTML; `x-target-selector` when a selector is given; `x-no-cache` when forced.
- A body shorter than 400 chars, or one failing the caller's `validate`, is an
  error — never cached. Article validation is `html.includes('atom-one')`;
  a chrome dump is rejected outright.
- 2 retries with a `1200ms` gap.
- Concurrency pool of **2**, priority-sorted: whatever the user just opened
  (`urgent`) gets priority `0`, background work `1`. One strict queue made a
  later series wait behind every earlier one; parallel-everything is what made
  it flaky.
- On total failure, any cached copy — even stale — is served rather than an
  error.
- `cachePut` handles quota: on failure it drops the oldest half (min 3) of
  `chanlee-jina*` entries by timestamp and retries once.

### 5.4 Article bodies

`fetchArticle(url)` asks the reader for HTML, takes `.atom-one`, and:
strips `script,style,iframe,object,embed,link,noscript`; sets `loading="lazy"`,
`decoding="async"` and an `alt=""` fallback on images; rewrites `/…` hrefs to
`https://velog.io/…` and forces `target="_blank" rel="noopener"`. It reports
`typeset: body.querySelectorAll('.katex').length === 0` — velog's own KaTeX
output is already in the markup, so a second typeset pass is skipped.

Feed-sourced bodies (RSS `description`) go through `repairMath()` first:
velog's markdown pass italicises `*…*` / `_…_` **inside math**, so some
formulas arrive with `<em>` where a delimiter used to be. `repairMath` walks
the string tracking `$`/`$$` state and, for a tag pair opened inside math,
restores the delimiter (`_`, or `*` after `^`/`_`) instead of the tag —
italics in prose stay italics. Any other tag is copied verbatim so a `$` in an
attribute cannot flip the math state.

KaTeX delimiters: `$$…$$` and `\[…\]` display, `$…$` and `\(…\)` inline;
`throwOnError:false`, `strict:false`.

Article typography lives in one stylesheet (`[data-article]`) because the
markup arrives at runtime: 17px/1.72/-0.2, `overflow-wrap:anywhere`, display
headings at 28/24/20/17, `img` `border-radius:12px` capped at
`min(70vh,620px)` with `object-fit:contain`, `pre` on `#f5f5f7`/`14px` radius,
tables scrollable, `.katex-display` horizontally scrollable.

### 5.5 Post resolution

`renderReader(slug)` decodes the slug and looks in the feed first, then every
loaded series cache. A hit with `content` renders immediately from the feed
body; otherwise the post's own page is fetched, with a route guard so a
late response cannot paint over a page the user has already left. Failure
renders *"Could not load this post right now. Open it on velog below."*
plus the "Read on velog" outline button (and "← Back to <series>" when known).

---

## 6. Admin layer

Prototype: gear FAB → panel that persists to `localStorage['chanlee-cv-config-v6']`
(`DEFAULTS`: `order`, `blockOrder`, `hidden`, `side`, `accent`, `text`,
`items`, `extras`, `pages`, `activePage`), normalised on read so a stale,
partial or hand-edited config can never hide a section or crash a render.

Capabilities: reorder/hide sections and sidebar blocks · sidebar left/right ·
accent picker · inline text editing of any authored block (plain-text paste,
Enter blurs, `[data-tools]` toolbars excluded from the saved text) ·
add/delete Notion-style blocks (`text`, `heading`, `card`, `link`, `divider`) ·
per-page RST source editor with the legend as a floating cheatsheet ·
copy config JSON · reset.

**This port changes where it persists**, as instructed:

- Content of record is `src/content/*.rst` + `src/content/config.json`.
- The admin UI edits in memory; Save produces file contents to download or
  copy, which get committed.
- `localStorage` (`chanlee-cv-draft-v1`) is only an unsaved-draft buffer, and
  the UI says so.
- The whole layer is gated behind `?admin=1` (or `import.meta.env.DEV`), so
  visitors never see the gear.

---

## 7. Where the prompt and the prototype disagree

Flagged, not silently decided.

| # | Handoff prompt says | `Personal Site v2.dc.html` actually does | This port |
|---|---|---|---|
| 1 | Breakpoints `1240 / 1024 / 768 / 480` | `1240`, `820`, `520` (+ `hover:none`, `print`) | prototype's — `1240/820/520` |
| 2 | Left profile rail is **sticky** | only the topbar is `position:sticky`; the rail scrolls | prototype's — rail not sticky |
| 3 | Nav is brand · Research · Writings · **gear** | gear is a fixed `44px` FAB at `right:20px bottom:20px`; nav has no gear | prototype's — FAB, now `?admin=1`-gated |
| 4 | Email / GitHub / Instagram are all **circular icon buttons** | Email is a `36px` filled **pill** reading "Email"; GitHub and Instagram are `36×36` circular icon buttons | prototype's |
| 5 | Rail is photo + name + affiliation | rail also carries a **Focus** pill block and a **Skills** block (Languages / ML+DL / a scroll-faded Coursework list of 15) | prototype's — both ported, driven by `config.json` |
| 6 | velog fetches **race** several proxies, first usable wins | the RSS feed tries 4 sources **sequentially**, each with a `4500ms` deadline; there is no `PROXIES` const and no `race` helper. The page reader is a **single** proxy (`r.jina.ai`) with 2 retries and a concurrency-2 priority pool | **race implemented** for the feed, per the explicit instruction and its rationale — all four sources fire at once, first usable response wins, per-request `4500ms`. The reader keeps its pool + retries: `r.jina.ai` renders JavaScript, and no other public proxy does, so racing it against raw-HTML proxies would only ever return velog's empty SPA shell (they fail the `atom-one` validator). `READERS` is an array so a second renderer can join the race later |
| 7 | Reader route loads KaTeX | prototype loads `katex.min.css` + `katex.js` + `auto-render.js` from CDN on **every** page | prompt's — `katex` is an npm dep, dynamically imported on the post route only |
| 8 | Home renders from `main.rst` | Home renders the **authored template markup**; `pageSource('main')` returns `''` by default, so `RST_DEFAULT` is only the editor's seed | prompt's — `main.rst` is the source of record. Deltas below |
| 9 | `base: '/'`, user-root Pages repo `ChanLumerico.github.io` | this checkout is `ChanLumerico/ChanLumerico` (the profile repo — snake + waka workflows), which serves Pages at `/ChanLumerico/` | `base` defaults to `'/'` per the prompt, overridable with `BASE_PATH`. `HashRouter` means only asset URLs care |

### 7.1 Deltas from moving Home onto `main.rst` (item 8)

`RST_DEFAULT` is ported verbatim, so the RST card renderer replaces the
authored per-section card styling:

| Section | Authored markup | via `rstBlock` |
|---|---|---|
| Research interests | grid `minmax(220px,1fr)`; card `26px 24px 28px`; `h3` 20/25; eyebrow `margin-bottom:16px` | grid `minmax(240px,1fr)`; card `30px 30px 32px`; `h3` 22/27/-0.2; eyebrow `margin-bottom:14px` |
| Projects | `h3` 24/29/-0.2; `<code>` and `<em>` inline in the body | `h3` 22/27/-0.2; body is plain text (the DSL has no inline markup) |
| Awards & activities | grid `minmax(260px,1fr)`; card `28px 26px 30px`; `h3` 20/25 | grid `minmax(240px,1fr)`; card `30px 30px 32px`; `h3` 22/27/-0.2 |
| Writings | `h2` reads **"Writings"**; a header row with a 17/25 `#6e6e73` `max-52ch` subtitle and a "Velog archive" outline button | `h2` reads **"Writing"** (`RST_DEFAULT`'s own title); no subtitle, no archive button — neither exists in the source |
| About | para 19/29 `max-62ch` | para 17/25 `#515154` `max-66ch` |

All of it is recoverable by editing `main.rst`; none of it is a design change
made by this port. Say the word and I will either add the missing copy to
`main.rst` or keep Home on hand-written components.
