import 'server-only'
import { EngineBlockedError, type EngineEditInput } from './types'

/* Shared generateContent transport for the Vertex and Developer-API adapters:
   one request shape, one response parser, one resilience policy.

   Resilience: each attempt is capped by an AbortController (a hung upstream
   otherwise rides the route into Vercel's 60s maxDuration kill, stranding the
   DB row in 'processing'); transient statuses get ONE quick retry, and only
   when the first attempt failed fast enough to leave budget for a second.
   A 400 while imageConfig is present is retried once without it — the field
   is newer than some model versions. */

// Total engine budget must leave room inside the route's maxDuration=60 for
// the rest of the request — worst case that's moderation (12s abort) + storage
// download/upload + DB round-trips on the FIRST render of a photo. Budget:
// attempt 1 fails ≤8s in, ≤1.5s jitter, attempt 2 capped by the remaining
// deadline ⇒ engine ≤42s, request ≤~57s. Blowing past maxDuration is worse
// than failing: the function is killed before the catch that marks the row
// 'failed', stranding a paid 'processing' row that permanently counts against
// the monthly cap.
const TOTAL_BUDGET_MS = 42_000
const ATTEMPT_TIMEOUT_MS = 35_000
const RETRY_IF_FAILED_WITHIN_MS = 8_000
const RETRYABLE = new Set([429, 500, 502, 503, 504])
const BLOCK_REASONS = /safety|prohibited|blocklist|image_safety/i

interface GenerateContentResponse {
  candidates?: {
    finishReason?: string
    content?: { parts?: { inlineData?: { data: string; mimeType: string } }[] }
  }[]
  promptFeedback?: { blockReason?: string }
}

function buildBody(input: EngineEditInput, withImageConfig: boolean) {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
          ...(input.references ?? []).map((r) => ({
            inlineData: { mimeType: r.mimeType, data: r.imageBase64 },
          })),
          { text: input.prompt },
        ],
      },
    ],
    generationConfig: {
      // Image-out models require IMAGE in the response modalities.
      responseModalities: ['IMAGE'],
      ...(withImageConfig && input.aspectRatio
        ? { imageConfig: { aspectRatio: input.aspectRatio } }
        : {}),
    },
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * POSTs generateContent with the shared body/policy and returns the first
 * inline image. `label` prefixes error messages ('Vertex' / 'Gemini API').
 */
export async function callGenerateContent(
  label: string,
  url: string,
  headers: Record<string, string>,
  input: EngineEditInput,
): Promise<{ data: string; mimeType: string }> {
  const started = Date.now()
  let withImageConfig = Boolean(input.aspectRatio)
  let retriedTransient = false

  for (;;) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started)
    if (remaining < 1_000) throw new Error(`${label} generateContent timed out`)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), Math.min(ATTEMPT_TIMEOUT_MS, remaining))
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(input, withImageConfig)),
        signal: ctrl.signal,
      })
    } catch (e) {
      clearTimeout(timer)
      if (ctrl.signal.aborted) throw new Error(`${label} generateContent timed out`)
      throw e
    }
    clearTimeout(timer)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      // imageConfig is newer than some model revisions — drop it and retry
      // rather than failing a paid render over an optional nicety.
      if (res.status === 400 && withImageConfig) {
        withImageConfig = false
        continue
      }
      if (
        RETRYABLE.has(res.status) &&
        !retriedTransient &&
        Date.now() - started < RETRY_IF_FAILED_WITHIN_MS
      ) {
        retriedTransient = true
        await sleep(500 + Math.random() * 1000)
        continue
      }
      throw new Error(`${label} generateContent failed: ${res.status} ${text}`)
    }

    const data = (await res.json()) as GenerateContentResponse
    const blockReason = data.promptFeedback?.blockReason
    const finishReason = data.candidates?.[0]?.finishReason
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const img = parts.find((p) => p.inlineData)?.inlineData
    if (!img) {
      // Distinguish "the model refused" (permanent for this photo) from an
      // empty transient response — the route maps refusals to a 422 instead
      // of inviting quota-burning retries.
      const reason = blockReason || finishReason || ''
      if (BLOCK_REASONS.test(reason)) throw new EngineBlockedError(reason)
      throw new Error(`${label} returned no image${reason ? ` (${reason})` : ''}`)
    }
    return { data: img.data, mimeType: img.mimeType }
  }
}
