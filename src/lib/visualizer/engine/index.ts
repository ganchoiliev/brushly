import 'server-only'
import type { ImageEngine } from './types'
import { MockEngine } from './mock'
import { VertexEngine } from './vertex'
import { GeminiApiEngine } from './gemini-api'

let cached: ImageEngine | null = null

/* Factory — flag-selected engine, cached per runtime instance.
   VISUALIZER_ENGINE: 'vertex' (SA/WIF), 'gemini' (Developer API key),
   'mock' (dev, no spend). In production the value must be explicit: a
   missing/typo'd env var silently shipping MockEngine means visitors get
   their own photo back as the "render" while quota and cost still tick. */
export function getEngine(): ImageEngine {
  if (cached) return cached
  const which = process.env.VISUALIZER_ENGINE ?? (process.env.NODE_ENV === 'production' ? '' : 'mock')
  if (which !== 'vertex' && which !== 'gemini' && which !== 'mock') {
    throw new Error(
      `VISUALIZER_ENGINE is ${which ? `'${which}'` : 'not set'} — set it to 'vertex', 'gemini' or 'mock'.`,
    )
  }
  cached =
    which === 'vertex'
      ? new VertexEngine()
      : which === 'gemini'
        ? new GeminiApiEngine()
        : new MockEngine()
  return cached
}

export { EngineBlockedError } from './types'
export type { ImageEngine, EngineEditInput, EngineEditResult } from './types'
