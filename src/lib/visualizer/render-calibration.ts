// Render calibration (server): turn a finished photoreal render into the
// viewpoint-independent look data the native AR "calibrated real-time" shader
// consumes. Ties together the Node wall segmentation and the albedo extraction:
//
//   before (source photo) ─┐
//                          ├─ segment wall (before) → feather → upsample alpha
//   after (Gemini render) ─┘         │
//                                    └─ extractWallCalibration → { paint, wallLum }
//
// The render route calls this after producing `after`, and returns the result
// alongside beforeUrl/afterUrl so the app can push the render's ACHIEVED paint
// colour into the live shader (updateWallLook) — the preview then matches the
// photoreal render instead of the raw swatch. Node-only (sharp); pure logic
// beyond the model + decode lives in calibration.ts / liveMath.ts.

import sharp from 'sharp'
import {
  EXTERIOR_CLASSES,
  INTERIOR_CLASSES,
  segmentWallServerMargin,
} from './segmentation.server'
import { DEFAULT_TUNING, smoothMargin, upsampleAlphaBilinear } from './liveMath'
import { extractWallCalibration, type WallCalibration } from './calibration'
import type { VisualizerService } from '@/lib/supabase/types'

// Working resolution for the median extraction — enough wall pixels for a
// stable albedo without decoding full-res render output.
const CAL_MAX = 640

async function decodeRgba(image: Buffer, w: number, h: number): Promise<Uint8ClampedArray> {
  const data = await sharp(image).resize(w, h, { fit: 'fill' }).ensureAlpha().raw().toBuffer()
  // Copy into a Uint8ClampedArray (sharp returns a pooled Node Buffer).
  return new Uint8ClampedArray(data)
}

function targetsFor(service: VisualizerService): readonly number[] {
  return service === 'exterior' ? EXTERIOR_CLASSES : INTERIOR_CLASSES
}

/** Working W×H at CAL_MAX long edge, preserving the source aspect. */
async function workingSize(before: Buffer): Promise<{ w: number; h: number }> {
  const meta = await sharp(before).metadata()
  const sw = meta.width ?? CAL_MAX
  const sh = meta.height ?? CAL_MAX
  const scale = Math.min(1, CAL_MAX / Math.max(sw, sh))
  return { w: Math.max(1, Math.round(sw * scale)), h: Math.max(1, Math.round(sh * scale)) }
}

/**
 * Recovers the achieved paint albedo + reference wall luminance from a render.
 * `before`/`after` are encoded image Buffers (jpeg/png/webp) of the SAME scene
 * (Gemini only repaints, so geometry matches). Returns null when the wall mask
 * covers too little to trust — caller falls back to the chosen swatch colour.
 */
export async function calibrateRender(
  before: Buffer,
  after: Buffer,
  service: VisualizerService = 'interior',
): Promise<WallCalibration | null> {
  // Wall geometry comes from the ORIGINAL photo (the render can drift a few px).
  const { margin, width: mw, height: mh } = await segmentWallServerMargin(before, targetsFor(service))
  const { w, h } = await workingSize(before)
  // Single frame, no temporal history: feather with the same width the live/still
  // paths use so the confident-wall region matches, then upsample to working res.
  const smooth = smoothMargin(margin, mw, mh, null, DEFAULT_TUNING.feather, 1)
  const alpha = upsampleAlphaBilinear(smooth.data, mw, mh, w, h)
  const [beforeRgba, afterRgba] = await Promise.all([decodeRgba(before, w, h), decodeRgba(after, w, h)])
  return extractWallCalibration(beforeRgba, afterRgba, w, h, alpha)
}
