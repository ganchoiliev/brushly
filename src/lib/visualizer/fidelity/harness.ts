// Engine-agnostic render-fidelity scorer. For every (fixture × colour) it drives
// the SAME call the production render route makes — source photo, then a single
// solid-colour swatch reference, then the constrained-edit prompt, with the
// closest supported aspect ratio — decodes the engine's result, and scores:
//
//   • deltaE  — CIEDE2000 between the rendered wall's median colour and the
//               target paint hex (lower = truer colour).
//   • bleed   — mean CIEDE2000 between before/after over a thin band JUST OUTSIDE
//               the wall mask (higher = paint leaked past the wall edge).
//
// It imports the live pipeline modules read-only; it changes nothing in them.
// The engine is injected, so the caller decides mock (free, deterministic) vs a
// real vendor engine (spends money). See README.md and scripts/render-fidelity.ts.

import sharp from 'sharp'
import { buildPrompt } from '@/lib/visualizer/prompt'
import { solidSwatchPng } from '@/lib/visualizer/swatch'
import { closestAspectRatio, jpegDimensions } from '@/lib/visualizer/imageMeta'
// NOTE: import the ImageEngine TYPE from engine/types (dependency-free), NOT from
// engine/index — that factory pulls `server-only`, which throws under tsx/vitest.
import type { EngineEditInput, ImageEngine } from '@/lib/visualizer/engine/types'
import {
  deltaE00,
  hexToLab,
  medianRepresentativeRgb,
  rgbToHex,
  rgbToLab,
} from './deltaE'
import { edgeBandIndices, wallPixelIndices } from './mask'
import { FIXTURES, readFixtureImage, resolveColor, type Fixture } from './fixtures'

/** Long edge (px) the before/after are decoded to before scoring. */
export const WORKING_LONG_EDGE = 384
/** Width (px) of the just-outside-the-mask bleed band. */
export const BAND_PX = 6
/** Decimal places every reported float is rounded to (byte-stable JSON). */
export const FLOAT_DP = 4

export interface FidelityResult {
  fixtureId: string
  colorId: string
  targetHex: string
  /** Median wall colour the engine produced (sRGB hex). */
  measuredHex: string
  deltaE: number
  bleed: number
}

export interface FidelitySummary {
  meanDeltaE: number
  maxDeltaE: number
  meanBleed: number
}

export interface FidelityReport {
  engine: string
  generatedAt: string
  params: { workingLongEdge: number; bandPx: number }
  results: FidelityResult[]
  summary: FidelitySummary
}

/** The deterministic slice of a report — everything except the timestamp. This
    is what gets committed as baseline.json and compared against. */
export type Baseline = Omit<FidelityReport, 'generatedAt'>

const POW = Math.pow(10, FLOAT_DP)
function round(x: number): number {
  // + 0 collapses a possible -0 to 0 so JSON.stringify is stable.
  return Math.round(x * POW) / POW + 0
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0
}

/** Working W×H at WORKING_LONG_EDGE, preserving aspect (mirrors render-calibration). */
function workingSize(sw: number, sh: number): { w: number; h: number } {
  const scale = Math.min(1, WORKING_LONG_EDGE / Math.max(sw, sh))
  return { w: Math.max(1, Math.round(sw * scale)), h: Math.max(1, Math.round(sh * scale)) }
}

/** Decode an encoded image to raw RGBA at exactly w×h (mirrors render-calibration.decodeRgba). */
async function decodeRgba(image: Buffer, w: number, h: number): Promise<Uint8ClampedArray> {
  const data = await sharp(image).resize(w, h, { fit: 'fill' }).ensureAlpha().raw().toBuffer()
  return new Uint8ClampedArray(data)
}

/** Mean per-pixel CIEDE2000 between before and after over the edge-band pixels. */
export function meanEdgeBleed(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  bandIdx: number[],
): number {
  if (bandIdx.length === 0) return 0
  let sum = 0
  for (const idx of bandIdx) {
    const p = idx * 4
    sum += deltaE00(
      rgbToLab(before[p], before[p + 1], before[p + 2]),
      rgbToLab(after[p], after[p + 1], after[p + 2]),
    )
  }
  return sum / bandIdx.length
}

/**
 * Score every (fixture × colour) through `engine`. Pure w.r.t. the filesystem
 * except reading the committed fixtures; `now` is injectable so tests get a
 * deterministic timestamp. Results are sorted by (fixtureId, colorId) with plain
 * code-unit comparison — no locale, no Map ordering — so the JSON is stable.
 */
export async function runFidelity(
  engine: ImageEngine,
  fixtures: readonly Fixture[] = FIXTURES,
  now: string = new Date().toISOString(),
): Promise<FidelityReport> {
  const results: FidelityResult[] = []
  const rawDeltas: number[] = []
  const rawBleeds: number[] = []

  for (const fixture of fixtures) {
    const srcBytes = readFixtureImage(fixture.file)
    const srcB64 = srcBytes.toString('base64')
    const meta = await sharp(srcBytes).metadata()
    const { w, h } = workingSize(meta.width ?? WORKING_LONG_EDGE, meta.height ?? WORKING_LONG_EDGE)

    const beforeRgba = await decodeRgba(srcBytes, w, h)
    const wallIdx = wallPixelIndices(w, h, fixture.wallRects)
    const bandIdx = edgeBandIndices(w, h, fixture.wallRects, BAND_PX)
    if (wallIdx.length === 0) {
      throw new Error(`fidelity fixture ${fixture.id}: wall mask selected 0 pixels at ${w}×${h}`)
    }

    // Aspect ratio EXACTLY as the route derives it: jpegDimensions → closestAspectRatio.
    const dims = jpegDimensions(srcBytes)
    const aspectRatio = dims ? closestAspectRatio(dims.width, dims.height) : undefined

    for (const colorId of fixture.testColorIds) {
      const color = resolveColor(colorId)
      // Reproduce the route's reference part: the exact hex as a solid PNG swatch,
      // passed as a base64 STRING (solidSwatchPng returns a Buffer).
      const swatchB64 = solidSwatchPng(color.hex).toString('base64')
      const input: EngineEditInput = {
        imageBase64: srcB64,
        mimeType: 'image/jpeg',
        prompt: buildPrompt(fixture.service, color),
        references: [{ imageBase64: swatchB64, mimeType: 'image/png' }],
        aspectRatio,
      }
      const result = await engine.editImage(input)
      const afterRgba = await decodeRgba(Buffer.from(result.imageBase64, 'base64'), w, h)

      const measured = medianRepresentativeRgb(afterRgba, wallIdx)
      const deltaE = deltaE00(rgbToLab(measured[0], measured[1], measured[2]), hexToLab(color.hex))
      const bleed = meanEdgeBleed(beforeRgba, afterRgba, bandIdx)

      rawDeltas.push(deltaE)
      rawBleeds.push(bleed)
      results.push({
        fixtureId: fixture.id,
        colorId,
        targetHex: color.hex,
        measuredHex: rgbToHex(measured),
        deltaE: round(deltaE),
        bleed: round(bleed),
      })
    }
  }

  results.sort((a, b) =>
    a.fixtureId < b.fixtureId
      ? -1
      : a.fixtureId > b.fixtureId
        ? 1
        : a.colorId < b.colorId
          ? -1
          : a.colorId > b.colorId
            ? 1
            : 0,
  )

  return {
    engine: engine.name,
    generatedAt: now,
    params: { workingLongEdge: WORKING_LONG_EDGE, bandPx: BAND_PX },
    results,
    summary: {
      meanDeltaE: round(mean(rawDeltas)),
      maxDeltaE: round(rawDeltas.length ? Math.max(...rawDeltas) : 0),
      meanBleed: round(mean(rawBleeds)),
    },
  }
}

/** Strip the volatile timestamp to get the committable/comparable baseline. */
export function toBaseline(report: FidelityReport): Baseline {
  const { generatedAt: _generatedAt, ...rest } = report
  void _generatedAt
  return rest
}

export interface Regression {
  metric: string
  where: string
  baseline: number
  current: number
  delta: number
}

export interface BaselineTolerance {
  deltaE: number
  bleed: number
}

/**
 * Compare a fresh baseline against the saved one and return every metric that
 * got WORSE by more than the tolerance (improvements are never regressions).
 * Structural differences (a missing/extra row, a different engine or working
 * params) are reported as regressions too — a baseline for a different config
 * can't vouch for this run.
 */
export function diffBaseline(
  current: Baseline,
  saved: Baseline,
  tol: BaselineTolerance,
): Regression[] {
  const out: Regression[] = []

  if (current.engine !== saved.engine) {
    out.push({ metric: 'engine', where: `${saved.engine}→${current.engine}`, baseline: 0, current: 0, delta: 0 })
  }
  if (current.params.workingLongEdge !== saved.params.workingLongEdge) {
    out.push({
      metric: 'params.workingLongEdge',
      where: 'params',
      baseline: saved.params.workingLongEdge,
      current: current.params.workingLongEdge,
      delta: current.params.workingLongEdge - saved.params.workingLongEdge,
    })
  }
  if (current.params.bandPx !== saved.params.bandPx) {
    out.push({
      metric: 'params.bandPx',
      where: 'params',
      baseline: saved.params.bandPx,
      current: current.params.bandPx,
      delta: current.params.bandPx - saved.params.bandPx,
    })
  }

  const key = (r: FidelityResult) => `${r.fixtureId}/${r.colorId}`
  const savedByKey = new Map(saved.results.map((r) => [key(r), r]))
  const currentKeys = new Set(current.results.map(key))

  for (const r of current.results) {
    const s = savedByKey.get(key(r))
    if (!s) {
      out.push({ metric: 'row.added', where: key(r), baseline: 0, current: r.deltaE, delta: r.deltaE })
      continue
    }
    if (r.deltaE > s.deltaE + tol.deltaE) {
      out.push({ metric: 'deltaE', where: key(r), baseline: s.deltaE, current: r.deltaE, delta: round(r.deltaE - s.deltaE) })
    }
    if (r.bleed > s.bleed + tol.bleed) {
      out.push({ metric: 'bleed', where: key(r), baseline: s.bleed, current: r.bleed, delta: round(r.bleed - s.bleed) })
    }
  }
  for (const s of saved.results) {
    if (!currentKeys.has(key(s))) {
      out.push({ metric: 'row.missing', where: key(s), baseline: s.deltaE, current: 0, delta: 0 })
    }
  }

  if (current.summary.meanDeltaE > saved.summary.meanDeltaE + tol.deltaE) {
    out.push({
      metric: 'summary.meanDeltaE',
      where: 'summary',
      baseline: saved.summary.meanDeltaE,
      current: current.summary.meanDeltaE,
      delta: round(current.summary.meanDeltaE - saved.summary.meanDeltaE),
    })
  }
  if (current.summary.maxDeltaE > saved.summary.maxDeltaE + tol.deltaE) {
    out.push({
      metric: 'summary.maxDeltaE',
      where: 'summary',
      baseline: saved.summary.maxDeltaE,
      current: current.summary.maxDeltaE,
      delta: round(current.summary.maxDeltaE - saved.summary.maxDeltaE),
    })
  }
  if (current.summary.meanBleed > saved.summary.meanBleed + tol.bleed) {
    out.push({
      metric: 'summary.meanBleed',
      where: 'summary',
      baseline: saved.summary.meanBleed,
      current: current.summary.meanBleed,
      delta: round(current.summary.meanBleed - saved.summary.meanBleed),
    })
  }

  return out
}

/** Canonical byte-stable JSON for a baseline (sorted results already; trailing \n). */
export function serializeBaseline(baseline: Baseline): string {
  return JSON.stringify(baseline, null, 2) + '\n'
}
