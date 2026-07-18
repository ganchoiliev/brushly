// Fixed MANUAL wall masks for the fidelity harness — one or more rectangles per
// fixture in normalised [x0, y0, x1, y1] coordinates (0–1, resolution-
// independent). No segmentation, no ONNX: the whole point of the harness is
// determinism, and a learned mask would drift model-version to model-version and
// make the baseline untrustworthy. A human draws these once over the wall.
//
// Two selections are derived from the rects at a given working resolution:
//   • wallPixelIndices  — pixels INSIDE the wall rects (colour-accuracy region)
//   • edgeBandIndices   — pixels just OUTSIDE the rects (bleed-detection band)
// Both return PIXEL indices (row-major, y*width + x), i.e. the pixel's byte
// offset in an RGBA buffer is index*4.

/** A wall rectangle in normalised coordinates: [x0, y0, x1, y1], each 0–1. */
export type Rect = [number, number, number, number]

/** True when a pixel CENTRE at normalised (cx, cy) is inside the rect. */
function inRect(cx: number, cy: number, [x0, y0, x1, y1]: Rect): boolean {
  return cx >= x0 && cx < x1 && cy >= y0 && cy < y1
}

function inAnyRect(cx: number, cy: number, rects: readonly Rect[]): boolean {
  for (const r of rects) if (inRect(cx, cy, r)) return true
  return false
}

/**
 * Pixel indices whose CENTRE falls inside any wall rect, at `width`×`height`.
 * Pixel-centre containment (not integer edge rounding) keeps the selection a
 * pure function of the rects and the resolution — no off-by-one drift.
 */
export function wallPixelIndices(width: number, height: number, rects: readonly Rect[]): number[] {
  const out: number[] = []
  for (let y = 0; y < height; y++) {
    const cy = (y + 0.5) / height
    for (let x = 0; x < width; x++) {
      const cx = (x + 0.5) / width
      if (inAnyRect(cx, cy, rects)) out.push(y * width + x)
    }
  }
  return out
}

/**
 * Pixel indices in a band of `bandPx` pixels just OUTSIDE the wall rects: a
 * pixel qualifies when it is NOT inside any rect but IS inside some rect grown
 * by `bandPx` (converted to normalised units per axis). A faithful repaint
 * barely touches these pixels, so a large before/after change here is paint
 * bleeding past the wall edge. Pixels beyond the image border are naturally
 * excluded (the loop only visits in-bounds pixels).
 */
export function edgeBandIndices(
  width: number,
  height: number,
  rects: readonly Rect[],
  bandPx: number,
): number[] {
  const bx = bandPx / width
  const by = bandPx / height
  const grown: Rect[] = rects.map(([x0, y0, x1, y1]) => [x0 - bx, y0 - by, x1 + bx, y1 + by])
  const out: number[] = []
  for (let y = 0; y < height; y++) {
    const cy = (y + 0.5) / height
    for (let x = 0; x < width; x++) {
      const cx = (x + 0.5) / width
      if (!inAnyRect(cx, cy, rects) && inAnyRect(cx, cy, grown)) out.push(y * width + x)
    }
  }
  return out
}
