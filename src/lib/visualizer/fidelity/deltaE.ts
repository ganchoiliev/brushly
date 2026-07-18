// Colour math for the render-fidelity harness: sRGB → CIELAB and the CIEDE2000
// colour-difference metric. Pure, dependency-free, unit-tested.
//
// WHY CIEDE2000: paint fidelity is a PERCEPTUAL question ("does the painted
// wall look like Hague Blue?"), and Euclidean distance in RGB (or even in Lab)
// over-weights differences the eye barely notices. CIEDE2000 is the current CIE
// standard for perceived colour difference, so a deltaE00 of ~1 ≈ a just-
// noticeable difference. The harness scores the rendered wall's deltaE00 to the
// target paint hex.
//
// COLOUR SPACE CHOICE (documented deliberately — see the harness README):
//   • rgbToLab / hexToLab use the STANDARD sRGB transfer function (IEC 61966-2-1,
//     the piecewise curve — NOT a plain 2.2 power) → linear RGB → CIEXYZ (sRGB/
//     D65 primaries) → CIELAB (D65 white). This makes hexToLab match any
//     reference sRGB→Lab converter, so the harness's absolute numbers are
//     externally verifiable.
//   • medianLabOfMaskedPixels borrows calibration.ts's DISCIPLINE — a per-channel
//     MEDIAN taken in LINEAR light (highlights/shadows fall in the tails, so the
//     median is a robust reflectance for a shaded wall) rather than a naive mean
//     in gamma-encoded sRGB. It deviates from calibration.ts only in using the
//     exact IEC curve instead of that module's pow-2.2 approximation, so the
//     whole pipeline is ONE consistent colour space. Because BOTH the target and
//     the measured colour pass through the identical conversion, the deltaE is a
//     consistent, colorimetrically-standard comparison either way.

export type Lab = [number, number, number]
export type Rgb = [number, number, number]

/* ---------------- sRGB ⇄ linear (IEC 61966-2-1) ---------------- */

/** One sRGB channel 0–255 → linear 0–1 (exact IEC piecewise curve). */
export function srgbToLinear(c255: number): number {
  const c = c255 / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** One linear channel 0–1 → sRGB 0–255 integer (exact IEC piecewise curve). */
export function linearToSrgb(c: number): number {
  const x = Math.min(1, Math.max(0, c))
  const s = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
  return Math.round(s * 255)
}

/* ---------------- linear RGB → XYZ → Lab (D65) ---------------- */

// D65 reference white in the same 0–1 XYZ scale the matrix below produces.
const Xn = 0.95047
const Yn = 1.0
const Zn = 1.08883

// CIE standard constants (exact rationals) for the Lab f() nonlinearity.
const EPS = 216 / 24389 // (6/29)^3
const KAPPA = 24389 / 27 // (29/3)^3

function labF(t: number): number {
  return t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116
}

/** Linear RGB (0–1) → CIELAB (D65), via the sRGB/D65 primaries matrix. */
export function linearRgbToLab(r: number, g: number, b: number): Lab {
  const X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
  const Y = r * 0.2126729 + g * 0.7151522 + b * 0.072175
  const Z = r * 0.0193339 + g * 0.119192 + b * 0.9503041
  const fx = labF(X / Xn)
  const fy = labF(Y / Yn)
  const fz = labF(Z / Zn)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** sRGB channels 0–255 → CIELAB (D65). */
export function rgbToLab(r: number, g: number, b: number): Lab {
  return linearRgbToLab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b))
}

/** '#RRGGBB' → CIELAB (D65). */
export function hexToLab(hex: string): Lab {
  const r = parseInt(hex.slice(1, 3), 16) || 0
  const g = parseInt(hex.slice(3, 5), 16) || 0
  const b = parseInt(hex.slice(5, 7), 16) || 0
  return rgbToLab(r, g, b)
}

/* ---------------- CIEDE2000 ---------------- */

const DEG = Math.PI / 180
const POW25_7 = Math.pow(25, 7)

/** Hue angle of (a', b') in degrees, in [0, 360); 0 when both are ~0. */
function hueAngle(bp: number, ap: number): number {
  if (ap === 0 && bp === 0) return 0
  let h = Math.atan2(bp, ap) / DEG
  if (h < 0) h += 360
  return h
}

/**
 * CIEDE2000 colour difference between two CIELAB colours (kL=kC=kH=1).
 * Reference: Sharma, Wu & Dalal (2005), "The CIEDE2000 Color-Difference
 * Formula: Implementation Notes, Supplementary Test Data, and Mathematical
 * Observations." Symmetric: deltaE00(a,b) === deltaE00(b,a).
 */
export function deltaE00(lab1: Lab, lab2: Lab): number {
  const [L1, a1, b1] = lab1
  const [L2, a2, b2] = lab2

  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cbar = (C1 + C2) / 2
  const Cbar7 = Math.pow(Cbar, 7)
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + POW25_7)))

  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)
  const h1p = hueAngle(b1, a1p)
  const h2p = hueAngle(b2, a2p)

  const dLp = L2 - L1
  const dCp = C2p - C1p

  // Δh' — undefined (→0) when either chroma is 0; otherwise wrapped to (-180,180].
  let dhp = 0
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * DEG)

  const Lbar = (L1 + L2) / 2
  const Cbarp = (C1p + C2p) / 2

  // Mean hue h̄' — special wrapping, and undefined (→sum) when either chroma is 0.
  let hbarp: number
  if (C1p * C2p === 0) {
    hbarp = h1p + h2p
  } else if (Math.abs(h1p - h2p) <= 180) {
    hbarp = (h1p + h2p) / 2
  } else if (h1p + h2p < 360) {
    hbarp = (h1p + h2p + 360) / 2
  } else {
    hbarp = (h1p + h2p - 360) / 2
  }

  const T =
    1 -
    0.17 * Math.cos((hbarp - 30) * DEG) +
    0.24 * Math.cos(2 * hbarp * DEG) +
    0.32 * Math.cos((3 * hbarp + 6) * DEG) -
    0.2 * Math.cos((4 * hbarp - 63) * DEG)

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2))
  const Cbarp7 = Math.pow(Cbarp, 7)
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + POW25_7))
  const Sl = 1 + (0.015 * Math.pow(Lbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lbar - 50, 2))
  const Sc = 1 + 0.045 * Cbarp
  const Sh = 1 + 0.015 * Cbarp * T
  const Rt = -Math.sin(2 * dTheta * DEG) * Rc

  const lTerm = dLp / Sl
  const cTerm = dCp / Sc
  const hTerm = dHp / Sh
  return Math.sqrt(lTerm * lTerm + cTerm * cTerm + hTerm * hTerm + Rt * cTerm * hTerm)
}

/* ---------------- median-over-masked-pixels (calibration.ts discipline) ---------------- */

/** Median of `values` (mutates the array by sorting in place). 0 when empty. */
function median(values: number[]): number {
  values.sort((a, b) => a - b)
  const n = values.length
  if (n === 0) return 0
  return n % 2 ? values[(n - 1) >> 1] : (values[n / 2 - 1] + values[n / 2]) / 2
}

/**
 * Per-channel MEDIAN over the given RGBA pixel indices, computed in LINEAR light
 * then re-encoded to an sRGB 0–255 triple — a robust representative colour for a
 * shaded wall (mirrors extractWallCalibration's median-in-linear discipline).
 * `indices` are pixel indices (NOT byte offsets); each pixel is at `i*4` in
 * `rgba`. Throws on an empty selection so a mis-drawn mask fails loudly.
 */
export function medianRepresentativeRgb(rgba: Uint8ClampedArray, indices: number[]): Rgb {
  if (indices.length === 0) throw new Error('medianRepresentativeRgb: empty pixel selection')
  const r: number[] = []
  const g: number[] = []
  const b: number[] = []
  for (const idx of indices) {
    const p = idx * 4
    r.push(srgbToLinear(rgba[p]))
    g.push(srgbToLinear(rgba[p + 1]))
    b.push(srgbToLinear(rgba[p + 2]))
  }
  return [linearToSrgb(median(r)), linearToSrgb(median(g)), linearToSrgb(median(b))]
}

/** CIELAB of the median representative colour over the masked pixels. */
export function medianLabOfMaskedPixels(rgba: Uint8ClampedArray, indices: number[]): Lab {
  const [r, g, b] = medianRepresentativeRgb(rgba, indices)
  return rgbToLab(r, g, b)
}

/** '#RRGGBB' (uppercase) for an sRGB 0–255 triple. */
export function rgbToHex([r, g, b]: Rgb): string {
  const h = (v: number) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0').toUpperCase()
  return `#${h(r)}${h(g)}${h(b)}`
}
