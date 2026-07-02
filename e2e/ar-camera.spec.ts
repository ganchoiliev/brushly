import { test, expect } from '@playwright/test'

/**
 * AR camera entry + graceful-degradation paths, with getUserMedia mocked so no
 * hardware (or human) is needed. The live-overlay happy path needs WebGPU and
 * is exercised manually / via the debug page's captureStream simulation.
 */

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
  await page.getByRole('button', { name: /use my camera/i }).click()

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

test('permission denied shows the recovery card and returns to upload', async ({ page }) => {
  await page.addInitScript(`
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Permission denied', 'NotAllowedError');
    };
  `)
  await page.goto('/visualizer')
  await page.getByRole('button', { name: /use my camera/i }).click()

  const dialog = page.getByRole('dialog', { name: 'Camera' })
  await expect(dialog.getByRole('alert')).toContainText('Camera access needed', {
    timeout: 20_000,
  })
  await expect(dialog.getByRole('button', { name: /try again/i })).toBeVisible()

  await dialog.getByRole('button', { name: /upload a photo instead/i }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: /use my camera/i })).toBeVisible()
})

test('camera-in-use (NotReadableError) shows the busy card with retry', async ({ page }) => {
  await page.addInitScript(`
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Could not start video source', 'NotReadableError');
    };
  `)
  await page.goto('/visualizer')
  await page.getByRole('button', { name: /use my camera/i }).click()

  const dialog = page.getByRole('dialog', { name: 'Camera' })
  await expect(dialog.getByRole('alert')).toContainText('Camera is in use', { timeout: 20_000 })
  await expect(dialog.getByRole('button', { name: /try again/i })).toBeVisible()
})
