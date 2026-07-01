/* Vendor-agnostic image engine. We commit to Gemini/Vertex operationally, but
   nothing outside this folder imports a vendor SDK — swapping engines is a
   one-file change (B.L.A.S.T. "Layered": the boundary is explicit). */

export interface EngineEditInput {
  imageBase64: string
  mimeType: string
  prompt: string
  model?: string
}

export interface EngineEditResult {
  imageBase64: string
  mimeType: string
  model: string
}

export interface ImageEngine {
  readonly name: string
  editImage(input: EngineEditInput): Promise<EngineEditResult>
}
