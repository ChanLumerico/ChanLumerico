import { describe, expect, it } from 'vitest'
import {
  arrowsFor,
  blobsFor,
  GRID_I,
  GRID_J,
  H,
  MODES,
  PAD,
  railsFor,
  RAIL_RX,
  RAIL_RY,
  S2,
  sampleField,
  scoreAt,
  toPx,
  velAt,
  W,
} from './field'

/** Numeric ∇ₓ log p by central differences, for cross-checking `scoreAt`. */
const logDensity = (x: number, y: number) =>
  Math.log(
    MODES.reduce(
      (acc, m) => acc + m.w * Math.exp(-((x - m.x) ** 2 + (y - m.y) ** 2) / (2 * S2)),
      0
    )
  )

const numericScore = (x: number, y: number, h = 1e-5): [number, number] => [
  (logDensity(x + h, y) - logDensity(x - h, y)) / (2 * h),
  (logDensity(x, y + h) - logDensity(x, y - h)) / (2 * h),
]

describe('scoreAt — it really is ∇ₓ log p of the mixture', () => {
  const probes: [number, number][] = [
    [0, 0],
    [0.3, 0.2],
    [-0.2, -0.5],
    [0.62, -0.3],
    [-0.9, 0.7],
    [1.2, -0.8],
  ]

  it.each(probes)('matches central differences at (%s, %s)', (x, y) => {
    const [ax, ay] = scoreAt(x, y)
    const [nx, ny] = numericScore(x, y)
    // Values run to ~10, so a relative tolerance is the honest check.
    expect(ax).toBeCloseTo(nx, 3)
    expect(ay).toBeCloseTo(ny, 3)
  })

  it('vanishes at a mode only in the limit of a well-separated mode', () => {
    // At mode 0 the other mode still pulls, but by ~1e-4 of the local scale.
    const [vx, vy] = scoreAt(MODES[0]!.x, MODES[0]!.y)
    expect(Math.hypot(vx, vy)).toBeLessThan(0.05)
  })

  it('points uphill — toward the nearer mode — from a low-density corner', () => {
    const [vx, vy] = scoreAt(1.4, -0.85)
    const m = MODES[0]!
    expect(Math.sign(vx)).toBe(Math.sign(m.x - 1.4))
    expect(Math.sign(vy)).toBe(Math.sign(m.y + 0.85))
  })

  it('is far longer in the tails than near a mode', () => {
    const tail = Math.hypot(...scoreAt(-1.5, -0.9))
    const near = Math.hypot(...scoreAt(MODES[1]!.x + 0.05, MODES[1]!.y))
    expect(tail).toBeGreaterThan(near * 10)
  })

  it('returns the zero vector where the density underflows', () => {
    expect(scoreAt(1e6, 1e6)).toEqual([0, 0])
  })

  it('is symmetric under swapping the two equal-ish basins’ geometry', () => {
    // Mode weights differ, so the midpoint score is non-zero but small.
    const mid = scoreAt((MODES[0]!.x + MODES[1]!.x) / 2, (MODES[0]!.y + MODES[1]!.y) / 2)
    expect(Math.hypot(...mid)).toBeGreaterThan(0)
  })
})

describe('velAt — the straightened transport', () => {
  it('has unit horizontal component everywhere', () => {
    for (const x of [-1.5, -0.4, 0, 0.7, 1.5]) expect(velAt(x, 0)[0]).toBe(1)
  })

  it('is independent of y', () => {
    expect(velAt(0.3, -0.9)).toEqual(velAt(0.3, 0.9))
  })

  it('carries only a 0.06·sin(1.1x) vertical wobble', () => {
    expect(velAt(0.5, 0)[1]).toBeCloseTo(0.06 * Math.sin(0.55), 12)
    expect(velAt(0, 0)[1]).toBe(0)
  })

  it('varies in magnitude by well under one percent across the grid', () => {
    const mags = sampleField(velAt).map(p => p.mag)
    const lo = Math.min(...mags)
    const hi = Math.max(...mags)
    expect(hi / lo - 1).toBeLessThan(0.01)
  })
})

describe('toPx', () => {
  it('maps the data window onto the padded canvas', () => {
    expect(toPx(-1.6, 1)).toEqual([PAD, PAD])
    expect(toPx(1.6, -1)).toEqual([W - PAD, H - PAD])
  })

  it('puts the origin at the padded centre', () => {
    const [cx, cy] = toPx(0, 0)
    expect(cx).toBeCloseTo(W / 2, 9)
    expect(cy).toBeCloseTo(H / 2, 9)
  })
})

describe('sampleField', () => {
  it('walks a 13 × 8 grid', () => {
    const pts = sampleField(scoreAt)
    expect(pts).toHaveLength((GRID_I + 1) * (GRID_J + 1))
    expect(pts).toHaveLength(104)
  })

  it('spans x ∈ [-1.5, 1.5] and y ∈ [-0.9, 0.9]', () => {
    const pts = sampleField(scoreAt)
    expect(Math.min(...pts.map(p => p.x))).toBeCloseTo(-1.5, 12)
    expect(Math.max(...pts.map(p => p.x))).toBeCloseTo(1.5, 12)
    expect(Math.min(...pts.map(p => p.y))).toBeCloseTo(-0.9, 12)
    expect(Math.max(...pts.map(p => p.y))).toBeCloseTo(0.9, 12)
  })
})

describe('arrowsFor', () => {
  it('scales score arrows with magnitude and pins flow arrows at length 12', () => {
    const flow = arrowsFor(sampleField(velAt), true)
    const lens = flow.map(a => Math.hypot(a.bx - a.ax, a.by - a.ay))
    for (const l of lens) expect(l).toBeCloseTo(12, 9)

    const score = arrowsFor(sampleField(scoreAt), false)
    const scoreLens = score.map(a => Math.hypot(a.bx - a.ax, a.by - a.ay))
    expect(Math.max(...scoreLens)).toBeGreaterThan(Math.min(...scoreLens) * 3)
    // 15·norm^0.85 + 1.5, with norm ≤ 1.
    expect(Math.max(...scoreLens)).toBeLessThanOrEqual(16.5 + 1e-9)
  })

  it('gives every flow arrow the same opacity, and score arrows a graded one', () => {
    expect(new Set(arrowsFor(sampleField(velAt), true).map(a => a.opacity)).size).toBe(1)
    expect(arrowsFor(sampleField(velAt), true)[0]?.opacity).toBe('0.7')

    const ops = arrowsFor(sampleField(scoreAt), false).map(a => Number(a.opacity))
    expect(Math.min(...ops)).toBeGreaterThanOrEqual(0.12)
    expect(Math.max(...ops)).toBeLessThanOrEqual(0.88)
    expect(new Set(ops).size).toBeGreaterThan(10)
  })

  it('drops arrows below the 1e-4 magnitude floor', () => {
    const flat = sampleField(() => [0, 0])
    expect(arrowsFor(flat, false)).toHaveLength(0)
  })

  it('keeps the prototype’s (-uy, -ux)/len barb normal, not the true perpendicular', () => {
    // A single +x arrow of length 12: ux = 12, uy = 0, so nx = 0 and ny = -1.
    const [a] = arrowsFor([{ x: 0, y: 0, vx: 1, vy: 0, mag: 1 }], true)
    expect(a).toBeDefined()
    const [ax, ay] = toPx(0, 0)
    expect(a!.bx).toBeCloseTo(ax + 12, 9)
    expect(a!.by).toBeCloseTo(ay, 9)
    // Barbs sit 0.42·len behind the tip, ±2.1 along (nx, ny) = (0, -1).
    expect(a!.c1x).toBeCloseTo(ax + 12 - 5.04, 9)
    expect(a!.c1y).toBeCloseTo(ay - 2.1, 9)
    expect(a!.c2x).toBeCloseTo(ax + 12 - 5.04, 9)
    expect(a!.c2y).toBeCloseTo(ay + 2.1, 9)
  })

  it('draws barbs symmetrically about the shaft', () => {
    for (const a of arrowsFor(sampleField(scoreAt), false)) {
      const mid = [(a.c1x + a.c2x) / 2, (a.c1y + a.c2y) / 2]
      // The midpoint of the barbs lies on the shaft, 0.42·len back from the tip.
      const t = 0.42
      expect(mid[0]!).toBeCloseTo(a.bx - (a.bx - a.ax) * t, 6)
      expect(mid[1]!).toBeCloseTo(a.by - (a.by - a.ay) * t, 6)
    }
  })
})

describe('backgrounds', () => {
  it('sizes each basin blob as 20·(0.7 + w)', () => {
    const blobs = blobsFor()
    expect(blobs).toHaveLength(2)
    expect(blobs[0]?.r).toBeCloseTo(20 * (0.7 + 0.55), 12)
    expect(blobs[1]?.r).toBeCloseTo(20 * (0.7 + 0.45), 12)
    expect(blobs[0]?.cx).toBeCloseTo(toPx(MODES[0]!.x, MODES[0]!.y)[0], 12)
  })

  it('places the noise and data rails at x = ∓1.35 on the mid-line', () => {
    const [noise, data] = railsFor()
    expect(noise?.label).toBe('noise')
    expect(data?.label).toBe('data')
    expect(noise!.cx).toBeLessThan(data!.cx)
    expect(noise!.cy).toBeCloseTo(H / 2, 9)
    expect(RAIL_RX).toBe(18)
    expect(RAIL_RY).toBe(58)
  })
})
