# Render-fidelity harness (moat guard)

A small, runnable **script** — _not_ CI — that scores the visualiser render
pipeline on two things that make or break the product:

1. **Wall-colour accuracy** — the CIEDE2000 ΔE between the rendered wall's median
   colour and the **target paint hex**. The exact hex is what actually gets
   painted (`swatch.ts` sends it as a solid PNG, the strongest colour signal the
   model gets), so a silent prompt/pipeline change that regresses colour is a
   direct hit to the moat.
2. **Edge bleed** — how much the pixels _just outside_ the wall mask change
   between before and after. A faithful repaint barely touches them; a large
   change means paint leaked onto furniture/windows/trim.

It runs over a few fixed before-photos with **hand-drawn wall masks**, prints a
scored table, and diffs against a committed **mock baseline** so future prompt or
multi-surface changes are _provable_, not vibes.

> This slice changes **nothing** in the live render path. It only _imports_
> `prompt.ts`, `swatch.ts`, `imageMeta.ts`, `palette.ts` and the engine
> interface, and mirrors the exact call the render route makes.

---

## Run it

### Mock (default — free, deterministic, no credentials)

```bash
npm run fidelity                      # score + compare against baseline.json
npm run fidelity -- --update-baseline # (re)write the committed baseline
```

The default engine is `MockEngine`, instantiated directly (the `getEngine()`
factory imports `server-only`, which throws under `tsx`). Mock **echoes the
source photo unchanged**, so:

> ⚠️ **In mock mode, ΔE measures the _harness_, not colour accuracy.** Because
> the wall isn't actually repainted, ΔE is just the distance from each fixture's
> real wall colour to the target paint — a fixed, deterministic number. What mock
> mode _does_ guarantee is that the whole pipeline (swatch build → prompt build →
> mask → sharp decode → median-Lab → CIEDE2000 → baseline diff) runs end-to-end
> and is regression-guarded. Bleed is exactly `0` in mock (before == after).
> **True colour accuracy needs a deliberate real-engine run** (below).

### Real engine (⚠️ spends money + hits quota)

Only ever runs when you pass `--engine=vertex|gemini` (or set
`FIDELITY_ENGINE`). A bare/typo'd/default invocation can **never** spend — it
lands on mock. Even with `--engine`, nothing is sent without `--confirm-spend`;
without it you get a loud warning and a dry-run description.

Real engine modules are `server-only`, so run them with the `react-server`
export condition:

```bash
# Dry run — prints the cost/quota warning and exits WITHOUT spending:
npx tsx scripts/render-fidelity.ts --engine=vertex

# For real (billable). Needs creds + the react-server condition:
npx tsx --conditions=react-server scripts/render-fidelity.ts --engine=vertex --confirm-spend
```

| Engine   | Auth env var                                | Selected by            |
| -------- | ------------------------------------------- | ---------------------- |
| `vertex` | `GCP_SERVICE_ACCOUNT_KEY` (service-account) | `--engine=vertex`      |
| `gemini` | `GEMINI_API_KEY` (Developer API)            | `--engine=gemini`      |

A real run makes **one API call per (fixture × colour)** — 9 calls for the
current fixtures. Real-engine baselines are written to
`baseline.<engine>.local.json`, which `.gitignore` keeps out of the repo:
**never commit a paid baseline.**

---

## Pass / regress

Without `--update-baseline`, the script compares the current run to the saved
baseline and **exits non-zero if any metric got worse beyond tolerance**,
printing exactly which metric on which row:

- ΔE worse by **> 1.5** (`FIDELITY_TOL_DELTAE`)
- bleed worse by **> 1.0** (`FIDELITY_TOL_BLEED`)
- any structural drift (added/missing row, changed engine or working params)

Improvements are never failures. Exit `0` = pass, `1` = regression (or no
baseline yet). When a change is _intended_ (a prompt improvement, a palette
recalibration), re-baseline with `--update-baseline`.

Because the target hexes come from `palette.ts` at runtime, a **legitimate
palette recalibration will change ΔE and require a fresh baseline** — that's the
tripwire working, not a bug.

---

## Determinism

The committed `baseline.json` re-derives byte-for-byte on the same machine: fixed
working resolution, floats rounded to 4 dp, results sorted by `(fixtureId,
colorId)` with plain code-unit comparison (no locale, no Map ordering), and the
volatile `generatedAt` is excluded from the baseline. Across different
`sharp`/`libvips` builds the resampled pixels can differ in the last digit; the
pass/regress tolerances (≫ any sub-pixel resample noise) absorb that, and
`--update-baseline` regenerates if you ever need to.

---

## Design notes

- **Fixed manual masks, no segmentation.** `mask.ts` masks are hand-drawn
  normalised rectangles. Deliberately _not_ ONNX/`calibrateRender()`: a learned
  mask would drift model-version to model-version and make the baseline
  untrustworthy.
- **Median-in-linear discipline.** The wall colour is a per-channel **median in
  linear light** (highlights/shadows fall in the tails → robust reflectance),
  borrowed from `calibration.ts`'s `extractWallCalibration`. It uses the standard
  IEC 61966-2-1 sRGB curve throughout (one consistent colour space) rather than
  that module's pow-2.2 approximation, so `hexToLab` matches any reference
  sRGB→Lab converter and the ΔE is colorimetrically standard. See the header of
  `deltaE.ts`.
- **Same call as production.** `harness.ts` sends the source photo, then a single
  solid-colour swatch reference (base64 **string**), then the constrained-edit
  prompt, with `closestAspectRatio(jpegDimensions(...))` — mirroring
  `app/api/visualizer/render/route.ts` exactly. It never touches Supabase,
  quotas, or the monthly spend cap.
- **Fixtures.** `fixtures/*.jpg` are small (long-edge 512) downscaled copies of
  existing brushly room/exterior photos, committed here so the baseline stays
  stable even if the marketing images change. Masks + palette ids live in
  `fixtures/manifest.json` and are validated (every `testColorId` must resolve
  via `getColor`) at import.

## Files

| File               | Purpose                                                        |
| ------------------ | ------------------------------------------------------------- |
| `deltaE.ts`        | sRGB→Lab + CIEDE2000 + median-over-masked-pixels (pure)       |
| `mask.ts`          | wall-rect → wall pixels / just-outside edge band              |
| `fixtures.ts`      | load + validate `fixtures/manifest.json` and the jpgs         |
| `harness.ts`       | engine-agnostic scorer + baseline diff (byte-stable report)   |
| `baseline.json`    | committed **mock** baseline (deterministic)                   |
| `../../../../scripts/render-fidelity.ts` | the runnable command (`npm run fidelity`)       |
