/**
 * The `.. field::` figure: the score of a two-mode Gaussian mixture, and the
 * velocity field of a rectified flow, both evaluated on a grid.
 *
 * Pure — no DOM, no React. Every constant is lifted verbatim from the
 * prototype's `rstBlock` `field` branch; see DESIGN.md §4.
 */

export const W = 320
export const H = 190
export const PAD = 16

export interface Mode {
  x: number
  y: number
  w: number
}

export const MODES: readonly Mode[] = [
  { x: 0.62, y: -0.42, w: 0.55 },
  { x: -0.55, y: 0.44, w: 0.45 },
]

/**
 * Shared isotropic variance. Tight modes make the score sharply non-uniform:
 * long arrows far out, vanishing at each mode, and a visible divide between
 * the two basins.
 */
export const S2 = 0.12

/** Grid resolution: 13 × 8 = 104 samples. */
export const GRID_I = 12
export const GRID_J = 7

export type Vec2 = readonly [number, number]

/** Data coordinates (x ∈ [-1.6, 1.6], y ∈ [-1, 1]) → SVG pixels. */
export const toPx = (x: number, y: number): Vec2 => [
  PAD + ((x + 1.6) / 3.2) * (W - 2 * PAD),
  PAD + ((1 - y) / 2) * (H - 2 * PAD),
]

/**
 * ∇ₓ log p(x) for p = Σ wᵢ·N(x; μᵢ, S2·I).
 *
 * The unnormalised responsibility of each mode weights that mode's own score
 * (μᵢ - x)/S2, and the sum is divided by the total — which is exactly the
 * gradient of the log of the mixture. Returns the zero vector where the
 * density underflows.
 */
export const scoreAt = (x: number, y: number): Vec2 => {
  let wx = 0
  let wy = 0
  let tot = 0
  for (const m of MODES) {
    const d2 = (x - m.x) * (x - m.x) + (y - m.y) * (y - m.y)
    const p = m.w * Math.exp(-d2 / (2 * S2))
    tot += p
    wx += (p * (m.x - x)) / S2
    wy += (p * (m.y - y)) / S2
  }
  return tot > 1e-9 ? [wx / tot, wy / tot] : [0, 0]
}

/**
 * After rectification the paths are straight lines with matched endpoints, so
 * the field is essentially a constant transport: same direction, same length,
 * everywhere.
 */
export const velAt = (x: number, _y: number): Vec2 => [1, 0.06 * Math.sin(x * 1.1)]

export interface Sample {
  x: number
  y: number
  vx: number
  vy: number
  mag: number
}

/** Evaluate a field on the grid. */
export const sampleField = (fn: (x: number, y: number) => Vec2): Sample[] => {
  const pts: Sample[] = []
  for (let i = 0; i <= GRID_I; i++) {
    for (let j = 0; j <= GRID_J; j++) {
      const x = -1.5 + (3 * i) / GRID_I
      const y = -0.9 + (1.8 * j) / GRID_J
      const [vx, vy] = fn(x, y)
      pts.push({ x, y, vx, vy, mag: Math.hypot(vx, vy) })
    }
  }
  return pts
}

export interface Arrow {
  /** Tail, in SVG pixels. */
  ax: number
  ay: number
  /** Tip, in SVG pixels. */
  bx: number
  by: number
  /** Barb endpoints, in SVG pixels. */
  c1x: number
  c1y: number
  c2x: number
  c2y: number
  opacity: string
}

/**
 * Grid samples → arrow geometry.
 *
 * `uniform` is the flow panel: every arrow gets the same length and opacity,
 * which is the whole point of the comparison. The score panel scales length
 * and weight with magnitude instead.
 *
 * The barb normal is `(-uy, -ux)/len`, not the true perpendicular
 * `(-uy, ux)/len`. That is what the prototype computes, so it is what this
 * computes; the barbs stay a symmetric pair either way. Pinned by a test.
 */
export const arrowsFor = (samples: readonly Sample[], uniform: boolean): Arrow[] => {
  const max = samples.reduce((m, p) => (p.mag > m ? p.mag : m), 0)
  const out: Arrow[] = []
  for (const p of samples) {
    if (p.mag < 1e-4) continue
    const norm = Math.min(1, p.mag / max)
    const len = uniform ? 12 : 15 * Math.pow(norm, 0.85) + 1.5
    const ux = (p.vx / p.mag) * len
    const uy = (p.vy / p.mag) * len
    const [ax, ay] = toPx(p.x, p.y)
    const bx = ax + ux
    const by = ay - uy
    const nx = -uy / len
    const ny = -ux / len
    out.push({
      ax,
      ay,
      bx,
      by,
      c1x: bx - ux * 0.42 + nx * 2.1,
      c1y: by + uy * 0.42 + ny * 2.1,
      c2x: bx - ux * 0.42 - nx * 2.1,
      c2y: by + uy * 0.42 - ny * 2.1,
      opacity: uniform ? '0.7' : (0.12 + 0.76 * norm).toFixed(2),
    })
  }
  return out
}

export interface Blob {
  cx: number
  cy: number
  /** Outer radius at opacity 0.05; the core is 0.4× this at opacity 0.12. */
  r: number
}

/** Density basins behind the score panel. */
export const blobsFor = (modes: readonly Mode[] = MODES): Blob[] =>
  modes.map(m => {
    const [cx, cy] = toPx(m.x, m.y)
    return { cx, cy, r: 20 * (0.7 + m.w) }
  })

export interface Rail {
  cx: number
  cy: number
  label: string
}

/**
 * The flow panel transports one cloud onto the other, so it gets a source on
 * the left and a target on the right instead of two basins. Both ellipses are
 * `rx=18 ry=58` at opacity 0.06.
 */
export const RAIL_RX = 18
export const RAIL_RY = 58

export const railsFor = (): Rail[] => {
  const [ax, ay] = toPx(-1.35, 0)
  const [zx, zy] = toPx(1.35, 0)
  return [
    { cx: ax, cy: ay, label: 'noise' },
    { cx: zx, cy: zy, label: 'data' },
  ]
}

/** Panel copy, verbatim from the prototype. */
export const SCORE_LABEL = 'Score field  ∇ₓ log p(x)'
export const SCORE_SUB =
  'Every arrow points uphill in density, and the two basins pull against each other. Far from the data the field is long and steep; at a mode it collapses to nothing. A sampler here has to take many small, unequal steps.'
export const VEL_LABEL = 'Velocity field  v(x, t) after reflow'
export const VEL_SUB =
  'The same transport, straightened: one direction, one magnitude, everywhere. Nothing varies across the field, which is why a single coarse Euler step already lands close to the data.'
