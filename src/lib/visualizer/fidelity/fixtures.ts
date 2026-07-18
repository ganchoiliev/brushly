// Fixture loading + validation for the fidelity harness. The fixtures live in
// ./fixtures (a manifest + a few small committed jpgs); this module reads and
// VALIDATES them at import time so a typo'd palette id or a malformed rect fails
// loudly the moment anything imports FIXTURES — never silently at scoring time.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { VisualizerService } from '@/lib/supabase/types'
import { getColor, type PaintColor } from '@/lib/visualizer/palette'
import type { Rect } from './mask'
import manifest from './fixtures/manifest.json'

export interface Fixture {
  id: string
  file: string
  service: VisualizerService
  /** Hand-drawn wall regions, normalised [x0, y0, x1, y1]. */
  wallRects: Rect[]
  /** Palette ids to render this fixture with (each must resolve via getColor). */
  testColorIds: string[]
}

const VALID_SERVICES: readonly VisualizerService[] = ['interior', 'exterior', 'wallpaper', 'finish']

function assertRect(value: unknown, where: string): Rect {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((n) => typeof n === 'number')) {
    throw new Error(`fidelity fixture ${where}: rect must be [x0,y0,x1,y1] numbers, got ${JSON.stringify(value)}`)
  }
  const [x0, y0, x1, y1] = value as number[]
  const inUnit = [x0, y0, x1, y1].every((n) => n >= 0 && n <= 1)
  if (!inUnit || x0 >= x1 || y0 >= y1) {
    throw new Error(`fidelity fixture ${where}: rect out of range or inverted: ${JSON.stringify(value)}`)
  }
  return [x0, y0, x1, y1]
}

function validateFixture(raw: unknown): Fixture {
  const f = raw as Record<string, unknown>
  const id = f.id
  if (typeof id !== 'string' || !id) throw new Error('fidelity fixture: missing id')
  if (typeof f.file !== 'string' || !f.file) throw new Error(`fidelity fixture ${id}: missing file`)
  if (!VALID_SERVICES.includes(f.service as VisualizerService)) {
    throw new Error(`fidelity fixture ${id}: invalid service ${JSON.stringify(f.service)}`)
  }
  if (!Array.isArray(f.wallRects) || f.wallRects.length === 0) {
    throw new Error(`fidelity fixture ${id}: wallRects must be a non-empty array`)
  }
  const wallRects = f.wallRects.map((r, i) => assertRect(r, `${id}.wallRects[${i}]`))
  if (!Array.isArray(f.testColorIds) || f.testColorIds.length === 0) {
    throw new Error(`fidelity fixture ${id}: testColorIds must be a non-empty array`)
  }
  for (const cid of f.testColorIds) {
    if (typeof cid !== 'string' || !getColor(cid)) {
      throw new Error(`fidelity fixture ${id}: unknown palette id ${JSON.stringify(cid)} (see palette.ts)`)
    }
  }
  return {
    id,
    file: f.file,
    service: f.service as VisualizerService,
    wallRects,
    testColorIds: f.testColorIds as string[],
  }
}

/** Validated fixtures, in manifest order. Throws at import on any bad entry. */
export const FIXTURES: Fixture[] = (manifest.fixtures as unknown[]).map(validateFixture)

/** Raw bytes of a fixture image, resolved relative to this module. */
export function readFixtureImage(file: string): Buffer {
  return readFileSync(fileURLToPath(new URL(`./fixtures/${file}`, import.meta.url)))
}

/** Resolve a palette id to its PaintColor, throwing if unknown. */
export function resolveColor(id: string): PaintColor {
  const c = getColor(id)
  if (!c) throw new Error(`fidelity: unknown palette id ${id}`)
  return c
}
