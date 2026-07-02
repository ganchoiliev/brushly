// Pure math for the live AR wall preview: temporal smoothing, colour
// transfer, luminance statistics and adaptive-quality control. Everything
// here is side-effect free (or mutates only buffers passed in) and
// unit-tested; useLiveWallPreview, the WebGL compositor and the instant
// capture preview are thin consumers.
//
// Colour model: the recolour is a luminance transfer, not a hue shift. The
// wall keeps its own shading (per-pixel luminance relative to the wall's
// average) and the paint supplies the reflectance — so Off-Black on a white
// wall actually reads black, and shadows/texture survive. All blending runs
// in approximately-linear light (gamma 2.2) because averaging sRGB values
// darkens midtones.

export interface LiveTuning {
  /** Logit width of the soft mask edge (sigmoid feather). */
  feather: number
  /** EMA weight of the newest mask when the camera is still. */
  temporalBase: number
  /** EMA weight under strong motion (snappier, kills ghost trails). */
  temporalMax: number
  /** Overall strength of the recolour, 0..1. */
  tintStrength: number
  /** Joint-bilateral range sigma, in linear-luma units (WebGL path only). */
  edgeSigma: number
}

export const DEFAULT_TUNING: LiveTuning = {
  // 0.9, not the original 1.5: real ADE20K wall margins sit around +2..3
  // logits, and sigmoid(2.5/1.5)=0.84 left 16% of the original wall bleeding
  // through everywhere — paint looked diluted (terracotta read as salmon).
  // Edge smoothness is the JBU/bilinear upsample's job, not the feather's.
  feather: 0.9,
  temporalBase: 0.35,
  temporalMax: 0.85,
  tintStrength: 1,
  edgeSigma: 0.08,
}

/**
 * Confidence gain applied to the mask alpha at consumption (shader + CPU):
 * pushes confidently-wall cells the last few percent to fully opaque paint
 * while leaving genuine edge feathering intact.
 */
export const ALPHA_GAIN = 1.06

/* ---------------- colour primitives ---------------- */

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) || 0,
    parseInt(hex.slice(3, 5), 16) || 0,
    parseInt(hex.slice(5, 7), 16) || 0,
  ]
}

/** sRGB channel 0-255 → linear 0-1 (pow-2.2 approximation). */
export function srgbToLinear(v: number): number {
  return Math.pow(v / 255, 2.2)
}

/** Linear 0-1 → sRGB channel 0-255, clamped. */
export function linearToSrgb(v: number): number {
  return Math.round(Math.pow(Math.min(1, Math.max(0, v)), 1 / 2.2) * 255)
}

/** Rec.709 luminance of linear RGB. */
export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/* ---------------- temporal smoothing ---------------- */

export interface SmoothedMask {
  /** Feathered wall alpha 0..1 at model-output resolution. */
  data: Float32Array
  w: number
  h: number
}

/**
 * Feathered alpha from the raw wall-vs-rest logit margin, EMA-blended into
 * `prev` (reused in place when dimensions match, else a fresh buffer).
 */
export function smoothMargin(
  margin: Float32Array,
  w: number,
  h: number,
  prev: SmoothedMask | null,
  feather: number,
  blend: number,
): SmoothedMask {
  let s = prev
  let fresh = false
  if (!s || s.w !== w || s.h !== h) {
    s = { data: new Float32Array(w * h), w, h }
    fresh = true
  }
  const data = s.data
  for (let i = 0; i < margin.length; i++) {
    const alpha = 1 / (1 + Math.exp(-margin[i] / feather))
    data[i] = fresh ? alpha : data[i] + (alpha - data[i]) * blend
  }
  return s
}

/* ---------------- motion ---------------- */

/**
 * Mean absolute luma difference (0..1) between two RGBA frames of identical
 * size, sampled on a stride grid. ~1k samples on the 256px grab frame — cheap
 * enough for every model pass. Copies the sampled lumas into `prevLuma`
 * (allocated by the caller, length ≥ the sample count) so the next call
 * compares against this frame.
 */
export function motionScore(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  stride: number,
  prevLuma: Float32Array,
  hasPrev: boolean,
): number {
  let sum = 0
  let n = 0
  for (let y = stride >> 1; y < h; y += stride) {
    for (let x = stride >> 1; x < w; x += stride) {
      const p = (y * w + x) * 4
      // Plain Rec.601 luma on gamma values — a relative measure, linearising
      // would cost pow() per sample for no behavioural difference.
      const luma = (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) / 255
      if (hasPrev) sum += Math.abs(luma - prevLuma[n])
      prevLuma[n] = luma
      n++
    }
  }
  return hasPrev && n > 0 ? sum / n : 0
}

/**
 * Maps a motion score to the temporal EMA weight: stable when still, snappy
 * under panning so the mask doesn't trail behind the wall.
 */
export function motionBlend(motion: number, tuning: LiveTuning): number {
  // < ~1% mean luma change is sensor noise; > ~6% is a deliberate pan.
  const t = smoothstep(0.01, 0.06, motion)
  return tuning.temporalBase + (tuning.temporalMax - tuning.temporalBase) * t
}

/* ---------------- luminance statistics ---------------- */

/**
 * Wall reference luminance: the alpha-weighted MEDIAN linear luminance over
 * confidently-masked cells, sampled at the alpha's (coarser) resolution.
 * Median over confident cells, not a mean over everything: the soft mask
 * always bleeds a little onto furniture at partial alpha, and on a light
 * wall with dark furniture a mean gets dragged down — which inflates the
 * per-pixel shading ratio and washes the whole wall out (salmon instead of
 * terracotta). Returns null when the mask covers almost nothing — the
 * caller should hold its previous estimate.
 */
export function maskedMedianLuminance(
  rgba: Uint8ClampedArray,
  pw: number,
  ph: number,
  alpha: Float32Array,
  aw: number,
  ah: number,
): number | null {
  const samples: { y: number; w: number }[] = []
  let weight = 0
  for (let y = 0; y < ah; y++) {
    const py = Math.min(ph - 1, Math.floor(((y + 0.5) * ph) / ah))
    for (let x = 0; x < aw; x++) {
      const a = alpha[y * aw + x]
      if (a < 0.6) continue // low-confidence cells are usually bleed, not wall
      const px = Math.min(pw - 1, Math.floor(((x + 0.5) * pw) / aw))
      const p = (py * pw + px) * 4
      samples.push({
        y: relativeLuminance(
          srgbToLinear(rgba[p]),
          srgbToLinear(rgba[p + 1]),
          srgbToLinear(rgba[p + 2]),
        ),
        w: a,
      })
      weight += a
    }
  }
  // Under ~2% coverage the estimate is dominated by misclassified pixels.
  if (weight < aw * ah * 0.02) return null
  samples.sort((s, t) => s.y - t.y)
  // 60th percentile, not the median: wall luminance distributions skew
  // bright (lit wall + darker corners), and anchoring slightly above centre
  // puts the TYPICAL lit wall pixel at shading ≈ 1 — i.e. exactly the swatch
  // colour — instead of rendering the whole wall ~20% over-bright.
  let cum = 0
  for (const s of samples) {
    cum += s.w
    if (cum >= weight * 0.6) return s.y
  }
  return samples[samples.length - 1].y
}

/* ---------------- recolour (CPU reference of the shader) ---------------- */

export interface RecolorOptions {
  /** 0..1 overall opacity of the recolour. */
  tintStrength?: number
  /** 0 matte .. 1 gloss: how much of the wall's specular peaks survive. */
  specPreserve?: number
}

/**
 * Luminance-transfer recolour, in place. `alpha` must be at the same
 * resolution as `rgba` (upsample first — see upsampleAlphaBilinear). This is
 * the exact math the WebGL fragment shader runs; keep the two in sync.
 */
export function recolorPixels(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  alpha: Float32Array,
  paint: [number, number, number],
  wallLum: number,
  opts: RecolorOptions = {},
): void {
  const tint = opts.tintStrength ?? 1
  const spec = opts.specPreserve ?? 0
  const pr = srgbToLinear(paint[0])
  const pg = srgbToLinear(paint[1])
  const pb = srgbToLinear(paint[2])
  const denom = Math.max(wallLum, 0.02)
  for (let i = 0; i < alpha.length; i++) {
    const a = Math.min(alpha[i] * ALPHA_GAIN, 1) * tint
    if (a < 0.004) continue
    const p = i * 4
    const lr = srgbToLinear(rgba[p])
    const lg = srgbToLinear(rgba[p + 1])
    const lb = srgbToLinear(rgba[p + 2])
    const y = relativeLuminance(lr, lg, lb)
    const shading = Math.min(y / denom, 2.5)
    // Diffuse reflection is capped by the paint's albedo: scaling chroma past
    // ~1.25× the wall average turns saturated paints (reds especially) neon.
    // Brightness beyond the cap is light washing over the surface — add it as
    // NEUTRAL white, which is how a sunlit patch on red paint actually looks.
    const diffuse = Math.min(shading, 1.25)
    const wash = (shading - diffuse) * 0.55
    // Specular preservation: luminance well above the wall average is a
    // highlight — glossier finishes keep more of it on top of the paint.
    const highlight = smoothstep(denom * 1.6, denom * 2.4, y) * spec * 0.35
    const rr = pr * diffuse + wash + highlight
    const rg = pg * diffuse + wash + highlight
    const rb = pb * diffuse + wash + highlight
    rgba[p] = linearToSrgb(lr + (rr - lr) * a)
    rgba[p + 1] = linearToSrgb(lg + (rg - lg) * a)
    rgba[p + 2] = linearToSrgb(lb + (rb - lb) * a)
  }
}

/** Bilinear upsample of a float alpha plane (instant-preview path). */
export function upsampleAlphaBilinear(
  src: Float32Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): Float32Array {
  const out = new Float32Array(dw * dh)
  const xRatio = sw / dw
  const yRatio = sh / dh
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(Math.max((y + 0.5) * yRatio - 0.5, 0), sh - 1)
    const y0 = Math.floor(sy)
    const y1 = Math.min(sh - 1, y0 + 1)
    const fy = sy - y0
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(Math.max((x + 0.5) * xRatio - 0.5, 0), sw - 1)
      const x0 = Math.floor(sx)
      const x1 = Math.min(sw - 1, x0 + 1)
      const fx = sx - x0
      const top = src[y0 * sw + x0] * (1 - fx) + src[y0 * sw + x1] * fx
      const bot = src[y1 * sw + x0] * (1 - fx) + src[y1 * sw + x1] * fx
      out[y * dw + x] = top * (1 - fy) + bot * fy
    }
  }
  return out
}

/* ---------------- adaptive quality ---------------- */

export const LIVE_INPUT_SIZES = [256, 320] as const

/**
 * Steps the live model input size against the measured per-pass time, with
 * hysteresis so it doesn't flap. 320 (40×40 mask) is a visibly sharper edge;
 * only worth it while the loop stays comfortably real-time.
 */
export function adaptInputSize(currentSize: number, avgMs: number): number {
  if (currentSize <= 256 && avgMs < 55) return 320
  if (currentSize >= 320 && avgMs > 110) return 256
  return currentSize
}

/* ---------------- finish → gloss response ---------------- */

const FINISH_SPEC: Record<string, number> = {
  'Matte emulsion': 0,
  Eggshell: 0.2,
  Satinwood: 0.5,
  Gloss: 0.85,
  'Smooth masonry': 0.1,
  'Textured masonry': 0.05,
  'Satin trim': 0.5,
  'Gloss trim': 0.85,
}

/** How much specular highlight a finish keeps in the live preview. */
export function specPreserveForFinish(finish: string): number {
  return FINISH_SPEC[finish] ?? 0.15
}
