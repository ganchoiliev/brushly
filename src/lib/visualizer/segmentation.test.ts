/**
 * Unit tests for the on-device wall segmentation wrapper, with onnxruntime-web
 * fully mocked. The mock model marks the LEFT half of the frame as wall
 * (class-0 logit +5) and the right half as not-wall (-5), so output shape,
 * format and orientation are all assertable without real weights.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  EXTERIOR_CLASSES,
  dispose,
  getActiveModel,
  getActiveProvider,
  lazyInit,
  segmentWall,
  segmentWallMargin,
} from './segmentation'

const h = vi.hoisted(() => ({
  failProviders: new Set<string>(),
  degenerate: false,
  created: [] as { model: string; ep: string }[],
}))

vi.mock('onnxruntime-web/all', () => {
  class Tensor {
    constructor(
      public type: string,
      public data: Float32Array,
      public dims: number[],
    ) {}
    async getData() {
      return this.data
    }
  }
  // Fully-convolutional stand-in: input [1,3,S,S] → logits [1,150,S/8,S/8],
  // wall (class 0) wins on the left half of every row and building (class 1)
  // on the right half — so both the interior and exterior target sets are
  // assertable, including that they exclude each other.
  const makeLogits = (S: number) => {
    const out = S / 8
    const data = new Float32Array(150 * out * out)
    const plane = out * out
    if (!h.degenerate) {
      for (let y = 0; y < out; y++)
        for (let x = 0; x < out; x++) {
          data[y * out + x] = x < out / 2 ? 5 : -5 // wall
          data[plane + y * out + x] = x < out / 2 ? -5 : 5 // building
        }
    }
    return new Tensor('float32', data, [1, 150, out, out])
  }
  return {
    env: { wasm: {} },
    Tensor,
    InferenceSession: {
      create: async (model: string, opts: { executionProviders: string[] }) => {
        const ep = opts.executionProviders[0]
        if (h.failProviders.has(ep)) throw new Error(`${ep} unavailable`)
        h.created.push({ model, ep })
        return {
          run: async (feeds: Record<string, InstanceType<typeof Tensor>>) =>
            ({ logits: makeLogits(feeds.pixel_values.dims[2]) }) as Record<
              string,
              InstanceType<typeof Tensor>
            >,
          release: async () => {},
        }
      },
    },
  }
})

// segmentation.ts is browser code: stub the two DOM APIs it touches. The 2D
// context is a no-op rasteriser — pixel VALUES don't matter here, only that
// preprocessing yields a well-formed tensor for the mocked session.
beforeAll(() => {
  const ctx = {
    drawImage: () => {},
    putImageData: () => {},
    getImageData: (_x: number, _y: number, w: number, hgt: number) => ({
      data: new Uint8ClampedArray(w * hgt * 4).fill(127),
      width: w,
      height: hgt,
    }),
  }
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  } as unknown as Document
  globalThis.ImageData = class ImageData {} as unknown as typeof globalThis.ImageData
})

afterEach(async () => {
  await dispose()
  h.failProviders.clear()
  h.degenerate = false
  h.created.length = 0
})

const fakeSource = (width: number, height: number) =>
  ({ width, height }) as unknown as HTMLCanvasElement

describe('segmentWall', () => {
  it('returns a binary Uint8ClampedArray mask at the source resolution', async () => {
    const { mask, width, height } = await segmentWall(fakeSource(100, 80))
    expect(mask).toBeInstanceOf(Uint8ClampedArray)
    expect(width).toBe(100)
    expect(height).toBe(80)
    expect(mask.length).toBe(100 * 80)
    expect(new Set(mask)).toEqual(new Set([0, 1]))
    // wall on the left, not-wall on the right, in every sampled row
    for (const y of [0, 40, 79]) {
      expect(mask[y * 100 + 10]).toBe(1)
      expect(mask[y * 100 + 90]).toBe(0)
    }
  })

  it('picks the first working provider and the matching weights variant', async () => {
    await segmentWall(fakeSource(10, 10))
    expect(getActiveProvider()).toBe('webgpu')
    expect(getActiveModel()).toBe('fp32')
    expect(h.created).toHaveLength(1)
    expect(h.created[0].model).toContain('fp32')
  })
})

describe('segmentWallMargin (live path)', () => {
  it('returns the raw margin at the model output resolution (input/8)', async () => {
    const { margin, width, height } = await segmentWallMargin(fakeSource(640, 480), 256)
    expect(margin).toBeInstanceOf(Float32Array)
    expect(width).toBe(32)
    expect(height).toBe(32)
    expect(margin.length).toBe(32 * 32)
    // signed margins survive (no thresholding): positive on wall, negative
    // where building (a non-target class) wins
    expect(margin[16 * 32 + 4]).toBeGreaterThan(0)
    expect(margin[16 * 32 + 28]).toBeLessThan(0)
  })

  it('EXTERIOR_CLASSES targets the facade instead of interior walls', async () => {
    const { margin } = await segmentWallMargin(fakeSource(640, 480), 256, EXTERIOR_CLASSES)
    // Building wins on the right half; wall (now a NON-target) wins the left.
    expect(margin[16 * 32 + 28]).toBeGreaterThan(0)
    expect(margin[16 * 32 + 4]).toBeLessThan(0)
  })

  it('segmentWall with EXTERIOR_CLASSES masks the building half', async () => {
    const { mask } = await segmentWall(fakeSource(100, 80), EXTERIOR_CLASSES)
    expect(mask[40 * 100 + 90]).toBe(1)
    expect(mask[40 * 100 + 10]).toBe(0)
  })
})

describe('provider fallback and validation', () => {
  it('falls back down the provider chain and loads int8 on CPU paths', async () => {
    h.failProviders.add('webgpu').add('webgl')
    await segmentWall(fakeSource(10, 10))
    expect(getActiveProvider()).toBe('wasm')
    expect(getActiveModel()).toBe('int8')
    expect(h.created[0].model).toContain('int8')
  })

  it('rejects every provider whose warmup produces degenerate logits', async () => {
    h.degenerate = true
    await expect(lazyInit()).rejects.toThrow(/degenerate/)
    expect(getActiveProvider()).toBeNull()
  })

  it('dispose() resets provider state so the next call re-initialises', async () => {
    await segmentWall(fakeSource(10, 10))
    expect(getActiveProvider()).toBe('webgpu')
    await dispose()
    expect(getActiveProvider()).toBeNull()
    await segmentWall(fakeSource(10, 10))
    expect(h.created).toHaveLength(2)
  })
})
