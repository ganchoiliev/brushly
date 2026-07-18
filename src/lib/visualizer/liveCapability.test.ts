import { afterEach, describe, expect, it, vi } from 'vitest'
import { shouldAttemptLive } from './liveCapability'

function stubEnv({
  touchPoints = 0,
  coarsePrimary = false,
  hasGetUserMedia = true,
}: {
  touchPoints?: number
  coarsePrimary?: boolean
  hasGetUserMedia?: boolean
}) {
  // enumerateDevices throws synchronously: the gate must decide from input
  // signals alone. Pre-permission it reports no labels/facing data (and on
  // some browsers an empty list), which is exactly how the old heuristic sent
  // real phones to the QR hand-off.
  const enumerateDevices = vi.fn(() => {
    throw new Error('the gate must not consult enumerateDevices')
  })
  vi.stubGlobal('window', {
    matchMedia: (q: string) => ({ matches: q.includes('coarse') && coarsePrimary }),
  })
  vi.stubGlobal('navigator', {
    maxTouchPoints: touchPoints,
    mediaDevices: hasGetUserMedia
      ? {
          getUserMedia: () => Promise.reject(new Error('never called by the gate')),
          enumerateDevices,
        }
      : undefined,
  })
  return { enumerateDevices }
}

afterEach(() => vi.unstubAllGlobals())

describe('shouldAttemptLive', () => {
  it('is false during SSR (no window)', () => {
    expect(shouldAttemptLive()).toBe(false)
  })

  it('is false without getUserMedia (insecure context / ancient browser)', () => {
    stubEnv({ touchPoints: 5, coarsePrimary: true, hasGetUserMedia: false })
    expect(shouldAttemptLive()).toBe(false)
  })

  it('is false on a desktop (no touch, fine pointer)', () => {
    stubEnv({})
    expect(shouldAttemptLive()).toBe(false)
  })

  it('is false on a touchscreen laptop (touch points but fine primary pointer)', () => {
    stubEnv({ touchPoints: 10, coarsePrimary: false })
    expect(shouldAttemptLive()).toBe(false)
  })

  it('is true on a touch-primary phone', () => {
    stubEnv({ touchPoints: 5, coarsePrimary: true })
    expect(shouldAttemptLive()).toBe(true)
  })

  it('attempts on a phone BEFORE camera permission — never consults enumerateDevices', () => {
    // The regression that shipped: pre-permission enumerateDevices hides
    // labels (or returns an empty list) and the old gate failed closed,
    // showing the desktop QR modal on real handsets.
    const { enumerateDevices } = stubEnv({ touchPoints: 5, coarsePrimary: true })
    expect(shouldAttemptLive()).toBe(true)
    expect(enumerateDevices).not.toHaveBeenCalled()
  })

  it('is synchronous — usable directly in a click handler', () => {
    stubEnv({ touchPoints: 5, coarsePrimary: true })
    expect(typeof shouldAttemptLive()).toBe('boolean')
  })
})
