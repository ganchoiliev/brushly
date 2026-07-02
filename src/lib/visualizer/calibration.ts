// Wall calibration for the native AR "calibrated real-time" shader.
//
// The photoreal cloud render is a single 2D image from one viewpoint — we can't
// project it onto the moving wall without it reading as wallpaper and ghosting
// over furniture (see the feasibility research). What IS viewpoint-independent
// is the paint's ACHIEVED ALBEDO: the colour the render actually produced on
// this wall under this light, with the illumination divided back out. Feed that
// (plus the wall's reference luminance and the finish) to a live shader that
// re-applies the room's real-time shading from the camera each frame, and the
// moving preview matches the render's colour rendition instead of a generic
// swatch tint — free motion, native occlusion, no baked wallpaper.
//
// We deliberately do NOT export a baked lighting map: it would be locked to the
// capture viewpoint and wrong from anywhere else. The live camera supplies the
// shading. Pure + unit-tested; no DOM, no deps beyond liveMath primitives.

import { linearToSrgb, relativeLuminance, srgbToLinear } from './liveMath'

/** Alpha at/above which a pixel is treated as confidently wall (not bleed). */
const WALL_CONF = 0.6
/** Floor on the illumination term so dark/shadowed wall pixels don't blow up
 *  the albedo estimate when dividing the render by the original shading. */
const SHADING_FLOOR = 0.18

export interface WallCalibration {
  /** Achieved paint albedo as sRGB 0-255 — the render's colour, delit. */
  paint: [number, number, number]
  /** Reference wall luminance (linear) of the ORIGINAL wall at capture time. */
  wallLum: number
  /** Fraction of pixels that were confidently wall (estimate confidence). */
  coverage: number
}

function median(values: number[]): number {
  // In-place sort is fine; callers pass throwaway arrays.
  values.sort((a, b) => a - b)
  const n = values.length
  if (n === 0) return 0
  return n % 2 ? values[(n - 1) >> 1] : (values[n / 2 - 1] + values[n / 2]) / 2
}

/**
 * Median linear luminance over confidently-masked wall pixels. `alpha` must be
 * at the same WxH as the image. Returns null when coverage is too low to trust.
 */
export function wallReferenceLuminance(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  alpha: Float32Array,
): number | null {
  const lums: number[] = []
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] < WALL_CONF) continue
    const p = i * 4
    lums.push(
      relativeLuminance(srgbToLinear(rgba[p]), srgbToLinear(rgba[p + 1]), srgbToLinear(rgba[p + 2])),
    )
  }
  if (lums.length < alpha.length * 0.02) return null
  return median(lums)
}

/**
 * Recovers the paint albedo the render produced, illumination divided out, from
 * the before (original) and after (render) frames plus the wall alpha (all WxH).
 *
 * Model: the render repaints the wall as albedo × shading, where shading is the
 * original wall's own luminance relative to the wall average. So
 * albedo(x) ≈ after_linear(x) / shading(x); the per-channel MEDIAN over wall
 * pixels is a robust albedo (highlights/shadows fall in the tails). Returns null
 * when the mask covers too little to be reliable — caller falls back to the raw
 * chosen swatch colour.
 */
export function extractWallCalibration(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  w: number,
  h: number,
  alpha: Float32Array,
): WallCalibration | null {
  const wallLum = wallReferenceLuminance(before, w, h, alpha)
  if (wallLum === null) return null
  const denom = Math.max(wallLum, 0.02)

  const ar: number[] = []
  const ag: number[] = []
  const ab: number[] = []
  let confident = 0
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] < WALL_CONF) continue
    confident++
    const p = i * 4
    const bLum = relativeLuminance(
      srgbToLinear(before[p]),
      srgbToLinear(before[p + 1]),
      srgbToLinear(before[p + 2]),
    )
    const shading = Math.max(bLum / denom, SHADING_FLOOR)
    ar.push(srgbToLinear(after[p]) / shading)
    ag.push(srgbToLinear(after[p + 1]) / shading)
    ab.push(srgbToLinear(after[p + 2]) / shading)
  }
  if (confident < alpha.length * 0.02) return null

  return {
    paint: [linearToSrgb(median(ar)), linearToSrgb(median(ag)), linearToSrgb(median(ab))],
    wallLum,
    coverage: confident / alpha.length,
  }
}
