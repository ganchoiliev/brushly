import { test, expect, devices, type Page } from '@playwright/test'

/**
 * Real-phone QA regressions, reproduced under mobile emulation (touch-primary
 * coarse pointer, phone viewport):
 *
 * 1. "See colours live on your wall" must attempt the camera directly — the
 *    desktop QR hand-off modal appeared on real handsets because the old gate
 *    consulted enumerateDevices before camera permission (no labels/facing
 *    data pre-permission → failed closed). The modal is now only the fallback
 *    for a hard camera failure.
 * 2. "See it on my walls" must keep the viewport on the wizard: swapping the
 *    tall design step for the short progress screen shrank the page and the
 *    browser clamped scroll to the bottom — visitors stared at the footer
 *    contact bar while the render happened off-screen.
 */

test.use({ ...devices['Pixel 7'] })

// A canvas-backed MediaStream stands in for the camera (headless has none).
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

const mockRenderApis = async (page: Page, opts?: { renderDelayMs?: number }) => {
  await page.route('**/api/visualizer/upload-url', (route) =>
    route.fulfill({ json: { path: 'test-session/photo-1.jpg', token: 'tok' } }),
  )
  await page.route('**/object/upload/sign/**', (route) =>
    route.fulfill({ json: { Key: 'visualizer/test-session/photo.jpg' } }),
  )
  await page.route('**/api/visualizer/render', async (route) => {
    if (opts?.renderDelayMs) await new Promise((r) => setTimeout(r, opts.renderDelayMs))
    await route.fulfill({
      json: {
        renderId: 'render-1',
        beforeUrl: '/img/interior.webp',
        afterUrl: '/img/hallway.webp',
      },
    })
  })
}

test('live button on a phone opens the camera directly — never the QR hand-off', async ({
  page,
}) => {
  await page.addInitScript(FAKE_CAMERA)
  await page.goto('/visualizer')

  await page.getByRole('button', { name: 'See colours live on your wall' }).click()

  // The camera dialog is the live path; the phone must never see the modal.
  await expect(page.getByRole('dialog', { name: 'Camera' })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('This works best on your phone.')).toHaveCount(0)
})

test('hard camera failure on a phone falls back to the hand-off modal', async ({ page }) => {
  await page.addInitScript(`
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Permission denied', 'NotAllowedError');
    };
  `)
  await page.goto('/visualizer')

  await page.getByRole('button', { name: 'See colours live on your wall' }).click()

  // The attempt ran and hard-failed → the QR hand-off replaces the camera.
  await expect(page.getByText('This works best on your phone.')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('dialog', { name: 'Camera' })).toHaveCount(0)
})

test('?live=1 deep link on a phone goes straight into the camera', async ({ page }) => {
  await page.addInitScript(FAKE_CAMERA)
  await page.goto('/visualizer?live=1')

  // No tap needed — the scanned link always attempts the live path.
  await expect(page.getByRole('dialog', { name: 'Camera' })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('This works best on your phone.')).toHaveCount(0)
})

test('render tap keeps the viewport on the wizard: progress in place, result in view', async ({
  page,
}) => {
  await mockRenderApis(page, { renderDelayMs: 5_000 })
  await page.goto('/visualizer')

  // Sample room → design step, pick a colour so the CTA arms.
  await page.getByRole('button', { name: /living room/i }).click()
  await expect(page.getByText('Choose your look')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /green smoke/i }).click()

  // The CTA sits at the bottom of the tall design step — tapping it used to
  // strand the viewport at the page footer while the page collapsed.
  await page.getByRole('button', { name: 'See it on my walls' }).click()

  // In-place loading state, actually inside the viewport, while the render
  // is still in flight (the mock holds it open for 5s).
  const progress = page.getByText('Painting your room…')
  await expect(progress).toBeVisible({ timeout: 3_000 })
  await expect(progress).toBeInViewport({ timeout: 3_000 })

  // When the result mounts, the before/after container is scrolled into view.
  const slider = page.getByRole('slider', { name: /compare before and after/i })
  await expect(slider).toBeVisible({ timeout: 30_000 })
  await expect(slider).toBeInViewport({ timeout: 5_000 })
})

test('cached re-render ("See it again") also lands the viewport on the result', async ({
  page,
}) => {
  await mockRenderApis(page)
  await page.goto('/visualizer')

  await page.getByRole('button', { name: /living room/i }).click()
  await expect(page.getByText('Choose your look')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /green smoke/i }).click()
  await page.getByRole('button', { name: 'See it on my walls' }).click()
  const slider = page.getByRole('slider', { name: /compare before and after/i })
  await expect(slider).toBeVisible({ timeout: 30_000 })

  // Back to the design step, then re-open the same (cached) combo — no
  // progress phase this time, so the result path must scroll on its own.
  await page.getByRole('button', { name: 'Try another colour' }).click()
  await expect(page.getByText('Choose your look')).toBeVisible()
  await page.getByRole('button', { name: 'See it again' }).click()
  await expect(slider).toBeVisible({ timeout: 10_000 })
  await expect(slider).toBeInViewport({ timeout: 5_000 })
})
