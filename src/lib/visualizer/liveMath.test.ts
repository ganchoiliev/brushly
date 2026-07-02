import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TUNING,
  adaptInputSize,
  hexToRgb,
  linearToSrgb,
  maskedMedianLuminance,
  motionBlend,
  motionScore,
  recolorPixels,
  relativeLuminance,
  smoothMargin,
  specPreserveForFinish,
  srgbToLinear,
  upsampleAlphaBilinear,
} from './liveMath'

const rgbaFill = (w: number, h: number, [r, g, b]: [number, number, number]) => {
  const px = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = r
    px[i * 4 + 1] = g
    px[i * 4 + 2] = b
    px[i * 4 + 3] = 255
  }
  return px
}

describe('colour primitives', () => {
  it('hexToRgb parses channels and tolerates malformed input', () => {
    expect(hexToRgb('#C8A96E')).toEqual([200, 169, 110])
    expect(hexToRgb('#zzzzzz')).toEqual([0, 0, 0])
  })

  it('srgb↔linear round-trips within 1/255', () => {
    for (const v of [0, 13, 127, 200, 255]) {
      expect(Math.abs(linearToSrgb(srgbToLinear(v)) - v)).toBeLessThanOrEqual(1)
    }
  })

  it('relativeLuminance weights green heaviest', () => {
    expect(relativeLuminance(0, 1, 0)).toBeGreaterThan(relativeLuminance(1, 0, 0))
    expect(relativeLuminance(1, 0, 0)).toBeGreaterThan(relativeLuminance(0, 0, 1))
    expect(relativeLuminance(1, 1, 1)).toBeCloseTo(1, 5)
  })
})

describe('smoothMargin', () => {
  it('feathers the margin through a sigmoid on a fresh buffer', () => {
    const s = smoothMargin(new Float32Array([10, 0, -10]), 3, 1, null, 1.5, 0.5)
    expect(s.data[0]).toBeGreaterThan(0.99)
    expect(s.data[1]).toBeCloseTo(0.5, 5)
    expect(s.data[2]).toBeLessThan(0.01)
  })

  it('EMA-blends into the previous mask and reuses its buffer', () => {
    const prev = smoothMargin(new Float32Array([10]), 1, 1, null, 1.5, 0.5)
    const next = smoothMargin(new Float32Array([-10]), 1, 1, prev, 1.5, 0.5)
    expect(next.data).toBe(prev.data)
    // was ~1, target ~0, blend 0.5 → ~0.5
    expect(next.data[0]).toBeCloseTo(0.5, 2)
  })

  it('resets (no EMA) when dimensions change', () => {
    const prev = smoothMargin(new Float32Array([10]), 1, 1, null, 1.5, 0.5)
    const next = smoothMargin(new Float32Array([-10, -10]), 2, 1, prev, 1.5, 0.5)
    expect(next.data).toHaveLength(2)
    expect(next.data[0]).toBeLessThan(0.01) // fresh, not blended toward prev's 1
  })
})

describe('motion', () => {
  it('scores 0 on the first frame and on identical frames', () => {
    const luma = new Float32Array(1024)
    const frame = rgbaFill(64, 64, [100, 100, 100])
    expect(motionScore(frame, 64, 64, 8, luma, false)).toBe(0)
    expect(motionScore(frame, 64, 64, 8, luma, true)).toBeCloseTo(0, 6)
  })

  it('scores the luma delta between frames', () => {
    const luma = new Float32Array(1024)
    motionScore(rgbaFill(64, 64, [0, 0, 0]), 64, 64, 8, luma, false)
    const score = motionScore(rgbaFill(64, 64, [255, 255, 255]), 64, 64, 8, luma, true)
    expect(score).toBeCloseTo(1, 5)
  })

  it('motionBlend ramps from base to max between the thresholds', () => {
    expect(motionBlend(0, DEFAULT_TUNING)).toBe(DEFAULT_TUNING.temporalBase)
    expect(motionBlend(0.005, DEFAULT_TUNING)).toBe(DEFAULT_TUNING.temporalBase)
    expect(motionBlend(0.2, DEFAULT_TUNING)).toBe(DEFAULT_TUNING.temporalMax)
    const mid = motionBlend(0.035, DEFAULT_TUNING)
    expect(mid).toBeGreaterThan(DEFAULT_TUNING.temporalBase)
    expect(mid).toBeLessThan(DEFAULT_TUNING.temporalMax)
  })
})

describe('maskedMedianLuminance', () => {
  it('measures only where the mask is on', () => {
    // Left half white, right half black; mask covers only the left half.
    const w = 8
    const h = 4
    const px = rgbaFill(w, h, [0, 0, 0])
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w / 2; x++) {
        const p = (y * w + x) * 4
        px[p] = px[p + 1] = px[p + 2] = 255
      }
    const alpha = new Float32Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) alpha[y * w + x] = 1
    expect(maskedMedianLuminance(px, w, h, alpha, w, h)).toBeCloseTo(1, 3)
  })

  it('returns null under ~2% coverage', () => {
    const px = rgbaFill(8, 8, [255, 255, 255])
    const alpha = new Float32Array(64)
    alpha[0] = 1 // 1/64 ≈ 1.6%
    expect(maskedMedianLuminance(px, 8, 8, alpha, 8, 8)).toBeNull()
  })

  it('is not dragged down by soft bleed onto dark furniture', () => {
    // Bright wall confidently masked; dark furniture only bleed-masked at
    // partial alpha. The reference must stay at the wall's brightness — a
    // mean would sink and wash the recolour out.
    const w = 10
    const px = rgbaFill(w, 1, [230, 230, 230])
    for (let x = 6; x < w; x++) {
      const p = x * 4
      px[p] = px[p + 1] = px[p + 2] = 20 // dark cabinets
    }
    const alpha = new Float32Array(w).fill(1)
    for (let x = 6; x < w; x++) alpha[x] = 0.55 // bleed — below confidence cut
    const wallY = relativeLuminance(srgbToLinear(230), srgbToLinear(230), srgbToLinear(230))
    expect(maskedMedianLuminance(px, w, 1, alpha, w, 1)).toBeCloseTo(wallY, 3)
  })
})

describe('recolorPixels', () => {
  const fullAlpha = (n: number) => new Float32Array(n).fill(1)

  it('paints a uniformly lit wall to the exact paint colour', () => {
    // Wall pixels at the wall's own average luminance → shading = 1 → paint.
    const px = rgbaFill(2, 2, [180, 180, 180])
    const wallLum = relativeLuminance(
      srgbToLinear(180),
      srgbToLinear(180),
      srgbToLinear(180),
    )
    recolorPixels(px, 2, 2, fullAlpha(4), [36, 38, 42], wallLum)
    expect(Math.abs(px[0] - 36)).toBeLessThanOrEqual(1)
    expect(Math.abs(px[1] - 38)).toBeLessThanOrEqual(1)
    expect(Math.abs(px[2] - 42)).toBeLessThanOrEqual(1)
  })

  it('keeps shading: darker wall pixels stay darker after recolour', () => {
    const px = new Uint8ClampedArray(2 * 1 * 4)
    px.set([200, 200, 200, 255], 0) // lit
    px.set([100, 100, 100, 255], 4) // shadow
    const wallLum = relativeLuminance(srgbToLinear(200), srgbToLinear(200), srgbToLinear(200))
    recolorPixels(px, 2, 1, fullAlpha(2), [108, 114, 103], wallLum)
    const litY = relativeLuminance(srgbToLinear(px[0]), srgbToLinear(px[1]), srgbToLinear(px[2]))
    const shadY = relativeLuminance(srgbToLinear(px[4]), srgbToLinear(px[5]), srgbToLinear(px[6]))
    expect(shadY).toBeLessThan(litY * 0.6)
  })

  it('leaves non-wall pixels untouched and respects tintStrength 0', () => {
    const px = rgbaFill(1, 1, [50, 60, 70])
    recolorPixels(px, 1, 1, new Float32Array([0]), [255, 0, 0], 0.5)
    expect([px[0], px[1], px[2]]).toEqual([50, 60, 70])
    const px2 = rgbaFill(1, 1, [50, 60, 70])
    recolorPixels(px2, 1, 1, fullAlpha(1), [255, 0, 0], 0.5, { tintStrength: 0 })
    expect([px2[0], px2[1], px2[2]]).toEqual([50, 60, 70])
  })

  it('washes saturated paints toward neutral in overbright areas instead of going neon', () => {
    // A bright patch (far above the wall average) painted Red Earth: diffuse
    // is capped, the excess arrives as neutral white — so green/blue must
    // rise substantially instead of red pegging while the others stay low.
    const px = rgbaFill(1, 1, [240, 240, 240])
    recolorPixels(px, 1, 1, fullAlpha(1), [176, 106, 80], 0.15)
    expect(px[1]).toBeGreaterThan(200) // green washed up (was ~170 under pure scaling)
    expect(px[0] - px[2]).toBeLessThan(60) // channel spread collapsed — no neon
  })

  it('does not leave a pale ghost when a dark paint covers a blown-out patch', () => {
    // A near-white overexposed wall patch painted near-black. The old fixed
    // neutral wash left this as a mid-grey ghost of the original wall (the
    // reported "white spot"); a dark colour must absorb the excess light.
    const px = rgbaFill(1, 1, [242, 242, 242])
    recolorPixels(px, 1, 1, fullAlpha(1), [26, 26, 26], 0.55, { specPreserve: 0 })
    const y = relativeLuminance(srgbToLinear(px[0]), srgbToLinear(px[1]), srgbToLinear(px[2]))
    expect(y).toBeLessThan(0.08)
  })

  it('still washes a saturated mid-tone paint (anti-neon unaffected by the dark fix)', () => {
    // Terracotta sits above the paint-luminance window, so a bright patch must
    // keep its neutral wash — the dark-paint fix must not dim mid-tones.
    const px = rgbaFill(1, 1, [240, 240, 240])
    recolorPixels(px, 1, 1, fullAlpha(1), [181, 98, 63], 0.15)
    expect(px[1]).toBeGreaterThan(180) // green still washed up, not pegged low
    expect(px[0] - px[2]).toBeLessThan(70) // channels stay close — no neon
  })

  it('gloss finishes keep more of a specular highlight than matte', () => {
    const bright: [number, number, number] = [250, 250, 250]
    const wallLum = 0.2 // highlight is far above the wall average
    const matte = rgbaFill(1, 1, bright)
    const gloss = rgbaFill(1, 1, bright)
    recolorPixels(matte, 1, 1, fullAlpha(1), [40, 40, 40], wallLum, { specPreserve: 0 })
    recolorPixels(gloss, 1, 1, fullAlpha(1), [40, 40, 40], wallLum, { specPreserve: 1 })
    expect(gloss[0]).toBeGreaterThan(matte[0])
  })
})

describe('upsampleAlphaBilinear', () => {
  it('interpolates smoothly and preserves constants', () => {
    const flat = upsampleAlphaBilinear(new Float32Array([0.7, 0.7, 0.7, 0.7]), 2, 2, 5, 5)
    for (const v of flat) expect(v).toBeCloseTo(0.7, 5)
    const ramp = upsampleAlphaBilinear(new Float32Array([0, 1]), 2, 1, 4, 1)
    expect(ramp[0]).toBeLessThan(ramp[1])
    expect(ramp[1]).toBeLessThan(ramp[2])
    expect(ramp[2]).toBeLessThan(ramp[3])
  })
})

describe('adaptInputSize', () => {
  it('upgrades when fast, downgrades when slow, holds in between', () => {
    expect(adaptInputSize(256, 40)).toBe(320)
    expect(adaptInputSize(256, 80)).toBe(256)
    expect(adaptInputSize(320, 130)).toBe(256)
    expect(adaptInputSize(320, 80)).toBe(320) // hysteresis: no flap back down
  })
})

describe('specPreserveForFinish', () => {
  it('maps known finishes and falls back for unknown ones', () => {
    expect(specPreserveForFinish('Gloss')).toBeGreaterThan(specPreserveForFinish('Eggshell'))
    expect(specPreserveForFinish('Matte emulsion')).toBe(0)
    expect(specPreserveForFinish('Grasscloth')).toBeGreaterThan(0)
  })
})
