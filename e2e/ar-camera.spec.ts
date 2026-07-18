import { test, expect, type Page } from '@playwright/test'

/**
 * AR camera entry + graceful-degradation paths, with getUserMedia mocked so no
 * hardware (or human) is needed. The live-overlay happy path needs WebGPU and
 * is exercised manually / via the debug page's captureStream simulation.
 */

// This desktop project is not live-capable (no touch-first pointer), so the
// live button opens the phone hand-off modal first — reach the webcam path
// through its escape hatch, exactly as a real desktop user would.
const openLiveCamera = async (page: Page) => {
  await page.getByRole('button', { name: /see colours live/i }).click()
  await page.getByRole('button', { name: 'use this device anyway' }).click()
}

// A canvas-backed MediaStream stands in for the camera.
const FAKE_CAMERA = `
  navigator.mediaDevices.getUserMedia = async () => {
    const c = document.createElement('canvas');
    c.width = 1280; c.height = 720;
    const ctx = c.getContext('2d');
    let t = 0;
    setInterval(() => {
      t += 1;
      ctx.fillStyle = 'hsl(' + (t * 7 % 360) + ', 40%, 60%)';
      ctx.fillRect(0, 0, 1280, 720);
    }, 100);
    return c.captureStream(15);
  };
`

test('AR entry: no WebGPU degrades to capture-only without fetching the model', async ({
  page,
}) => {
  const modelRequests: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/models/')) modelRequests.push(r.url())
  })
  await page.addInitScript(
    `Object.defineProperty(navigator, 'gpu', { get: () => undefined });` + FAKE_CAMERA,
  )
  await page.goto('/visualizer')
  await openLiveCamera(page)

  const dialog = page.getByRole('dialog', { name: 'Camera' })
  await expect(dialog).toBeVisible({ timeout: 20_000 })

  // Live view: controls + shutter are up and usable
  await expect(dialog.getByRole('button', { name: 'Capture and render this look' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(dialog.getByRole('group', { name: 'Service' })).toBeVisible()
  await expect(dialog.getByRole('group', { name: 'Colour' })).toBeVisible()

  // Capability pre-check: fallback message shown, and crucially the 8 MB
  // model was never requested.
  await expect(dialog.getByText(/live preview isn.t supported on this device/i)).toBeVisible({
    timeout: 20_000,
  })
  expect(modelRequests).toHaveLength(0)
})

test('shutter: clean capture → instant on-device preview → mocked render result', async ({
  page,
}) => {
  // No WebGPU: live overlay falls back to capture-only, and the instant
  // preview after the shutter exercises the real wasm/int8 model.
  await page.addInitScript(
    `Object.defineProperty(navigator, 'gpu', { get: () => undefined });` + FAKE_CAMERA,
  )
  await page.route('**/api/visualizer/upload-url', (route) =>
    route.fulfill({ json: { path: 'test-session/photo.jpg', token: 'tok' } }),
  )
  await page.route('**/object/upload/sign/**', (route) =>
    route.fulfill({ json: { Key: 'visualizer/test-session/photo.jpg' } }),
  )
  // Slow mocked render so the progress screen (and the on-device instant
  // preview that races it) is observable.
  await page.route('**/api/visualizer/render', async (route) => {
    await new Promise((r) => setTimeout(r, 25_000))
    await route.fulfill({
      json: {
        renderId: 'render-ar-1',
        beforeUrl: '/img/interior.webp',
        afterUrl: '/img/hallway.webp',
      },
    })
  })

  await page.goto('/visualizer')
  await openLiveCamera(page)
  const dialog = page.getByRole('dialog', { name: 'Camera' })
  const shutter = dialog.getByRole('button', { name: 'Capture and render this look' })
  await expect(shutter).toBeVisible({ timeout: 20_000 })
  await shutter.click()

  // The progress screen carries the flow through upload + render…
  await expect(page.getByText('Painting your room…')).toBeVisible({ timeout: 15_000 })
  // …and the on-device recolour lands while the photoreal render cooks.
  await expect(page.getByText('Instant preview')).toBeVisible({ timeout: 45_000 })
  // The mocked render then resolves into the before/after reveal.
  await expect(page.getByRole('slider', { name: /compare/i })).toBeVisible({ timeout: 60_000 })
})

test('permission denied shows the recovery card and returns to upload', async ({ page }) => {
  await page.addInitScript(`
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Permission denied', 'NotAllowedError');
    };
  `)
  await page.goto('/visualizer')
  await openLiveCamera(page)

  const dialog = page.getByRole('dialog', { name: 'Camera' })
  await expect(dialog.getByRole('alert')).toContainText('Camera access needed', {
    timeout: 20_000,
  })
  await expect(dialog.getByRole('button', { name: /try again/i })).toBeVisible()

  await dialog.getByRole('button', { name: /upload a photo instead/i }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: /see colours live/i })).toBeVisible()
})

test('camera-in-use (NotReadableError) shows the busy card with retry', async ({ page }) => {
  await page.addInitScript(`
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Could not start video source', 'NotReadableError');
    };
  `)
  await page.goto('/visualizer')
  await openLiveCamera(page)

  const dialog = page.getByRole('dialog', { name: 'Camera' })
  await expect(dialog.getByRole('alert')).toContainText('Camera is in use', { timeout: 20_000 })
  await expect(dialog.getByRole('button', { name: /try again/i })).toBeVisible()
})
