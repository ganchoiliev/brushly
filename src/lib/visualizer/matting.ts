// On-device alpha matting for the FROZEN AR still.
//
// The live overlay recolours every frame from a coarse 32-40px segmentation
// mask upsampled with a tiny 3x3 kernel — which can never align the paint edge
// to a real lamp/frame/furniture boundary, so the original wall colour shows as
// a rim around objects. When the user freezes a frame we drop the realtime
// budget and refine that coarse alpha into a PIXEL-ACCURATE one with a guided
// filter (He, Sun & Tang 2013), using the frame's own luminance as the guide so
// the alpha edge snaps to real image edges.
//
// Everything here is pure and unit-tested; no dependencies.
//
// Correctness note (learned the hard way in design review): a naive
// variance-gate that suppresses alpha in flat regions is WRONG for this domain —
// a painted wall IS a flat, low-variance surface, so gating it dilutes the very
// paint we want. Instead the guided result is blended toward the coarse mask by
// an EDGE CONFIDENCE that rises with local guide variance: flat wall and
// same-tone wall/ceiling seams keep the honest coarse alpha (no dropout), and
// only genuine high-contrast edges adopt the sharpened matte.

export interface GuidedMatteOptions {
  /** Guided-filter window radius in FULL-RES pixels. */
  r?: number
  /** Regularisation (edge/flat trade-off), linear-luma^2 units. */
  eps?: number
  /** Guide/alpha subsample factor for the fast path (He 2015). */
  subsample?: number
  /**
   * Edge-confidence ramp on local guide variance (linear-luma^2): below `varLo`
   * the region is flat (trust the coarse mask), above `varHi` it is a real edge
   * (trust the sharpened matte), smooth between.
   */
  varLo?: number
  varHi?: number
}

const DEFAULTS: Required<GuidedMatteOptions> = {
  r: 24,
  eps: 1e-3,
  subsample: 4,
  // A lightly-textured wall sits around 5e-5 linear-luma variance; a wall/object
  // luminance edge is 1e-2+. This window keeps flat wall and near-zero-contrast
  // seams on the coarse mask while letting real edges snap.
  varLo: 4e-4,
  varHi: 4e-3,
}

function smoothstep(a: number, b: number, x: number): number {
  if (b <= a) return x >= b ? 1 : 0
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Per-pixel linear luminance (pow-2.2, Rec.709 — liveMath's space) 0..1. */
export function luminanceGuide(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h)
  for (let i = 0; i < g.length; i++) {
    const p = i * 4
    const r = Math.pow(rgba[p] / 255, 2.2)
    const gg = Math.pow(rgba[p + 1] / 255, 2.2)
    const b = Math.pow(rgba[p + 2] / 255, 2.2)
    g[i] = 0.2126 * r + 0.7152 * gg + 0.0722 * b
  }
  return g
}

/**
 * O(1)-per-pixel box (mean) filter via a Float64 integral image. Window is
 * (2r+1)^2 clamped at borders — smaller near edges but correctly normalised (no
 * darkening). Pure: returns a new array.
 */
export function boxFilter(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const W = w + 1
  const ii = new Float64Array(W * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    const o = (y + 1) * W
    const po = y * W
    for (let x = 0; x < w; x++) {
      rowSum += src[y * w + x]
      ii[o + x + 1] = ii[po + x + 1] + rowSum
    }
  }
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(h - 1, y + r)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(w - 1, x + r)
      const a = ii[y0 * W + x0]
      const b = ii[y0 * W + (x1 + 1)]
      const c = ii[(y1 + 1) * W + x0]
      const d = ii[(y1 + 1) * W + (x1 + 1)]
      out[y * w + x] = (d - b - c + a) / ((y1 - y0 + 1) * (x1 - x0 + 1))
    }
  }
  return out
}

/** Nearest-neighbour downsample (the coefficient fields only need approximate low-res copies). */
function downsample(src: Float32Array, w: number, h: number, dw: number, dh: number): Float32Array {
  const out = new Float32Array(dw * dh)
  const rx = w / dw
  const ry = h / dh
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(h - 1, Math.floor((y + 0.5) * ry))
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(w - 1, Math.floor((x + 0.5) * rx))
      out[y * dw + x] = src[sy * w + sx]
    }
  }
  return out
}

/** Bilinear upsample (matches liveMath.upsampleAlphaBilinear's sampling). */
function upsample(src: Float32Array, sw: number, sh: number, dw: number, dh: number): Float32Array {
  const out = new Float32Array(dw * dh)
  const rx = sw / dw
  const ry = sh / dh
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(Math.max((y + 0.5) * ry - 0.5, 0), sh - 1)
    const y0 = Math.floor(sy)
    const y1 = Math.min(sh - 1, y0 + 1)
    const fy = sy - y0
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(Math.max((x + 0.5) * rx - 0.5, 0), sw - 1)
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

/**
 * FAST guided-filter matte with an edge-confidence blend toward the coarse mask.
 *
 * `guide` = full-res linear luma 0..1, `alpha` = the coarse wall alpha 0..1
 * (same W x H). Returns a refined alpha 0..1: sharpened to the guide's edges
 * where there is real local contrast, and equal to the coarse mask where the
 * guide is flat (so confident wall interiors and same-tone seams are preserved).
 */
export function guidedFilterAlpha(
  guide: Float32Array,
  alpha: Float32Array,
  w: number,
  h: number,
  opts: GuidedMatteOptions = {},
): Float32Array {
  const { r, eps, subsample: s, varLo, varHi } = { ...DEFAULTS, ...opts }
  const dw = Math.max(1, Math.round(w / s))
  const dh = Math.max(1, Math.round(h / s))
  const dr = Math.max(1, Math.round(r / s))

  const I = downsample(guide, w, h, dw, dh)
  const p = downsample(alpha, w, h, dw, dh)
  const meanI = boxFilter(I, dw, dh, dr)
  const meanP = boxFilter(p, dw, dh, dr)

  const Ip = new Float32Array(dw * dh)
  const II = new Float32Array(dw * dh)
  for (let i = 0; i < Ip.length; i++) {
    Ip[i] = I[i] * p[i]
    II[i] = I[i] * I[i]
  }
  const meanIp = boxFilter(Ip, dw, dh, dr)
  const meanII = boxFilter(II, dw, dh, dr)

  const a = new Float32Array(dw * dh)
  const b = new Float32Array(dw * dh)
  const conf = new Float32Array(dw * dh)
  for (let i = 0; i < a.length; i++) {
    const varI = Math.max(0, meanII[i] - meanI[i] * meanI[i])
    const cov = meanIp[i] - meanI[i] * meanP[i]
    a[i] = cov / (varI + eps)
    b[i] = meanP[i] - a[i] * meanI[i]
    // Edge confidence: trust the sharpened matte only where the guide has real
    // local contrast. Flat wall / same-tone seams (low varI) keep the coarse mask.
    conf[i] = smoothstep(varLo, varHi, varI)
  }
  const meanA = upsample(boxFilter(a, dw, dh, dr), dw, dh, w, h)
  const meanB = upsample(boxFilter(b, dw, dh, dr), dw, dh, w, h)
  const confFull = upsample(boxFilter(conf, dw, dh, dr), dw, dh, w, h)

  const out = new Float32Array(w * h)
  for (let i = 0; i < out.length; i++) {
    let q = meanA[i] * guide[i] + meanB[i]
    q = q < 0 ? 0 : q > 1 ? 1 : q
    const c = confFull[i]
    const base = alpha[i]
    out[i] = base + (q - base) * c
  }
  return out
}
