import type { EngineEditInput, EngineEditResult, ImageEngine } from './types'

/* Dev engine — echoes the source image so the whole pipeline (upload → quota →
   storage → record → signed URLs → before/after UI) runs end-to-end with zero
   spend and no credentials. Default until VISUALIZER_ENGINE=vertex. */
export class MockEngine implements ImageEngine {
  readonly name = 'mock'

  async editImage(input: EngineEditInput): Promise<EngineEditResult> {
    // Simulate model latency so loading states are exercised realistically.
    await new Promise((resolve) => setTimeout(resolve, 600))
    return {
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
      model: 'mock',
    }
  }
}
