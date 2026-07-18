import { test, expect, type Page } from '@playwright/test'

/**
 * Wizard flow with every paid/external API mocked at the network layer:
 * upload-url + Supabase storage PUT + render + lead. Exercises the UX
 * contracts — finish-aware render cache, cancel, the soft gate (dismissal
 * banner, phone validation), and the before/after reveal — without spending
 * a penny on real renders.
 */

const MOCK_LEAD_ID = '3f2f0e7e-9c1b-4d6a-8e5f-2a7b9c0d1e2f'

const mockRenderApis = async (page: Page, opts?: { renderDelayMs?: number }) => {
  // Distinct path per upload so a test can tell the room photo from the
  // wallpaper (and catch a sourcePath/wallpaperPath swap regression).
  let uploadN = 0
  await page.route('**/api/visualizer/upload-url', (route) =>
    route.fulfill({ json: { path: `test-session/photo-${++uploadN}.jpg`, token: 'tok' } }),
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
  // Mirrors the real API: leadId is what unlocks the one-tap quote request.
  await page.route('**/api/visualizer/lead', (route) =>
    route.fulfill({ json: { success: true, leadId: MOCK_LEAD_ID } }),
  )
  await page.route('**/api/visualizer/quote', (route) =>
    route.fulfill({ json: { success: true } }),
  )
  // Renders are paid — tests can assert exactly how many the UI requested.
  return { renderCount: () => renders }
}

/* dataLayer entries are Arguments objects — normalise for deep-equal. */
const gtagEvents = (page: Page) =>
  page.evaluate(() =>
    ((window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []).map((entry) =>
      Array.from(entry as ArrayLike<unknown>),
    ),
  )

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
  await page.getByRole('button', { name: 'See it on my walls' }).click()

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
  await expect(page.getByRole('button', { name: 'See it on my walls' })).toBeVisible()
})

test('look and colour taps only select — the CTA is the sole render trigger', async ({
  page,
}) => {
  const api = await mockRenderApis(page)
  await openDesignStep(page)

  // Nothing selected yet: the CTA is disabled with its helper alongside.
  const cta = page.getByRole('button', { name: 'See it on my walls' })
  await expect(cta).toBeDisabled()
  await expect(page.getByText('Tap a look, or pick a colour')).toBeVisible()

  // Look taps highlight the card (single-select) and never fire a render.
  const heritage = page.getByRole('button', { name: /heritage dark/i })
  const sage = page.getByRole('button', { name: /modern sage/i })
  await heritage.click()
  await expect(heritage).toHaveAttribute('aria-pressed', 'true')
  await sage.click()
  await expect(sage).toHaveAttribute('aria-pressed', 'true')
  await expect(heritage).toHaveAttribute('aria-pressed', 'false')

  // Colour swatches are selection-only too.
  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /green smoke/i }).click()

  await expect(cta).toBeEnabled()
  expect(api.renderCount()).toBe(0) // selection alone spent nothing

  // Only the CTA renders.
  await cta.click()
  await expect(page.getByRole('slider', { name: /compare/i })).toBeVisible({ timeout: 30_000 })
  expect(api.renderCount()).toBe(1)
})

test('the branded preloader is absent from /visualizer HTML but intact elsewhere', async ({
  page,
}) => {
  // SSR-level assertion: the overlay must not be in the served markup at all —
  // hiding it after hydration would still blank slow connections for seconds.
  const LOADER_MARKUP = 'fixed inset-0 z-[9999] flex flex-col items-center justify-center'
  const visualizer = await (await page.request.get('/visualizer')).text()
  expect(visualizer).not.toContain(LOADER_MARKUP)
  const home = await (await page.request.get('/')).text()
  expect(home).toContain(LOADER_MARKUP)
})

test('custom wallpaper: upload enables render without a colour and rides in the request', async ({
  page,
}) => {
  await mockRenderApis(page)
  const captured: { body?: Record<string, unknown> } = {}
  await page.route('**/api/visualizer/render', async (route) => {
    captured.body = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      json: { renderId: 'render-wp', beforeUrl: '/img/interior.webp', afterUrl: '/img/hallway.webp' },
    })
  })
  await openDesignStep(page)

  await page.getByRole('button', { name: /wallpaper feature walls/i }).click()
  await expect(page.getByText('Your own wallpaper', { exact: true })).toBeVisible()

  // Upload a wallpaper image; no colour is picked at any point.
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles('public/img/finishes.jpg')
  await expect(page.getByText('We’ll apply this wallpaper')).toBeVisible({ timeout: 20_000 })

  await page.getByRole('button', { name: 'See it on my walls' }).click()
  await expect(page.getByRole('slider', { name: /compare/i })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/wallpapering · your wallpaper/i)).toBeVisible()
  // Room photo = upload #1, wallpaper = upload #2 — they must be distinct and
  // in the right fields (a swap would send the room as the wallpaper).
  expect(captured.body?.sourcePath).toBe('test-session/photo-1.jpg')
  expect(captured.body?.wallpaperPath).toBe('test-session/photo-2.jpg')
  expect(captured.body?.service).toBe('wallpaper')
})

test('an in-flight render can be cancelled back to the design step', async ({ page }) => {
  await mockRenderApis(page, { renderDelayMs: 15_000 })
  await openDesignStep(page)

  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /hague blue/i }).click()
  await page.getByRole('button', { name: 'See it on my walls' }).click()

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
  await page.getByRole('button', { name: 'See it on my walls' }).click()
  await expect(page.getByRole('slider', { name: /compare/i })).toBeVisible({ timeout: 30_000 })

  // Second colour hits the gate. (The chooser remounts on the Looks tab.)
  await page.getByRole('button', { name: 'Try another colour' }).click()
  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /hague blue/i }).click()
  await page.getByRole('button', { name: 'See it on my walls' }).click()
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

test('quote CTA (anonymous): one quote-headed form; intent + render id ride the submission', async ({
  page,
}) => {
  await mockRenderApis(page)
  const leadPost: { body?: Record<string, unknown> } = {}
  await page.route('**/api/visualizer/lead', async (route) => {
    leadPost.body = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ json: { success: true, leadId: MOCK_LEAD_ID } })
  })
  await openDesignStep(page)

  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /green smoke/i }).click()
  await page.getByRole('button', { name: 'See it on my walls' }).click()
  await expect(page.getByRole('slider', { name: /compare/i })).toBeVisible({ timeout: 30_000 })

  // Primary CTA under the result opens the existing gate, re-headed for the
  // quote ask — same fields, one form.
  await page.getByRole('button', { name: 'Get a fixed quote for this room' }).click()
  await expect(page.getByText('Get your fixed quote')).toBeVisible()
  await page.getByPlaceholder('Your name').fill('Quote Person')
  await page.getByPlaceholder('Phone number').fill('07123456789')
  await page.getByRole('button', { name: 'Get my quote' }).click()

  await expect(page.getByText(/quote request received/i)).toBeVisible()
  // …and no second form after submitting.
  await expect(page.getByText('Get your fixed quote')).toHaveCount(0)
  expect(leadPost.body?.intent).toBe('quote_request')
  expect(leadPost.body?.quoteRenderId).toBe('render-1')
  expect(leadPost.body?.renderIds).toEqual(['render-1'])

  // The conversion ping path: the named event reaches the dataLayer (the Ads
  // conversion itself rides the same gtag pipe, label-gated by env).
  expect(await gtagEvents(page)).toContainEqual(['event', 'visualizer_quote_request'])
})

test('quote CTA (gated): one tap upgrades the existing lead — no second form', async ({
  page,
}) => {
  await mockRenderApis(page)
  const quotePost: { body?: Record<string, unknown> } = {}
  await page.route('**/api/visualizer/quote', async (route) => {
    quotePost.body = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ json: { success: true } })
  })
  await openDesignStep(page)

  await page.getByRole('button', { name: 'Colours', exact: true }).click()
  await page.getByRole('button', { name: /green smoke/i }).click()
  await page.getByRole('button', { name: 'See it on my walls' }).click()
  await expect(page.getByRole('slider', { name: /compare/i })).toBeVisible({ timeout: 30_000 })

  // Pass the gate via the (now secondary) save action.
  await page.getByRole('button', { name: 'Save my visualisation' }).click()
  await expect(page.getByText('Send me my visualisation')).toBeVisible()
  await page.getByPlaceholder('Your name').fill('Gated Person')
  await page.getByPlaceholder('Phone number').fill('07123456789')
  await page.getByRole('button', { name: 'Send my visualisation' }).click()
  await expect(page.getByText('Sent — thank you.')).toBeVisible()

  // The quote CTA survives saving; a gated visitor gets one-tap, never a form.
  await page.getByRole('button', { name: 'Get a fixed quote for this room' }).click()
  await expect(page.getByText(/quote request received/i)).toBeVisible()
  await expect(page.getByText('Get your fixed quote')).toHaveCount(0)
  expect(quotePost.body?.leadId).toBe(MOCK_LEAD_ID)
  expect(quotePost.body?.quoteRenderId).toBe('render-1')
  expect(quotePost.body?.renderIds).toEqual(['render-1'])
  expect(await gtagEvents(page)).toContainEqual(['event', 'visualizer_quote_request'])
})

test('live AR on desktop: QR hand-off modal, never the face-cam', async ({ page }) => {
  await page.goto('/visualizer')

  // Desktop is not live-capable (no touch-first pointer) — the click must
  // open the phone hand-off, not the webcam.
  await page.getByRole('button', { name: 'See colours live on your wall' }).click()
  await expect(page.getByText('This works best on your phone.')).toBeVisible()
  expect(await page.locator('video').count()).toBe(0)

  // Client-generated QR pointing at the live deep link, plus the escape hatch.
  const dialog = page.getByRole('dialog', { name: /live preview on your phone/i })
  await expect(dialog.locator('svg[role="img"]')).toBeVisible()
  await expect(dialog.getByText(/\/visualizer$/)).toBeVisible()

  // The fallback still reaches the existing webcam path: ARCamera mounts
  // (headless has no camera, so it lands on its honest error dialog — the
  // routing is what's under test).
  await dialog.getByRole('button', { name: 'use this device anyway' }).click()
  await expect(page.getByRole('dialog', { name: 'Camera' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('This works best on your phone.')).toHaveCount(0)
})
