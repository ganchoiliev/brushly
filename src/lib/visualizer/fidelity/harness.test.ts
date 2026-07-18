import { describe, expect, it } from 'vitest'
import type { EngineEditInput, ImageEngine } from '@/lib/visualizer/engine/types'
import { medianRepresentativeRgb, rgbToHex } from './deltaE'
import { edgeBandIndices, wallPixelIndices, type Rect } from './mask'
import {
  diffBaseline,
  meanEdgeBleed,
  runFidelity,
  serializeBaseline,
  toBaseline,
  type Baseline,
} from './harness'

/* A zero-latency stand-in for MockEngine (same behaviour — echoes the source —
   without its 600ms sleep, so the full-run test stays under vitest's timeout). */
class EchoEngine implements ImageEngine {
  readonly name = 'echo'
  async editImage(input: EngineEditInput) {
    return { imageBase64: input.imageBase64, mimeType: input.mimeType, model: 'echo' }
  }
}

/** Build a solid w×h RGBA image, then overwrite one region with a colour. */
function makeRgba(w: number, h: number, base: [number, number, number]): Uint8ClampedArray {
  const a = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    a[i * 4] = base[0]
    a[i * 4 + 1] = base[1]
    a[i * 4 + 2] = base[2]
    a[i * 4 + 3] = 255
  }
  return a
}

describe('mask + median (synthetic, no sharp)', () => {
  it('wallPixelIndices selects the rect interior by pixel centre', () => {
    // 4×4 grid, rect covering the middle 2×2 (x,y ∈ {1,2}).
    const rects: Rect[] = [[0.25, 0.25, 0.75, 0.75]]
    const idx = wallPixelIndices(4, 4, rects)
    expect(idx.sort((a, b) => a - b)).toEqual([5, 6, 9, 10])
  })

  it('edgeBandIndices selects only pixels just OUTSIDE the rect', () => {
    const rects: Rect[] = [[0.25, 0.25, 0.75, 0.75]]
    const band = edgeBandIndices(4, 4, rects, 1)
    const wall = new Set(wallPixelIndices(4, 4, rects))
    expect(band.length).toBeGreaterThan(0)
    // No band pixel is inside the wall.
    expect(band.every((i) => !wall.has(i))).toBe(true)
  })

  it('medianRepresentativeRgb recovers a masked solid colour', () => {
    const w = 8
    const h = 8
    const img = makeRgba(w, h, [10, 20, 30])
    const rects: Rect[] = [[0.25, 0.25, 0.75, 0.75]]
    const wallIdx = wallPixelIndices(w, h, rects)
    // Paint the wall region a known colour.
    for (const i of wallIdx) {
      img[i * 4] = 200
      img[i * 4 + 1] = 100
      img[i * 4 + 2] = 50
    }
    const rgb = medianRepresentativeRgb(img, wallIdx)
    // Median-in-linear of a solid region round-trips to (nearly) that colour.
    expect(rgb[0]).toBeGreaterThan(196)
    expect(rgb[1]).toBeGreaterThan(96)
    expect(rgb[2]).toBeGreaterThan(46)
    expect(rgbToHex(rgb)).toMatch(/^#[0-9A-F]{6}$/)
  })
})

describe('meanEdgeBleed', () => {
  const rects: Rect[] = [[0.25, 0.25, 0.75, 0.75]]
  const w = 8
  const h = 8
  const band = edgeBandIndices(w, h, rects, 1)
  const wall = wallPixelIndices(w, h, rects)

  it('is 0 when before === after (nothing changed)', () => {
    const before = makeRgba(w, h, [128, 128, 128])
    const after = makeRgba(w, h, [128, 128, 128])
    expect(meanEdgeBleed(before, after, band)).toBe(0)
  })

  it('is > 0 when a band pixel changes (paint leaked past the mask)', () => {
    const before = makeRgba(w, h, [128, 128, 128])
    const after = makeRgba(w, h, [128, 128, 128])
    const p = band[0] * 4
    after[p] = 0
    after[p + 1] = 0
    after[p + 2] = 255 // recolour one band pixel
    expect(meanEdgeBleed(before, after, band)).toBeGreaterThan(0)
  })

  it('stays 0 when only WALL-interior pixels change (no bleed)', () => {
    const before = makeRgba(w, h, [128, 128, 128])
    const after = makeRgba(w, h, [128, 128, 128])
    for (const i of wall) {
      after[i * 4] = 255
      after[i * 4 + 1] = 0
      after[i * 4 + 2] = 0
    }
    expect(meanEdgeBleed(before, after, band)).toBe(0)
  })
})

describe('runFidelity (echo engine, real fixtures)', () => {
  it('produces a deterministic, rounded, sorted, zero-bleed report', async () => {
    const engine = new EchoEngine()
    const a = await runFidelity(engine, undefined, '2020-01-01T00:00:00.000Z')
    const b = await runFidelity(engine, undefined, '2020-01-01T00:00:00.000Z')

    // Determinism: two runs are byte-identical after stripping the timestamp.
    expect(serializeBaseline(toBaseline(a))).toEqual(serializeBaseline(toBaseline(b)))

    // Every result is well-formed, rounded to ≤4dp, and — echo means no repaint —
    // has exactly 0 bleed.
    expect(a.results.length).toBeGreaterThan(0)
    for (const r of a.results) {
      expect(r.bleed).toBe(0)
      expect(Number.isFinite(r.deltaE)).toBe(true)
      expect(Math.round(r.deltaE * 1e4) / 1e4).toBe(r.deltaE)
      expect(r.measuredHex).toMatch(/^#[0-9A-F]{6}$/)
      expect(r.targetHex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }

    // Sorted by (fixtureId, colorId).
    const keys = a.results.map((r) => `${r.fixtureId}/${r.colorId}`)
    expect(keys).toEqual([...keys].sort())

    expect(a.summary.meanBleed).toBe(0)
    expect(a.params).toEqual({ workingLongEdge: 384, bandPx: 6 })
  })
})

describe('diffBaseline', () => {
  const base: Baseline = {
    engine: 'mock',
    params: { workingLongEdge: 384, bandPx: 6 },
    results: [
      { fixtureId: 'f', colorId: 'c1', targetHex: '#111111', measuredHex: '#222222', deltaE: 10, bleed: 0 },
      { fixtureId: 'f', colorId: 'c2', targetHex: '#333333', measuredHex: '#444444', deltaE: 20, bleed: 1 },
    ],
    summary: { meanDeltaE: 15, maxDeltaE: 20, meanBleed: 0.5 },
  }
  const tol = { deltaE: 1.5, bleed: 0.5 }
  const clone = (): Baseline => JSON.parse(JSON.stringify(base))

  it('reports no regression against itself', () => {
    expect(diffBaseline(clone(), base, tol)).toEqual([])
  })

  it('ignores an improvement (lower deltaE)', () => {
    const cur = clone()
    cur.results[0].deltaE = 3
    cur.summary.meanDeltaE = 11.5
    expect(diffBaseline(cur, base, tol)).toEqual([])
  })

  it('flags a deltaE regression beyond tolerance and names the metric+row', () => {
    const cur = clone()
    cur.results[0].deltaE = 12 // +2 > tol 1.5
    const regs = diffBaseline(cur, base, tol)
    expect(regs.some((r) => r.metric === 'deltaE' && r.where === 'f/c1')).toBe(true)
  })

  it('does not flag a deltaE change within tolerance', () => {
    const cur = clone()
    cur.results[0].deltaE = 11 // +1 ≤ tol 1.5
    expect(diffBaseline(cur, base, tol).some((r) => r.metric === 'deltaE')).toBe(false)
  })

  it('flags a bleed regression beyond tolerance', () => {
    const cur = clone()
    cur.results[1].bleed = 2 // +1 > tol 0.5
    expect(diffBaseline(cur, base, tol).some((r) => r.metric === 'bleed' && r.where === 'f/c2')).toBe(true)
  })

  it('flags structural drift (added/missing rows) and param changes', () => {
    const cur = clone()
    cur.results.pop() // remove f/c2
    cur.params.workingLongEdge = 512
    const regs = diffBaseline(cur, base, tol)
    expect(regs.some((r) => r.metric === 'row.missing' && r.where === 'f/c2')).toBe(true)
    expect(regs.some((r) => r.metric === 'params.workingLongEdge')).toBe(true)
  })

  it('flags an engine mismatch', () => {
    const cur = clone()
    cur.engine = 'vertex'
    expect(diffBaseline(cur, base, tol).some((r) => r.metric === 'engine')).toBe(true)
  })
})
