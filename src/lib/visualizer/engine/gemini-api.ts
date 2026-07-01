import 'server-only'
import type { EngineEditInput, EngineEditResult, ImageEngine } from './types'

/* Gemini Developer API adapter (API-key auth). Used when the org blocks Vertex
   service-account keys. Simpler auth, but no EU data-residency guarantee — swap
   to VertexEngine (WIF) before scaling / advertising UK-EU data handling.
   Same inlineData contract as the Vertex adapter. */
export class GeminiApiEngine implements ImageEngine {
  readonly name = 'gemini-api'

  async editImage(input: EngineEditInput): Promise<EngineEditResult> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')
    const model =
      input.model || process.env.VISUALIZER_MODEL || 'gemini-3-pro-image-preview'

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
            { text: input.prompt },
          ],
        },
      ],
      generationConfig: { responseModalities: ['IMAGE'] },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Key in a header, never in the URL (keeps it out of logs/query strings).
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`Gemini API generateContent failed: ${res.status} ${await res.text()}`)
    }

    const data = (await res.json()) as {
      candidates?: {
        content?: { parts?: { inlineData?: { data: string; mimeType: string } }[] }
      }[]
    }
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const img = parts.find((p) => p.inlineData)?.inlineData
    if (!img) throw new Error('Gemini API returned no image')

    return { imageBase64: img.data, mimeType: img.mimeType || 'image/png', model }
  }
}
