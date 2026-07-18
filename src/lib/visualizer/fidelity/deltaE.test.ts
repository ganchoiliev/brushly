import { describe, expect, it } from 'vitest'
import { deltaE00, hexToLab, rgbToLab, type Lab } from './deltaE'

/* CIEDE2000 reference pairs from Sharma, Wu & Dalal (2005), "The CIEDE2000
   Color-Difference Formula: Implementation Notes, Supplementary Test Data, and
   Mathematical Observations" (Table 1). Lab inputs + expected dE00 are quoted to
   4 dp; a correct implementation reproduces them to well within 1e-4. The subset
   below deliberately spans the tricky branches: hue near 270° (the a'/G chroma
   adjustment + atan2 quadrants) and mid-gamut colours that exercise the T, ΔΘ
   and R_T rotation terms. */
const SHARMA: Array<{ a: Lab; b: Lab; dE: number }> = [
  { a: [50.0, 2.6772, -79.7751], b: [50.0, 0.0, -82.7485], dE: 2.0425 },
  { a: [50.0, 3.1571, -77.2803], b: [50.0, 0.0, -82.7485], dE: 2.8615 },
  { a: [50.0, 2.8361, -74.02], b: [50.0, 0.0, -82.7485], dE: 3.4412 },
  { a: [60.2574, -34.0099, 36.2677], b: [60.4626, -34.1751, 39.4387], dE: 1.2644 },
  { a: [63.0109, -31.0961, -5.8663], b: [62.8187, -29.7946, -4.0864], dE: 1.263 },
  { a: [35.0831, -44.1164, 3.7933], b: [35.0232, -40.0716, 1.5901], dE: 1.8645 },
  { a: [22.7233, 20.0904, -46.694], b: [23.0331, 14.973, -42.5619], dE: 2.0373 },
]

describe('deltaE00 (CIEDE2000)', () => {
  it('matches published Sharma et al. reference pairs to 1e-4', () => {
    for (const { a, b, dE } of SHARMA) {
      expect(deltaE00(a, b)).toBeCloseTo(dE, 4)
    }
  })

  it('is symmetric — deltaE00(a,b) === deltaE00(b,a)', () => {
    for (const { a, b } of SHARMA) {
      expect(deltaE00(a, b)).toBeCloseTo(deltaE00(b, a), 10)
    }
  })

  it('is zero for identical colours', () => {
    for (const { a } of SHARMA) {
      expect(deltaE00(a, a)).toBe(0)
    }
    expect(deltaE00([50, 10, -20], [50, 10, -20])).toBe(0)
  })
})

describe('hexToLab / rgbToLab (sRGB D65)', () => {
  it('maps black to L*=0', () => {
    const [L, a, b] = hexToLab('#000000')
    expect(L).toBeCloseTo(0, 6)
    expect(a).toBeCloseTo(0, 6)
    expect(b).toBeCloseTo(0, 6)
  })

  it('maps white to L*≈100, neutral a*/b*', () => {
    const [L, a, b] = hexToLab('#FFFFFF')
    expect(L).toBeCloseTo(100, 3)
    expect(a).toBeCloseTo(0, 2)
    expect(b).toBeCloseTo(0, 2)
  })

  it('mid-grey #808080 is achromatic with L* ≈ 53.6', () => {
    const [L, a, b] = hexToLab('#808080')
    expect(L).toBeCloseTo(53.585, 1)
    expect(a).toBeCloseTo(0, 2)
    expect(b).toBeCloseTo(0, 2)
  })

  it('hexToLab and rgbToLab agree', () => {
    expect(hexToLab('#313E43')).toEqual(rgbToLab(0x31, 0x3e, 0x43))
  })

  it('a strong blue (#313E43, Hague Blue) has negative b* (bluish)', () => {
    const [, , b] = hexToLab('#313E43')
    expect(b).toBeLessThan(0)
  })
})
