import 'server-only'

interface ModerationResult {
  ok: boolean
  reason: string
}

const CLASSIFY_MODEL = process.env.VISUALIZER_MODERATION_MODEL || 'gemini-2.5-flash'

/* Cheap pre-spend gate: is this a real interior/exterior building photo suitable
   for a paint visualiser, and free of disallowed content? Uses Gemini Flash
   (text out, ~a tenth of a penny) before we pay for a Pro render.

   Fails OPEN on any classifier error/timeout so a transient hiccup never blocks
   a real customer — the generation model's own safety filters remain the
   backstop, and the monthly spend cap bounds worst-case cost. */
export async function classifyImage(base64: string, mimeType: string): Promise<ModerationResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { ok: true, reason: 'no-key' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CLASSIFY_MODEL}:generateContent`
  const prompt =
    'You are a content gate for a home paint & decorating visualiser. Look at the image and reply with ONLY a compact JSON object {"ok": boolean, "reason": string}. ' +
    'Set ok=true ONLY if it is a real photograph of the interior or exterior of a home or building (rooms, walls, ceilings, facades) that could be painted or decorated. ' +
    'Set ok=false if it is not a building/room — e.g. a person as the main subject, a screenshot, meme, document/text, a product, an animal or food — or if it contains explicit, violent or otherwise inappropriate content. Keep reason under 12 words.'

  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 12000)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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
    clearTimeout(t)
    if (!res.ok) return { ok: true, reason: 'classifier-error' }
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
  }
}
