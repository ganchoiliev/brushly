import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/* The web palette (src/lib/visualizer/palette.ts) and the native Expo copy
   (brushly-ar/src/lib/palette.ts) must stay in lockstep: the render API
   validates colorId server-side, so a divergent id — or a wrong hex on a shared
   id — is a server break or a wrong paint. tsconfig excludes brushly-ar, so the
   native copy CAN'T be imported; both files are read as text instead. This test
   fails on any drift in the set of ids, or in label/hex for a shared id. It
   ignores brand, group and the native-only `description` field. */

const webPath = fileURLToPath(new URL('./palette.ts', import.meta.url))
const nativePath = fileURLToPath(
  new URL('../../../brushly-ar/src/lib/palette.ts', import.meta.url),
)

type Entry = { label: string; hex: string }

/* Anchors on the id → label → hex field trio in order and stops at the hex
   value, so it never over-captures into brand/group/description. `label`
   is single- OR double-quoted (e.g. "Elephant's Breath", "Hicks' Blue"); `&`
   in later fields is irrelevant because matching ends at the hex quote. The
   LOOKS array is skipped: its entries have `name:`, not `label:`, after `id:`. */
const ENTRY_RE =
  /\{\s*id:\s*'([^']+)'\s*,\s*label:\s*(?:'([^']*)'|"([^"]*)")\s*,\s*hex:\s*'(#[0-9A-Fa-f]{6})'/g

function parsePalette(source: string): Map<string, Entry> {
  const out = new Map<string, Entry>()
  let m: RegExpExecArray | null
  ENTRY_RE.lastIndex = 0
  while ((m = ENTRY_RE.exec(source)) !== null) {
    out.set(m[1], { label: m[2] ?? m[3], hex: m[4] })
  }
  return out
}

describe('web ↔ native palette drift', () => {
  it('has the native palette copy to compare against', () => {
    expect(existsSync(nativePath)).toBe(true)
  })

  const web = parsePalette(readFileSync(webPath, 'utf8'))
  const native = existsSync(nativePath)
    ? parsePalette(readFileSync(nativePath, 'utf8'))
    : new Map<string, Entry>()

  it('parses a plausible number of entries from each file', () => {
    // A floor, not an exact count — a regex tripped by a quoting landmine would
    // yield too few entries and fail loudly here rather than silently comparing
    // empty sets. Both palettes currently hold well over 40 colours.
    expect(web.size).toBeGreaterThan(40)
    expect(native.size).toBeGreaterThan(40)
  })

  it('has identical id sets in both palettes', () => {
    const onlyWeb = [...web.keys()].filter((id) => !native.has(id)).sort()
    const onlyNative = [...native.keys()].filter((id) => !web.has(id)).sort()
    expect({ onlyWeb, onlyNative }).toEqual({ onlyWeb: [], onlyNative: [] })
  })

  it('has matching label and hex for every shared id', () => {
    const mismatches: string[] = []
    for (const [id, w] of web) {
      const n = native.get(id)
      if (!n) continue
      if (w.label !== n.label) {
        mismatches.push(`${id}: label web="${w.label}" native="${n.label}"`)
      }
      if (w.hex !== n.hex) {
        mismatches.push(`${id}: hex web=${w.hex} native=${n.hex}`)
      }
    }
    expect(mismatches).toEqual([])
  })
})
