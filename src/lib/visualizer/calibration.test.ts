import { describe, expect, it } from 'vitest'
import { extractWallCalibration, wallReferenceLuminance } from './calibration'
import { linearToSrgb, relativeLuminance, srgbToLinear } from './liveMath'

// Build before/after frames the way a luminance-transfer repaint works:
// before = grey wall with a vertical luma gradient; after = albedo × shading,
// where shading = beforeLuma / wallAvg. extractWallCalibration should invert
// this and recover `albedo`.
function makeScene(w: number, h: number, albedo: [number, number, number]) {
  const before = new Uint8ClampedArray(w * h * 4)
  const after = new Uint8ClampedArray(w * h * 4)
  // Grey gradient 80..200 down the rows.
  const greyLin: number[] = []
  for (let y = 0; y < h; y++) {
    const v = Math.round(80 + (120 * y) / (h - 1))
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4
      before[p] = before[p + 1] = before[p + 2] = v
      before[p + 3] = 255
    }
    greyLin.push(srgbToLinear(v))
  }
  // wallAvg = median of the row luminances (all rows equally weighted here).
  const sorted = [...greyLin].sort((a, b) => a - b)
  const wallAvg = sorted[(sorted.length - 1) >> 1]
  const [ar, ag, ab] = albedo.map((c) => srgbToLinear(c))
  for (let y = 0; y < h; y++) {
    const shading = srgbToLinear(before[y * w * 4]) / wallAvg
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4
      after[p] = linearToSrgb(ar * shading)
      after[p + 1] = linearToSrgb(ag * shading)
      after[p + 2] = linearToSrgb(ab * shading)
      after[p + 3] = 255
    }
  }
  return { before, after }
}

describe('wallReferenceLuminance', () => {
  it('returns the median wall luminance over confident pixels', () => {
    const w = 4
    const h = 1
    const px = new Uint8ClampedArray(w * h * 4)
    ;[40, 120, 200, 255].forEach((v, i) => {
      px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v
      px[i * 4 + 3] = 255
    })
    const alpha = new Float32Array([1, 1, 1, 1])
    const lum = wallReferenceLuminance(px, w, h, alpha)!
    const expected =
      (relativeLuminance(srgbToLinear(120), srgbToLinear(120), srgbToLinear(120)) +
        relativeLuminance(srgbToLinear(200), srgbToLinear(200), srgbToLinear(200))) /
      2
    expect(lum).toBeCloseTo(expected, 4)
  })

  it('returns null under ~2% coverage', () => {
    const px = new Uint8ClampedArray(64 * 4)
    const alpha = new Float32Array(64)
    alpha[0] = 1 // 1/64 ≈ 1.6%
    expect(wallReferenceLuminance(px, 64, 1, alpha)).toBeNull()
  })
})

describe('extractWallCalibration', () => {
  it('recovers the paint albedo from a gradient-lit wall (illumination divided out)', () => {
    const w = 16
    const h = 16
    const albedo: [number, number, number] = [180, 90, 70]
    const { before, after } = makeScene(w, h, albedo)
    const alpha = new Float32Array(w * h).fill(1)
    const cal = extractWallCalibration(before, after, w, h, alpha)!
    expect(cal).not.toBeNull()
    // ≤6 LSB (~2%): a harsh 80→200 synthetic gradient amplifies byte-quantisation
    // at the darkest rows (small shading → larger divide). Real walls are gentler.
    expect(Math.abs(cal.paint[0] - albedo[0])).toBeLessThanOrEqual(6)
    expect(Math.abs(cal.paint[1] - albedo[1])).toBeLessThanOrEqual(6)
    expect(Math.abs(cal.paint[2] - albedo[2])).toBeLessThanOrEqual(6)
    expect(cal.coverage).toBeCloseTo(1, 5)
  })

  it('recovers albedo on a flat (uniform) wall too', () => {
    const w = 8
    const h = 8
    const albedo: [number, number, number] = [60, 110, 150]
    // Uniform before → shading ≈ 1 everywhere → after ≈ albedo.
    const before = new Uint8ClampedArray(w * h * 4).fill(255)
    for (let i = 0; i < w * h; i++) {
      before[i * 4] = before[i * 4 + 1] = before[i * 4 + 2] = 150
    }
    const after = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      after[i * 4] = albedo[0]
      after[i * 4 + 1] = albedo[1]
      after[i * 4 + 2] = albedo[2]
      after[i * 4 + 3] = 255
    }
    const alpha = new Float32Array(w * h).fill(1)
    const cal = extractWallCalibration(before, after, w, h, alpha)!
    expect(Math.abs(cal.paint[0] - albedo[0])).toBeLessThanOrEqual(2)
    expect(Math.abs(cal.paint[1] - albedo[1])).toBeLessThanOrEqual(2)
    expect(Math.abs(cal.paint[2] - albedo[2])).toBeLessThanOrEqual(2)
  })

  it('returns null when the wall mask covers almost nothing', () => {
    const w = 8
    const h = 8
    const { before, after } = makeScene(w, h, [120, 120, 120])
    const alpha = new Float32Array(w * h) // all zero
    expect(extractWallCalibration(before, after, w, h, alpha)).toBeNull()
  })

  it('is not thrown off by a specular highlight (median is robust)', () => {
    const w = 16
    const h = 16
    const albedo: [number, number, number] = [150, 140, 120]
    const { before, after } = makeScene(w, h, albedo)
    // Blow out a few pixels to near-white (a lamp glint on the wall).
    for (let i = 0; i < 8; i++) {
      const p = i * 4
      after[p] = after[p + 1] = after[p + 2] = 255
    }
    const alpha = new Float32Array(w * h).fill(1)
    const cal = extractWallCalibration(before, after, w, h, alpha)!
    // Median absorbs the 8 blown pixels out of 256 — albedo stays close.
    expect(Math.abs(cal.paint[0] - albedo[0])).toBeLessThanOrEqual(6)
    expect(Math.abs(cal.paint[2] - albedo[2])).toBeLessThanOrEqual(6)
  })
})
