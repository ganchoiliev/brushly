import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { renderSchema } from '@/lib/visualizer/schemas'
import { getColor } from '@/lib/visualizer/palette'
import { buildPrompt } from '@/lib/visualizer/prompt'
import { getEngine, EngineBlockedError } from '@/lib/visualizer/engine'
import { classifyImage } from '@/lib/visualizer/moderation'
import { solidSwatchPng } from '@/lib/visualizer/swatch'
import { closestAspectRatio, jpegDimensions } from '@/lib/visualizer/imageMeta'
import { downloadAsBase64, uploadResult, signReadUrl } from '@/lib/visualizer/storage'
import { createAdminClient } from '@/lib/supabase/admin'

// Vertex/Gemini Pro renders take ~10–20s; Pro plan + Fluid compute headroom.
export const maxDuration = 60

const MAX_PER_SESSION = Number(process.env.VISUALIZER_MAX_PER_SESSION ?? 8)
const MAX_PER_IP = Number(process.env.VISUALIZER_MAX_PER_IP ?? 30)
const EST_COST_PENCE = Number(process.env.VISUALIZER_EST_COST_PENCE ?? 12)
const MONTHLY_CAP_PENCE = Number(process.env.VISUALIZER_MONTHLY_CAP_PENCE ?? 0)

function hashIp(ip: string | null): string | null {
  if (!ip) return null
  const salt = process.env.VISUALIZER_IP_SALT ?? 'brushly'
  return crypto.createHash('sha256').update(salt + ip).digest('hex').slice(0, 32)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const parsed = renderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { sessionId, sourcePath, service, colorId, finish } = parsed.data
  // Custom wallpaper only applies to the wallpaper service.
  const wallpaperPath = service === 'wallpaper' ? parsed.data.wallpaperPath : undefined

  // Paths must belong to this session — blocks reading another session's upload.
  // The `..` guard matters: the path regex permits '.' and '/', and Supabase
  // storage URL-normalises dot segments, so 'sess/../victim/x.jpg' would pass a
  // bare startsWith and then resolve to the victim's object.
  const ownsPath = (p: string) => p.startsWith(`${sessionId}/`) && !p.split('/').includes('..')
  if (!ownsPath(sourcePath)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }
  if (wallpaperPath && !ownsPath(wallpaperPath)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const color = getColor(colorId)
  if (!color) {
    return NextResponse.json({ error: 'Unknown colour' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Built before the cache lookup: matching on the prompt text means any
  // prompt-engineering change automatically invalidates stale cached renders.
  // The wallpaper path is appended as an identity token so the cache and the
  // in-flight guard distinguish renders that differ only by wallpaper file
  // (there is no dedicated DB column; the model ignores the bracketed token).
  const prompt =
    buildPrompt(service, color, finish, { customWallpaper: Boolean(wallpaperPath) }) +
    (wallpaperPath ? ` [wallpaper:${wallpaperPath}]` : '')

  // 1) Cache: reuse a prior successful render for identical inputs (session-scoped).
  //    Instant, free, and does not consume quota.
  {
    let cacheQuery = supabase
      .from('visualizer_renders')
      .select('id, result_path')
      .eq('session_id', sessionId)
      .eq('source_path', sourcePath)
      .eq('service', service)
      .eq('prompt', prompt)
      .eq('status', 'done')
      .not('result_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
    // A custom-wallpaper render is fully determined by source + wallpaper (the
    // prompt token). Colour/finish are irrelevant, so matching on them would
    // just cause misses and re-bill an identical render.
    if (!wallpaperPath) {
      cacheQuery = cacheQuery.eq('color_hex', color.hex)
      cacheQuery = finish ? cacheQuery.eq('finish', finish) : cacheQuery.is('finish', null)
    }
    const { data: cached } = await cacheQuery.maybeSingle()
    if (cached?.result_path) {
      const [beforeUrl, afterUrl] = await Promise.all([
        signReadUrl(sourcePath),
        signReadUrl(cached.result_path),
      ])
      return NextResponse.json({ renderId: cached.id, beforeUrl, afterUrl, cached: true })
    }
  }

  // 1.5) Same combo already rendering? Happens when the user cancels
  //      client-side (the server keeps going) and immediately retries — the
  //      retry must not pay for a second render of work that's already in
  //      flight. Wait briefly for the running one and serve it as a cache hit.
  {
    let inflightQuery = supabase
      .from('visualizer_renders')
      .select('id')
      .eq('session_id', sessionId)
      .eq('source_path', sourcePath)
      .eq('service', service)
      .eq('prompt', prompt)
      .eq('status', 'processing')
      .gte('created_at', new Date(Date.now() - 90_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
    if (!wallpaperPath) {
      inflightQuery = inflightQuery.eq('color_hex', color.hex)
      inflightQuery = finish ? inflightQuery.eq('finish', finish) : inflightQuery.is('finish', null)
    }
    const { data: inflight } = await inflightQuery.maybeSingle()
    if (inflight) {
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      const waitStart = Date.now()
      let settled: 'done' | 'failed' | null = null
      let resultPath: string | null = null
      while (Date.now() - waitStart < 25_000) {
        await sleep(2_000)
        const { data: row } = await supabase
          .from('visualizer_renders')
          .select('status, result_path')
          .eq('id', inflight.id)
          .single()
        if (row?.status === 'done' && row.result_path) {
          settled = 'done'
          resultPath = row.result_path
          break
        }
        if (row?.status === 'failed') {
          settled = 'failed'
          break
        }
      }
      if (settled === 'done' && resultPath) {
        const [beforeUrl, afterUrl] = await Promise.all([
          signReadUrl(sourcePath),
          signReadUrl(resultPath),
        ])
        return NextResponse.json({ renderId: inflight.id, beforeUrl, afterUrl, cached: true })
      }
      // Only fall through to a fresh render when the in-flight one failed
      // FAST — a long wait plus a full render would blow the 60s maxDuration.
      if (!(settled === 'failed' && Date.now() - waitStart <= 8_000)) {
        return NextResponse.json(
          { error: 'That look is still being rendered — give it a few seconds and try again.' },
          { status: 503 },
        )
      }
    }
  }

  // 2) Kill switch.
  if (process.env.VISUALIZER_ENABLED === 'false') {
    return NextResponse.json(
      { error: 'The visualiser is paused right now — please check back soon.' },
      { status: 503 },
    )
  }

  // 3) Monthly spend cap (bounds worst-case cost on a free public tool).
  if (MONTHLY_CAP_PENCE > 0) {
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const { data: monthRows } = await supabase
      .from('visualizer_renders')
      .select('cost_pence')
      .gte('created_at', monthStart.toISOString())
    const spent = (monthRows ?? []).reduce((s, r) => s + (r.cost_pence ?? 0), 0)
    if (spent >= MONTHLY_CAP_PENCE) {
      return NextResponse.json(
        {
          error:
            'The visualiser is taking a short break — book a free colour consult and we’ll create it for you.',
        },
        { status: 503 },
      )
    }
  }

  // 4) Fetch the source once (used for moderation and the render).
  let src: { base64: string; mimeType: string }
  try {
    src = await downloadAsBase64(sourcePath)
  } catch (error) {
    console.error('visualizer source download failed:', error)
    return NextResponse.json({ error: 'Could not read your photo. Please re-upload.' }, { status: 400 })
  }

  // 5) Moderation — once per uploaded photo (skip on subsequent colours).
  {
    const { data: prior } = await supabase
      .from('visualizer_renders')
      .select('id')
      .eq('source_path', sourcePath)
      .limit(1)
      .maybeSingle()
    if (!prior) {
      const verdict = await classifyImage(src.base64, src.mimeType)
      if (!verdict.ok) {
        return NextResponse.json(
          {
            error:
              'Please upload a clear photo of a room or a building exterior so we can visualise it.',
          },
          { status: 422 },
        )
      }
    }
  }

  // 5b) Moderate the customer's wallpaper too — it's a user-controlled image
  //     that gets faithfully composited onto the room and served under the
  //     brand, so it can't skip the pre-spend safety gate. 'safe' mode: any
  //     pattern/screenshot is fine, only disallowed content is blocked.
  let wallpaperSrc: { base64: string; mimeType: string } | null = null
  if (wallpaperPath) {
    try {
      wallpaperSrc = await downloadAsBase64(wallpaperPath)
    } catch (error) {
      console.error('visualizer wallpaper download failed:', error)
      return NextResponse.json(
        { error: 'Could not read your wallpaper image. Please re-upload it.' },
        { status: 400 },
      )
    }
    const verdict = await classifyImage(wallpaperSrc.base64, wallpaperSrc.mimeType, 'safe')
    if (!verdict.ok) {
      return NextResponse.json(
        { error: 'That wallpaper image can’t be used. Please try a different one.' },
        { status: 422 },
      )
    }
  }

  // 6) Atomic quota check + increment (per session + per IP, per day).
  const ipHeader = request.headers.get('x-forwarded-for')
  const ip = ipHeader ? ipHeader.split(',')[0].trim() : null
  const ipHash = hashIp(ip)

  // A failed render must hand the visitor's daily allowance back — these are
  // warm leads being told 'limit_reached' otherwise. Requires migration 0008
  // (visualizer_refund); degrades to a warning until it's applied. Defined
  // before the row insert so every post-increment failure path can call it.
  const refundQuota = async () => {
    const { error: refundErr } = await supabase.rpc('visualizer_refund', {
      p_session: sessionId,
      p_ip_hash: ipHash,
      p_est_cost_pence: EST_COST_PENCE,
    })
    if (refundErr) {
      console.warn('visualizer refund failed (apply migration 0008):', refundErr.message)
    }
  }

  const { data: quota, error: quotaErr } = await supabase.rpc('visualizer_check_and_increment', {
    p_session: sessionId,
    p_ip_hash: ipHash,
    p_max_per_session: MAX_PER_SESSION,
    p_max_per_ip: MAX_PER_IP,
    p_est_cost_pence: EST_COST_PENCE,
  })
  if (quotaErr) {
    console.error('visualizer quota rpc failed:', quotaErr)
    return NextResponse.json({ error: 'Service busy, try again' }, { status: 500 })
  }
  if (!quota?.allowed) {
    return NextResponse.json({ error: 'limit_reached', reason: quota?.reason }, { status: 429 })
  }

  // 7) Record the attempt, then render.
  const { data: row, error: insErr } = await supabase
    .from('visualizer_renders')
    .insert({
      session_id: sessionId,
      ip_hash: ipHash,
      service,
      color_label: color.label,
      color_hex: color.hex,
      finish: finish ?? null,
      prompt,
      source_path: sourcePath,
      status: 'processing',
      cost_pence: EST_COST_PENCE,
    })
    .select('id')
    .single()
  if (insErr || !row) {
    console.error('visualizer render insert failed:', insErr)
    // The quota was already incremented — hand it back so a transient DB blip
    // doesn't silently burn the visitor's daily allowance for no render.
    await refundQuota()
    return NextResponse.json({ error: 'Could not start render' }, { status: 500 })
  }

  try {
    const engine = getEngine()
    // The second image part: the customer's wallpaper when supplied (already
    // downloaded + moderated above), else a rendered swatch of the exact
    // target colour (hex-as-text alone is the weakest link for a paint brand).
    // The prompt's wording matches whichever reference is attached.
    const reference: { imageBase64: string; mimeType: string } = wallpaperSrc
      ? { imageBase64: wallpaperSrc.base64, mimeType: wallpaperSrc.mimeType }
      : (() => {
          const swatch = solidSwatchPng(color.hex)
          return { imageBase64: swatch.toString('base64'), mimeType: 'image/png' }
        })()
    // Pin the output to the source's shape so the before/after slider
    // compares like with like (dropped gracefully if the API rejects it).
    const dims = jpegDimensions(Buffer.from(src.base64, 'base64'))
    const result = await engine.editImage({
      imageBase64: src.base64,
      mimeType: src.mimeType,
      prompt,
      references: [reference],
      aspectRatio: dims ? closestAspectRatio(dims.width, dims.height) : undefined,
    })

    const ext = result.mimeType.includes('png') ? 'png' : 'jpg'
    const resultPath = `${sessionId}/result-${row.id}.${ext}`
    await uploadResult(resultPath, result.imageBase64, result.mimeType)

    await supabase
      .from('visualizer_renders')
      .update({ result_path: resultPath, model: result.model, status: 'done' })
      .eq('id', row.id)

    const [beforeUrl, afterUrl] = await Promise.all([
      signReadUrl(sourcePath),
      signReadUrl(resultPath),
    ])

    return NextResponse.json({ renderId: row.id, beforeUrl, afterUrl })
  } catch (error) {
    console.error('visualizer render failed:', error)
    // cost_pence: 0 — a failed render spent (almost) nothing, so it must not
    // eat into the monthly cap; the day quota is handed back via the RPC.
    await supabase
      .from('visualizer_renders')
      .update({ status: 'failed', cost_pence: 0 })
      .eq('id', row.id)
    await refundQuota()
    if (error instanceof EngineBlockedError) {
      // Permanent for this photo — same friendly copy as the moderation gate,
      // and a 422 so the client doesn't invite quota-burning retries.
      return NextResponse.json(
        {
          error:
            'Please upload a clear photo of a room or a building exterior so we can visualise it.',
        },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'Render failed. Please try again.' }, { status: 502 })
  }
}
