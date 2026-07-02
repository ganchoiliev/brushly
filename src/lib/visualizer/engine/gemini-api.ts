import 'server-only'
import { callGenerateContent } from './gemini-shared'
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

    const img = await callGenerateContent(
      'Gemini API',
      url,
      // Key in a header, never in the URL (keeps it out of logs/query strings).
      { 'x-goog-api-key': apiKey },
      input,
    )
    return { imageBase64: img.data, mimeType: img.mimeType || 'image/png', model }
  }
}
