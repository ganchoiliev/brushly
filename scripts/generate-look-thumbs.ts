/* One-time Look-thumbnail generator (Looks-as-previews). Renders the sample
   living room through the SAME call the production render route makes — source
   photo, then a solid-swatch colour reference, then the constrained-edit
   prompt, with the pinned aspect ratio — once per curated Look, and downsizes
   each result to a static card thumbnail committed to the repo. The visualiser
   serves these files as plain assets; browsing Looks never calls the engine.

   Source photo: the room half of public/img/interior.jpg (the wizard's
   "Living room" sample is the same photograph), cropped to a fixed 4:3 window
   around the sofa/fireplace so the wall colour dominates at card size.

   Re-run when: a Look is added or re-pointed, a palette hex behind a Look is
   recalibrated, buildPrompt changes materially, or the sample crop changes.

   Run (dry-run, default — free, prints the plan):
     npx tsx --conditions=react-server scripts/generate-look-thumbs.ts

   Run (REAL engine — SPENDS MONEY, needs creds):
     npx tsx --conditions=react-server scripts/generate-look-thumbs.ts --confirm-spend
     …add --look=<id>[,<id>] to regenerate a subset, --engine=vertex|gemini to pick. */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { LOOKS, getColor, type Look } from '@/lib/visualizer/palette'
import { buildPrompt } from '@/lib/visualizer/prompt'
import { solidSwatchPng } from '@/lib/visualizer/swatch'
import { closestAspectRatio } from '@/lib/visualizer/imageMeta'
import type { ImageEngine } from '@/lib/visualizer/engine/types'

/* The committed sample-room framing. left:1792 selects the room half of the
   diptych (the left half is the painter-at-work shot); the vertical window
   keeps sofa + window + fireplace with large clean wall areas. */
const SOURCE = fileURLToPath(new URL('../public/img/interior.jpg', import.meta.url))
const CROP = { left: 1792, top: 2100, width: 1792, height: 1344 } // 4:3
/** Card thumbnails ship at 2× a ~320px display width. */
const THUMB_W = 640
const THUMB_H = 480
const WEBP_QUALITY = 80
const OUT_DIR = fileURLToPath(new URL('../src/components/visualizer/look-thumbs', import.meta.url))

type EngineName = 'gemini' | 'vertex'
const ENGINE_ENV: Record<EngineName, string> = {
  gemini: 'GEMINI_API_KEY (Gemini Developer API key)',
  vertex: 'GCP_SERVICE_ACCOUNT_KEY (service-account JSON)',
}

/* tsx does not load Next's env files — pull .env.local in by hand so the same
   keys `next dev` uses are available. Existing process env always wins. */
function loadEnvLocal() {
  const path = fileURLToPath(new URL('../.env.local', import.meta.url))
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const eq = line.indexOf('=')
    if (eq <= 0 || line.trimStart().startsWith('#')) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

function parseArgs(argv: string[]) {
  let engine: EngineName = 'gemini'
  let confirmSpend = false
  const lookIds: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--confirm-spend') confirmSpend = true
    else if (a.startsWith('--engine=')) engine = a.slice('--engine='.length) as EngineName
    else if (a.startsWith('--look=')) lookIds.push(...a.slice('--look='.length).split(','))
    else if (a === '--help' || a === '-h') {
      printUsage()
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      printUsage()
      process.exit(2)
    }
  }
  if (engine !== 'gemini' && engine !== 'vertex') {
    console.error(`Invalid engine '${engine}' — expected gemini | vertex.`)
    process.exit(2)
  }
  return { engine, confirmSpend, lookIds }
}

function printUsage() {
  console.log(`
generate-look-thumbs — render the sample room once per Look → static card thumbnails

  npx tsx --conditions=react-server scripts/generate-look-thumbs.ts                  dry-run (free)
  npx tsx --conditions=react-server scripts/generate-look-thumbs.ts --confirm-spend  real run

  --engine=gemini|vertex   engine adapter (default gemini)
  --look=<id>[,<id>]       only these Look ids (e.g. retry a failure)
`)
}

async function makeEngine(which: EngineName): Promise<ImageEngine> {
  try {
    if (which === 'vertex') {
      const { VertexEngine } = await import('@/lib/visualizer/engine/vertex')
      return new VertexEngine()
    }
    const { GeminiApiEngine } = await import('@/lib/visualizer/engine/gemini-api')
    return new GeminiApiEngine()
  } catch (err) {
    throw new Error(
      `Could not load the ${which} engine: ${(err as Error).message.split('\n')[0]}\n` +
        `Engines import 'server-only', which throws under plain tsx. Re-run with:\n` +
        `  npx tsx --conditions=react-server scripts/generate-look-thumbs.ts --confirm-spend`,
    )
  }
}

async function main() {
  loadEnvLocal()
  const { engine: engineName, confirmSpend, lookIds } = parseArgs(process.argv.slice(2))

  const looks: Look[] = lookIds.length
    ? lookIds.map((id) => {
        const look = LOOKS.find((l) => l.id === id)
        if (!look) throw new Error(`Unknown look id '${id}' (see LOOKS in palette.ts)`)
        return look
      })
    : LOOKS

  const estPence = Number(process.env.VISUALIZER_EST_COST_PENCE ?? 12) * looks.length
  console.log('\n' + '='.repeat(70))
  console.log('  ⚠️  THIS SPENDS MONEY AND HITS QUOTA')
  console.log('='.repeat(70))
  console.log(`  Engine        : ${engineName}`)
  console.log(`  Needs env     : ${ENGINE_ENV[engineName]}`)
  console.log(`  Live API calls: ${looks.length} (one generateContent per Look)`)
  console.log(`  Est. cost     : ~${estPence}p (@ VISUALIZER_EST_COST_PENCE/render)`)
  console.log(`  Output        : ${OUT_DIR}/<look>.webp (${THUMB_W}×${THUMB_H}, committed)`)
  console.log('='.repeat(70))
  if (!confirmSpend) {
    console.log('\n  DRY RUN — no request sent, nothing spent. Looks that would render:')
    for (const look of looks) {
      const c = getColor(look.colorId)
      console.log(`    • ${look.id.padEnd(16)} ${c?.label} ${c?.hex} · ${look.finish}`)
    }
    console.log('\n  Add --confirm-spend to run for real.\n')
    return
  }
  console.log('\n  --confirm-spend set → proceeding with a REAL, billable run.\n')

  const engine = await makeEngine(engineName)
  const srcBytes = await sharp(SOURCE).extract(CROP).jpeg({ quality: 92 }).toBuffer()
  const srcB64 = srcBytes.toString('base64')
  const aspectRatio = closestAspectRatio(CROP.width, CROP.height)

  mkdirSync(OUT_DIR, { recursive: true })

  const failures: string[] = []
  for (const look of looks) {
    const color = getColor(look.colorId)
    if (!color) throw new Error(`Look '${look.id}' points at unknown colour '${look.colorId}'`)
    const started = Date.now()
    try {
      const result = await engine.editImage({
        imageBase64: srcB64,
        mimeType: 'image/jpeg',
        prompt: buildPrompt('interior', color, look.finish),
        references: [
          { imageBase64: solidSwatchPng(color.hex).toString('base64'), mimeType: 'image/png' },
        ],
        aspectRatio,
      })
      const thumb = await sharp(Buffer.from(result.imageBase64, 'base64'))
        .resize(THUMB_W, THUMB_H, { fit: 'cover', position: 'centre' })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer()
      const out = `${OUT_DIR}/${look.id}.webp`
      writeFileSync(out, thumb)
      const secs = ((Date.now() - started) / 1000).toFixed(1)
      console.log(
        `  ✓ ${look.id.padEnd(16)} ${color.hex} → ${(thumb.length / 1024).toFixed(1)}KB in ${secs}s (${result.model})`,
      )
    } catch (err) {
      failures.push(look.id)
      console.error(`  ✗ ${look.id.padEnd(16)} FAILED: ${(err as Error).message.split('\n')[0]}`)
    }
  }

  if (failures.length) {
    console.error(
      `\n  ${failures.length} look(s) failed — retry just those:\n` +
        `  npx tsx --conditions=react-server scripts/generate-look-thumbs.ts --confirm-spend --look=${failures.join(',')}\n`,
    )
    process.exit(1)
  }
  console.log(`\n  ✓ all ${looks.length} thumbnails written to ${OUT_DIR}\n`)
}

main().catch((err) => {
  console.error('\ngenerate-look-thumbs failed:', err)
  process.exit(1)
})
