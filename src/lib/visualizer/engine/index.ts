import 'server-only'
import type { ImageEngine } from './types'
import { MockEngine } from './mock'
import { VertexEngine } from './vertex'
import { GeminiApiEngine } from './gemini-api'

let cached: ImageEngine | null = null

/* Factory — flag-selected engine, cached per runtime instance.
   VISUALIZER_ENGINE: 'vertex' (SA/WIF), 'gemini' (Developer API key),
   anything else = mock (dev, no spend). */
export function getEngine(): ImageEngine {
  if (cached) return cached
  const which = process.env.VISUALIZER_ENGINE ?? 'mock'
  cached =
    which === 'vertex'
      ? new VertexEngine()
      : which === 'gemini'
        ? new GeminiApiEngine()
        : new MockEngine()
  return cached
}

export type { ImageEngine, EngineEditInput, EngineEditResult } from './types'
