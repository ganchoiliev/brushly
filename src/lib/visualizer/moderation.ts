import 'server-only'
import { vertexRequestContext } from './engine/vertex'

interface ModerationResult {
  ok: boolean
  reason: string
}

const CLASSIFY_MODEL = process.env.VISUALIZER_MODERATION_MODEL || 'gemini-2.5-flash'

/** Transport matching the deployment: Vertex (EU-resident, SA auth) when the
    render engine is Vertex, else the Developer API key. Null = no transport
    available (the gate then fails open with a loud log). */
async function classifierContext(): Promise<{
  url: string
  headers: Record<string, string>
} | null> {
  if (process.env.VISUALIZER_ENGINE === 'vertex') {
    try {
      return await vertexRequestContext(CLASSIFY_MODEL)
    } catch (error) {
      console.error('moderation: vertex context failed:', error)
      return null
    }
  }
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${CLASSIFY_MODEL}:generateContent`,
    headers: { 'x-goog-api-key': apiKey },
  }
}

/* Cheap pre-spend gate: is this a real interior/exterior building photo suitable
   for a paint visualiser, and free of disallowed content? Uses Gemini Flash
   (text out, ~a tenth of a penny) before we pay for a Pro render.

   Fails OPEN on any classifier error/timeout so a transient hiccup never blocks
   a real customer — the generation model's own safety filters remain the
   backstop, and the monthly spend cap bounds worst-case cost. */
export type ModerationMode = 'room' | 'safe'

export async function classifyImage(
  base64: string,
  mimeType: string,
  mode: ModerationMode = 'room',
): Promise<ModerationResult> {
  const ctx = await classifierContext()
  if (!ctx) {
    // Deliberate fail-open, but loud: a paid engine with no working
    // moderation transport is a configuration problem worth noticing.
    console.warn('moderation: no classifier transport — pre-spend gate is OFF')
    return { ok: true, reason: 'no-transport' }
  }
  // 'room': must be a paintable room/building. 'safe': any image is fine so
  // long as it's free of disallowed content — the customer's own wallpaper
  // reference is a pattern/screenshot, not a room, so the room check would
  // wrongly reject it; only the safety check applies there.
  const prompt =
    mode === 'safe'
      ? 'You are a safety gate for images a user wants applied as wallpaper in a home visualiser. Reply with ONLY a compact JSON object {"ok": boolean, "reason": string}. ' +
        'Set ok=true for any ordinary image, pattern, texture, artwork or screenshot. ' +
        'Set ok=false ONLY if it contains explicit sexual content, graphic violence or gore, hate symbols, or other clearly inappropriate content. Keep reason under 12 words.'
      : 'You are a content gate for a home paint & decorating visualiser. Look at the image and reply with ONLY a compact JSON object {"ok": boolean, "reason": string}. ' +
        'Set ok=true ONLY if it is a real photograph of the interior or exterior of a home or building (rooms, walls, ceilings, facades) that could be painted or decorated. ' +
        'Set ok=false if it is not a building/room — e.g. a person as the main subject, a screenshot, meme, document/text, a product, an animal or food — or if it contains explicit, violent or otherwise inappropriate content. Keep reason under 12 words.'

  const ctl = new AbortController()
  // The abort also bounds the body read: clearTimeout only fires AFTER
  // res.json() resolves, so a stalled response body still trips the 12s abort
  // instead of hanging the whole render request.
  const t = setTimeout(() => ctl.abort(), 12000)
  try {
    const res = await fetch(ctx.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ctx.headers },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType, data: base64 } }, { text: prompt }],
          },
        ],
        generationConfig: { responseModalities: ['TEXT'], temperature: 0 },
      }),
      signal: ctl.signal,
    })
    if (!res.ok) {
      // Loud fail-open: a persistent non-OK (e.g. model not served in the
      // region, IAM denial) silently disables the gate otherwise.
      console.warn(`moderation: classifier HTTP ${res.status} — gate skipped this request`)
      return { ok: true, reason: 'classifier-error' }
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { ok: true, reason: 'unparsed' }
    const parsed = JSON.parse(match[0]) as { ok?: boolean; reason?: string }
    return { ok: parsed.ok !== false, reason: parsed.reason || '' }
  } catch {
    return { ok: true, reason: 'exception' }
  } finally {
    clearTimeout(t)
  }
}
