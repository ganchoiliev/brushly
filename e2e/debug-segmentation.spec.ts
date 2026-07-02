import { test, expect } from '@playwright/test'

/**
 * Model regression gate: runs the REAL ONNX weights through the debug page on
 * the wasm/int8 path (works headless, no GPU needed). Catches a broken model
 * export, a bad onnxruntime-web upgrade (this repo already survived one
 * silent-miscompute bug on the WebGPU EP), or a corrupted /public/models file
 * — none of which the mocked unit tests can see.
 *
 * The page 404s in production builds, so this spec inherits the dev-server
 * webServer config (do not point it at a prod build).
 */

test('still segmentation on real weights (wasm/int8) yields a sane wall mask', async ({
  page,
}) => {
  test.setTimeout(180_000) // model download + wasm init can be slow cold
  await page.goto('/visualizer/debug-segmentation?ep=wasm')
  await expect(page.getByText('Model ready', { exact: false })).toBeVisible({ timeout: 120_000 })

  await page.getByRole('button', { name: 'Sample room' }).first().click()
  const stats = page.getByTestId('seg-stats')
  await expect(stats).toBeVisible({ timeout: 60_000 })
  await expect(stats).toContainText('wasm/int8')

  const text = (await stats.textContent()) ?? ''
  const wallPct = Number(/wall\s+(\d+)%/.exec(text)?.[1] ?? NaN)
  // A sane living-room photo segments to a solid-but-not-total wall fraction.
  // Way outside this band means the model (or preprocessing) is broken.
  expect(wallPct).toBeGreaterThanOrEqual(10)
  expect(wallPct).toBeLessThanOrEqual(80)
})
