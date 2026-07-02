/**
 * Tests for the pure/exported pieces of the live-preview hook: coverCrop
 * (mask↔screen alignment AND the shutter export geometry) and
 * detectLiveCapability (gates the 8 MB model download).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { coverCrop, detectLiveCapability } from './useLiveWallPreview'

describe('coverCrop', () => {
  it('crops the sides of a wide video shown in a tall box', () => {
    // 1920×1080 source in a 900×1600 (portrait) box → full height, centre slice.
    const { sx, sy, sw, sh } = coverCrop(1920, 1080, 900, 1600)
    expect(sy).toBe(0)
    expect(sh).toBe(1080)
    expect(sw).toBe(Math.round(1080 * (900 / 1600)))
    expect(sx).toBe(Math.round((1920 - sw) / 2))
  })

  it('crops the top/bottom of a tall video shown in a wide box', () => {
    const { sx, sy, sw, sh } = coverCrop(1080, 1920, 1600, 900)
    expect(sx).toBe(0)
    expect(sw).toBe(1080)
    expect(sh).toBe(Math.round(1080 / (1600 / 900)))
    expect(sy).toBe(Math.round((1920 - sh) / 2))
  })

  it('is the identity when aspects match', () => {
    expect(coverCrop(1600, 900, 800, 450)).toEqual({ sx: 0, sy: 0, sw: 1600, sh: 900 })
  })

  it('falls back to the full frame for zero-sized containers', () => {
    expect(coverCrop(640, 480, 0, 0)).toEqual({ sx: 0, sy: 0, sw: 640, sh: 480 })
  })
})

describe('detectLiveCapability', () => {
  const setNavigator = (nav: object | undefined) => {
    Object.defineProperty(globalThis, 'navigator', {
      value: nav,
      configurable: true,
      writable: true,
    })
  }
  const setWindow = (win: object | undefined) => {
    Object.defineProperty(globalThis, 'window', {
      value: win,
      configurable: true,
      writable: true,
    })
  }

  afterEach(() => {
    setNavigator(undefined)
    setWindow(undefined)
    vi.restoreAllMocks()
  })

  it('is false during SSR (no navigator)', async () => {
    setNavigator(undefined)
    await expect(detectLiveCapability()).resolves.toBe(false)
  })

  it('is false for data-saver users', async () => {
    setNavigator({ connection: { saveData: true }, gpu: { requestAdapter: async () => ({}) } })
    await expect(detectLiveCapability()).resolves.toBe(false)
  })

  it('is false when prefers-reduced-data matches', async () => {
    setNavigator({ gpu: { requestAdapter: async () => ({}) } })
    setWindow({ matchMedia: () => ({ matches: true }) })
    await expect(detectLiveCapability()).resolves.toBe(false)
  })

  it('is false without WebGPU or when the adapter is null/throws', async () => {
    setWindow({ matchMedia: () => ({ matches: false }) })
    setNavigator({})
    await expect(detectLiveCapability()).resolves.toBe(false)
    setNavigator({ gpu: { requestAdapter: async () => null } })
    await expect(detectLiveCapability()).resolves.toBe(false)
    setNavigator({
      gpu: {
        requestAdapter: async () => {
          throw new Error('nope')
        },
      },
    })
    await expect(detectLiveCapability()).resolves.toBe(false)
  })

  it('is true with a real adapter and no data-saving signals', async () => {
    setWindow({ matchMedia: () => ({ matches: false }) })
    setNavigator({ gpu: { requestAdapter: async () => ({}) } })
    await expect(detectLiveCapability()).resolves.toBe(true)
  })
})
