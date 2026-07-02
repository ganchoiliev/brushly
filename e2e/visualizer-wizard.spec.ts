import { test, expect, type Page } from '@playwright/test'

/**
 * Wizard flow with every paid/external API mocked at the network layer:
 * upload-url + Supabase storage PUT + render + lead. Exercises the UX
 * contracts — finish-aware render cache, cancel, the soft gate (dismissal
 * banner, phone validation), and the before/after reveal — without spending
 * a penny on real renders.
 */

const mockRenderApis = async (page: Page, opts?: { renderDelayMs?: number }) => {
  await page.route('**/api/visualizer/upload-url', (route) =>
    route.fulfill({ json: { path: 'test-session/photo.jpg', token: 'tok' } }),
  )
  // supabase-js uploadToSignedUrl PUTs to /storage/v1/object/upload/sign/…
  await page.route('**/object/upload/sign/**', (route) =>
    route.fulfill({ json: { Key: 'visualizer/test-session/photo.jpg' } }),
  )
  let renders = 0
  await page.route('**/api/visualizer/render', async (route) => {
    renders += 1
    if (opts?.renderDelayMs) await new Promise((r) => setTimeout(r, opts.renderDelayMs))
    await route.fulfill({
      json: {
        renderId: `render-${renders}`,
        beforeUrl: '/img/interior.webp',
        afterUrl: '/img/hallway.webp',
      },
    })
  })
  await page.route('**/api/visualizer/lead', (route) => route.fulfill({ json: { ok: true } }))
}

const openDesignStep = async (page: Page) => {
  await page.goto('/visualizer')
  await page.getByRole('button', { name: /living room/i }).click()
  await expect(page.getByText('Choose your look')).toBeVisible({ timeout: 20_000 })
}

test('sample → design → render → result, with a finish-aware cache', async ({ page }) => {
  await mockRenderApis(page)
  await page.goto('/visualizer')

  // The dropzone input must not force the camera — mobile users need their
  // photo library (the camera has its own dedicated AR button).
  await expect(page.locator('input[type="file"]')).not.toHaveAttribute('capture', /.+/)

  await page.getByRole('button', { name: /living room/i }).click()
  await expect(page.getByText('Choose your look')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'Use a different photo' })).toBeVisible()

  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /green smoke/i }).click()
  await page.getByRole('button', { name: 'See it', exact: true }).click()

  // Result: accessible slider + touch hint + the render's own combo described
  const slider = page.getByRole('slider', { name: /compare before and after/i })
  await expect(slider).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Drag to compare')).toBeVisible()
  await expect(page.getByText(/green smoke · matte emulsion/i)).toBeVisible()

  // Same combo is cached…
  await page.getByRole('button', { name: 'Try another colour' }).click()
  await expect(page.getByRole('button', { name: 'See it again' })).toBeVisible()
  // …but a different finish is a different render, not a silent cache hit.
  await page.getByRole('button', { name: 'Gloss', exact: true }).click()
  await expect(page.getByRole('button', { name: 'See it', exact: true })).toBeVisible()
})

test('an in-flight render can be cancelled back to the design step', async ({ page }) => {
  await mockRenderApis(page, { renderDelayMs: 15_000 })
  await openDesignStep(page)

  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /hague blue/i }).click()
  await page.getByRole('button', { name: 'See it', exact: true }).click()

  await expect(page.getByText('Painting your room…')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByText('Choose your look')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Render failed')).toHaveCount(0)
  await expect(page.getByText(/longer than usual/)).toHaveCount(0)
})

test('gate: dismissal shows the inline banner, phone is validated, submit unlocks', async ({
  page,
}) => {
  await mockRenderApis(page)
  await openDesignStep(page)

  // Free render first.
  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /green smoke/i }).click()
  await page.getByRole('button', { name: 'See it', exact: true }).click()
  await expect(page.getByRole('slider', { name: /compare/i })).toBeVisible({ timeout: 30_000 })

  // Second colour hits the gate. (The chooser remounts on the Looks tab.)
  await page.getByRole('button', { name: 'Try another colour' }).click()
  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /hague blue/i }).click()
  await page.getByRole('button', { name: 'See it', exact: true }).click()
  await expect(page.getByText('Keep experimenting')).toBeVisible()

  // Dismissing explains the value exchange inline instead of a dead-end.
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByText(/free preview is used/i)).toBeVisible()
  await page.getByRole('button', { name: /unlock more colours/i }).click()

  // Fat-fingered phone numbers are caught before they become lost leads.
  await page.getByPlaceholder('Your name').fill('Test Person')
  await page.getByPlaceholder('Phone number').fill('123')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText(/looks too short/i)).toBeVisible()

  await page.getByPlaceholder('Phone number').fill('07123456789')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('slider', { name: /compare/i })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/hague blue · matte emulsion/i)).toBeVisible()
})
