import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { renderSchema } from '@/lib/visualizer/schemas'
import { getColor } from '@/lib/visualizer/palette'
import { buildPrompt } from '@/lib/visualizer/prompt'
import { getEngine } from '@/lib/visualizer/engine'
import { classifyImage } from '@/lib/visualizer/moderation'
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

  // Path must belong to this session — blocks reading another session's upload.
  if (!sourcePath.startsWith(`${sessionId}/`)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const color = getColor(colorId)
  if (!color) {
    return NextResponse.json({ error: 'Unknown colour' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1) Cache: reuse a prior successful render for identical inputs (session-scoped).
  //    Instant, free, and does not consume quota.
  {
    let cacheQuery = supabase
      .from('visualizer_renders')
      .select('id, result_path')
      .eq('session_id', sessionId)
      .eq('source_path', sourcePath)
      .eq('service', service)
      .eq('color_hex', color.hex)
      .eq('status', 'done')
      .not('result_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
    cacheQuery = finish ? cacheQuery.eq('finish', finish) : cacheQuery.is('finish', null)
    const { data: cached } = await cacheQuery.maybeSingle()
    if (cached?.result_path) {
      const [beforeUrl, afterUrl] = await Promise.all([
        signReadUrl(sourcePath),
        signReadUrl(cached.result_path),
      ])
      return NextResponse.json({ renderId: cached.id, beforeUrl, afterUrl, cached: true })
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

  // 6) Atomic quota check + increment (per session + per IP, per day).
  const ipHeader = request.headers.get('x-forwarded-for')
  const ip = ipHeader ? ipHeader.split(',')[0].trim() : null
  const ipHash = hashIp(ip)

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
  const prompt = buildPrompt(service, color, finish)
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
    return NextResponse.json({ error: 'Could not start render' }, { status: 500 })
  }

  try {
    const engine = getEngine()
    const result = await engine.editImage({
      imageBase64: src.base64,
      mimeType: src.mimeType,
      prompt,
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
    await supabase.from('visualizer_renders').update({ status: 'failed' }).eq('id', row.id)
    return NextResponse.json({ error: 'Render failed. Please try again.' }, { status: 502 })
  }
}
