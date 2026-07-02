import { describe, expect, it } from 'vitest'
import { boxFilter, guidedFilterAlpha, luminanceGuide } from './matting'

// Build a W x H guide + coarse-alpha pair split at column `edge`: left side is
// wall (guideLeft luma, alpha 1), right side is the object (guideRight, alpha 0),
// with a soft `ramp`-wide coarse transition (what the segmentation actually
// gives — a blurry boundary a few cells wide).
function verticalSplit(
  w: number,
  h: number,
  edge: number,
  guideLeft: number,
  guideRight: number,
  ramp = 6,
) {
  const guide = new Float32Array(w * h)
  const alpha = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      guide[i] = x < edge ? guideLeft : guideRight
      // Coarse alpha: 1 well left of the edge, 0 well right, linear across ±ramp.
      const t = Math.min(1, Math.max(0, (edge - x) / ramp + 0.5))
      alpha[i] = t
    }
  }
  return { guide, alpha }
}

const at = (arr: Float32Array, w: number, x: number, y: number) => arr[y * w + x]

describe('boxFilter', () => {
  it('returns the constant everywhere for a constant plane', () => {
    const w = 20
    const h = 12
    const src = new Float32Array(w * h).fill(0.42)
    const out = boxFilter(src, w, h, 5)
    let maxErr = 0
    for (const v of out) maxErr = Math.max(maxErr, Math.abs(v - 0.42))
    expect(maxErr).toBeLessThan(1e-6)
  })

  it('equals the analytic clamped-window mean on a horizontal ramp', () => {
    const w = 11
    const h = 1
    const r = 2
    const src = new Float32Array(w)
    for (let x = 0; x < w; x++) src[x] = x // 0..10
    const out = boxFilter(src, w, h, r)
    // Interior x=5: window 3..7 → mean 5. Border x=0: window 0..2 → mean 1.
    expect(out[5]).toBeCloseTo(5, 6)
    expect(out[0]).toBeCloseTo(1, 6)
    expect(out[10]).toBeCloseTo(9, 6)
  })

  it('returns the global mean when the radius exceeds the plane', () => {
    const w = 8
    const h = 3
    const src = new Float32Array(w * h)
    for (let i = 0; i < src.length; i++) src[i] = i
    const mean = src.reduce((a, b) => a + b, 0) / src.length
    const out = boxFilter(src, w, h, 100)
    for (const v of out) expect(v).toBeCloseTo(mean, 6)
  })
})

describe('luminanceGuide', () => {
  it('maps white→~1, black→0 and weights green heaviest (Rec.709)', () => {
    const px = (r: number, g: number, b: number) => new Uint8ClampedArray([r, g, b, 255])
    expect(luminanceGuide(px(255, 255, 255), 1, 1)[0]).toBeCloseTo(1, 3)
    expect(luminanceGuide(px(0, 0, 0), 1, 1)[0]).toBe(0)
    const green = luminanceGuide(px(0, 255, 0), 1, 1)[0]
    const red = luminanceGuide(px(255, 0, 0), 1, 1)[0]
    const blue = luminanceGuide(px(0, 0, 255), 1, 1)[0]
    expect(green).toBeGreaterThan(red)
    expect(red).toBeGreaterThan(blue)
  })
})

describe('guidedFilterAlpha — acceptance gates from adversarial review', () => {
  // GATE 1: a flat guide with fully-confident coarse alpha must stay ~1
  // everywhere. This is the regression that the inverted variance-gate failed —
  // a flat painted wall must NOT be diluted.
  it('preserves a confident wall on a flat guide (no dilution)', () => {
    const w = 60
    const h = 40
    const guide = new Float32Array(w * h).fill(0.34) // uniform mid wall luma
    const alpha = new Float32Array(w * h).fill(1)
    const out = guidedFilterAlpha(guide, alpha, w, h)
    let min = 1
    for (const v of out) min = Math.min(min, v)
    expect(min).toBeGreaterThan(0.98)
  })

  // GATE 2: wall (bright) meets dark furniture (high contrast) → wall interior
  // stays painted, furniture interior clears, and the edge is carved.
  it('carves a high-contrast wall/furniture edge while keeping the wall', () => {
    const w = 80
    const h = 40
    const edge = 40
    const { guide, alpha } = verticalSplit(w, h, edge, 0.34, 0.02)
    const out = guidedFilterAlpha(guide, alpha, w, h)
    expect(at(out, w, 10, 20)).toBeGreaterThan(0.9) // deep wall painted
    expect(at(out, w, 70, 20)).toBeLessThan(0.1) // deep furniture clear
    // Boundary sharpened: alpha drops across a narrow band around the true edge.
    expect(at(out, w, edge - 3, 20)).toBeGreaterThan(at(out, w, edge + 3, 20))
  })

  // GATE 3: same-luminance seam (white wall vs white ceiling) — the guide has no
  // edge, so the matte must FALL BACK to the coarse mask, NOT erase the wall.
  it('does not erase the wall at a near-zero-contrast seam', () => {
    const w = 80
    const h = 40
    const { guide, alpha } = verticalSplit(w, h, 40, 0.845, 0.883) // 235 vs 240 sRGB
    const out = guidedFilterAlpha(guide, alpha, w, h)
    expect(at(out, w, 10, 20)).toBeGreaterThan(0.85) // wall interior survives
    expect(at(out, w, 20, 20)).toBeGreaterThan(0.85)
  })

  // GATE 4: segmentation missed a bright object entirely (coarse alpha 1 over a
  // lamp) — the matte must NOT punch blotchy holes in the surrounding wall.
  it('leaves the wall intact when coarse alpha covers a missed bright object', () => {
    const w = 80
    const h = 60
    const guide = new Float32Array(w * h).fill(0.3)
    const alpha = new Float32Array(w * h).fill(1)
    // A bright blob the segmentation failed to exclude.
    for (let y = 20; y < 40; y++) for (let x = 30; x < 50; x++) guide[y * w + x] = 0.95
    const out = guidedFilterAlpha(guide, alpha, w, h)
    let min = 1
    for (const v of out) min = Math.min(min, v)
    expect(min).toBeGreaterThan(0.85) // no holes anywhere, incl. around the blob
  })

  it('clamps output to [0,1]', () => {
    const w = 40
    const h = 30
    const { guide, alpha } = verticalSplit(w, h, 20, 0.9, 0.05)
    const out = guidedFilterAlpha(guide, alpha, w, h)
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
