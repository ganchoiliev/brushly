/* Render-fidelity harness runner (§ Phase 0 — colour spine). Scores the
   visualiser render pipeline on wall-colour accuracy (CIEDE2000 ΔE to the target
   paint hex) and edge bleed, over a few fixed fixtures with hand-drawn wall
   masks. Runnable script, NOT CI — it never gates a commit and never spends by
   default.

   Run (mock, default — free, deterministic):
     npm run fidelity                     # compare against the committed baseline
     npm run fidelity -- --update-baseline

   Run (REAL engine — SPENDS MONEY, needs creds + the react-server condition):
     npx tsx --conditions=react-server scripts/render-fidelity.ts --engine=vertex --confirm-spend

   See src/lib/visualizer/fidelity/README.md for the full story + caveats.       */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { MockEngine } from '@/lib/visualizer/engine/mock'
import type { ImageEngine } from '@/lib/visualizer/engine/types'
import { FIXTURES } from '@/lib/visualizer/fidelity/fixtures'
import {
  diffBaseline,
  runFidelity,
  serializeBaseline,
  toBaseline,
  type Baseline,
  type FidelityReport,
} from '@/lib/visualizer/fidelity/harness'

type EngineName = 'mock' | 'vertex' | 'gemini'
const REAL_ENGINES: EngineName[] = ['vertex', 'gemini']

// Regression tolerances (a metric must get WORSE than this to fail). Overridable
// for experimentation; the defaults match the README.
const TOL = {
  deltaE: Number(process.env.FIDELITY_TOL_DELTAE ?? 1.5),
  bleed: Number(process.env.FIDELITY_TOL_BLEED ?? 1.0),
}

function parseArgs(argv: string[]) {
  let engine: EngineName = 'mock'
  let updateBaseline = false
  let confirmSpend = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--update-baseline') updateBaseline = true
    else if (a === '--confirm-spend') confirmSpend = true
    else if (a.startsWith('--engine=')) engine = a.slice('--engine='.length) as EngineName
    else if (a === '--engine') engine = argv[++i] as EngineName
    else if (a === '--help' || a === '-h') {
      printUsage()
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${a}`)
      printUsage()
      process.exit(2)
    }
  }
  // Env fallback for the engine (explicit flag wins).
  const envEngine = process.env.FIDELITY_ENGINE as EngineName | undefined
  if (engine === 'mock' && envEngine) engine = envEngine
  if (engine !== 'mock' && engine !== 'vertex' && engine !== 'gemini') {
    console.error(`Invalid engine '${engine}' — expected mock | vertex | gemini.`)
    process.exit(2)
  }
  return { engine, updateBaseline, confirmSpend }
}

function printUsage() {
  console.log(`
render-fidelity — score the visualiser render pipeline (colour ΔE + edge bleed)

  npm run fidelity                        mock (default), compare vs baseline.json
  npm run fidelity -- --update-baseline   mock, (re)write the committed baseline

  --engine=vertex|gemini                  REAL engine (spends money + quota)
  --confirm-spend                         actually run the real engine (else dry-run)
  --update-baseline                       write the baseline instead of comparing

Real engines are server-only; run them with the react-server condition:
  npx tsx --conditions=react-server scripts/render-fidelity.ts --engine=vertex --confirm-spend
`)
}

/** Absolute path to a baseline file next to the fidelity module. The committed
    mock baseline is baseline.json; real-engine baselines go to a *.local.json
    sibling that .gitignore keeps out of the repo (never commit a paid baseline). */
function baselinePath(engine: EngineName): string {
  const name = engine === 'mock' ? 'baseline.json' : `baseline.${engine}.local.json`
  return fileURLToPath(new URL(`../src/lib/visualizer/fidelity/${name}`, import.meta.url))
}

async function makeRealEngine(which: 'vertex' | 'gemini'): Promise<ImageEngine> {
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
        `Real engines import 'server-only', which throws under plain tsx. Re-run with:\n` +
        `  npx tsx --conditions=react-server scripts/render-fidelity.ts --engine=${which} --confirm-spend`,
    )
  }
}

const REAL_ENGINE_ENV: Record<'vertex' | 'gemini', string> = {
  vertex: 'GCP_SERVICE_ACCOUNT_KEY (service-account JSON)',
  gemini: 'GEMINI_API_KEY (Gemini Developer API key)',
}

function totalRenderCount(): number {
  return FIXTURES.reduce((n, f) => n + f.testColorIds.length, 0)
}

/** Loud, unmissable warning + a dry-run description of exactly what a real run
    would do. Called before any real-engine work; without --confirm-spend it
    returns false and the caller exits WITHOUT spending. */
function guardRealEngine(engine: 'vertex' | 'gemini', confirmSpend: boolean): boolean {
  const n = totalRenderCount()
  const estPence = Number(process.env.VISUALIZER_EST_COST_PENCE ?? 12) * n
  console.log('\n' + '='.repeat(70))
  console.log('  ⚠️  THIS SPENDS MONEY AND HITS QUOTA')
  console.log('='.repeat(70))
  console.log(`  Engine        : ${engine}`)
  console.log(`  Needs env     : ${REAL_ENGINE_ENV[engine]}`)
  console.log(`  Live API calls: ${n} (one generateContent per fixture × colour)`)
  console.log(`  Est. cost     : ~${estPence}p (@ VISUALIZER_EST_COST_PENCE/render)`)
  console.log(`  Baseline      : ${engine} baselines are NOT committed (*.local.json)`)
  console.log('='.repeat(70))
  if (!confirmSpend) {
    console.log('\n  DRY RUN — no request was sent, nothing was spent.')
    console.log('  Add --confirm-spend (and --conditions=react-server) to run for real:')
    console.log(
      `    npx tsx --conditions=react-server scripts/render-fidelity.ts --engine=${engine} --confirm-spend\n`,
    )
    return false
  }
  console.log('\n  --confirm-spend set → proceeding with a REAL, billable run.\n')
  return true
}

function printTable(report: FidelityReport) {
  const rows = report.results.map((r) => ({
    fixture: r.fixtureId,
    colour: r.colorId,
    target: r.targetHex,
    measured: r.measuredHex,
    dE: r.deltaE.toFixed(4),
    bleed: r.bleed.toFixed(4),
  }))
  const cols: Array<[keyof (typeof rows)[0], string]> = [
    ['fixture', 'fixture'],
    ['colour', 'colour'],
    ['target', 'target'],
    ['measured', 'measured'],
    ['dE', 'ΔE00'],
    ['bleed', 'bleed'],
  ]
  const width: Record<string, number> = {}
  for (const [key, head] of cols) {
    width[key] = Math.max(head.length, ...rows.map((row) => String(row[key]).length))
  }
  const line = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(width[cols[i][0]])).join('  ')
  console.log('\n' + line(cols.map(([, h]) => h)))
  console.log(cols.map(([key]) => '-'.repeat(width[key])).join('  '))
  for (const row of rows) console.log(line(cols.map(([key]) => String(row[key]))))
  const s = report.summary
  console.log(
    `\n  summary: meanΔE=${s.meanDeltaE.toFixed(4)}  maxΔE=${s.maxDeltaE.toFixed(4)}  meanBleed=${s.meanBleed.toFixed(4)}`,
  )
}

async function main() {
  const { engine: engineName, updateBaseline, confirmSpend } = parseArgs(process.argv.slice(2))

  let engine: ImageEngine
  if (engineName === 'mock') {
    // Direct instantiation avoids the server-only getEngine() factory.
    engine = new MockEngine()
  } else if (REAL_ENGINES.includes(engineName)) {
    if (!guardRealEngine(engineName, confirmSpend)) process.exit(0) // dry-run, no spend
    engine = await makeRealEngine(engineName)
  } else {
    console.error(`Invalid engine '${engineName}'`)
    process.exit(2)
    return
  }

  if (engineName === 'mock') {
    console.log(
      '\n  NOTE: mock mode echoes the source photo unchanged, so ΔE here measures\n' +
        '  the HARNESS (decode → mask → median → ΔE → baseline), NOT colour accuracy.\n' +
        '  Real colour fidelity needs a deliberate --engine=vertex|gemini run.',
    )
  }

  const report = await runFidelity(engine)
  printTable(report)

  const path = baselinePath(engineName)
  const current = toBaseline(report)

  if (updateBaseline) {
    writeFileSync(path, serializeBaseline(current))
    console.log(`\n  ✓ baseline written → ${path}`)
    if (engineName !== 'mock') {
      console.log('  (real-engine baseline — .gitignored, do NOT commit)')
    }
    process.exit(0)
  }

  if (!existsSync(path)) {
    console.error(
      `\n  ✗ no baseline at ${path}\n    Create it first:  npm run fidelity -- --update-baseline`,
    )
    process.exit(1)
  }

  const saved = JSON.parse(readFileSync(path, 'utf8')) as Baseline
  const regressions = diffBaseline(current, saved, TOL)

  if (regressions.length === 0) {
    console.log(`\n  ✓ PASS — no metric regressed beyond tolerance (ΔE>${TOL.deltaE}, bleed>${TOL.bleed}).`)
    process.exit(0)
  }

  console.error(`\n  ✗ REGRESSED — ${regressions.length} metric(s) worse than baseline:`)
  for (const r of regressions) {
    if (r.metric === 'engine') {
      console.error(`    • engine changed: ${r.where} (baseline is not comparable)`)
    } else if (r.metric.startsWith('params')) {
      console.error(`    • ${r.metric}: ${r.baseline} → ${r.current}`)
    } else if (r.metric === 'row.missing' || r.metric === 'row.added') {
      console.error(`    • ${r.metric} at ${r.where}`)
    } else {
      console.error(`    • ${r.metric} at ${r.where}: ${r.baseline} → ${r.current} (+${r.delta})`)
    }
  }
  console.error(
    `\n  If this change is intended (e.g. a prompt improvement or palette recalibration),\n  re-baseline with:  npm run fidelity -- --update-baseline`,
  )
  process.exit(1)
}

main().catch((err) => {
  console.error('\nrender-fidelity failed:', err)
  process.exit(1)
})
