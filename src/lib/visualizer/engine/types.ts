/* Vendor-agnostic image engine. We commit to Gemini/Vertex operationally, but
   nothing outside this folder imports a vendor SDK — swapping engines is a
   one-file change (B.L.A.S.T. "Layered": the boundary is explicit). */

export interface EngineReferenceImage {
  imageBase64: string
  mimeType: string
}

export interface EngineEditInput {
  imageBase64: string
  mimeType: string
  prompt: string
  model?: string
  /** Extra image parts sent after the photo (e.g. an exact colour swatch). */
  references?: EngineReferenceImage[]
  /**
   * Requested output aspect ratio (e.g. '4:3'). Best-effort: engines drop it
   * and retry when the model/API rejects the field.
   */
  aspectRatio?: string
}

export interface EngineEditResult {
  imageBase64: string
  mimeType: string
  model: string
}

/**
 * The model refused the content (safety block) — retrying the same photo will
 * fail again, so callers must NOT burn quota inviting retries.
 */
export class EngineBlockedError extends Error {
  constructor(reason: string) {
    super(`Model blocked the request: ${reason}`)
    this.name = 'EngineBlockedError'
  }
}

export interface ImageEngine {
  readonly name: string
  editImage(input: EngineEditInput): Promise<EngineEditResult>
}
