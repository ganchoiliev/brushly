// On-device wall segmentation for the AR visualizer.
//
// Models: /models/wall-ade20k-int8.onnx (2.3 MB) + wall-ade20k-fp32.onnx (8 MB)
//   MobileNetV2-dilated encoder + C1-DeepSup decoder, trained on MIT ADE20K
//   (150-class scene parsing; class 0 = 'wall').
//   Source code:  https://github.com/CSAILVision/semantic-segmentation-pytorch
//   Weights:      http://sceneparsing.csail.mit.edu/model/pytorch/ade20k-mobilenetv2dilated-c1_deepsup/
//   License:      BSD-3-Clause (MIT CSAIL semantic-segmentation-pytorch project;
//                 weights distributed by the same project under the same terms).
//   Conversion:   exported to ONNX (opset 13) via torch.onnx; the int8 variant is
//                 statically quantised (QDQ, per-channel) with onnxruntime,
//                 calibrated on this site's room photography. fp32→int8 mask
//                 agreement 98%. Only ONE variant is fetched at runtime: WebGPU
//                 sessions load fp32 (ort-web's WebGPU EP silently mis-executes
//                 QDQ graphs — validated: all-constant logits), CPU paths load int8.
//                 Both files were then patched to dynamic H/W dims (the export
//                 baked 512×512; the graph is fully convolutional — no Reshape/
//                 Resize — so onnx dim surgery is safe; validated: 512 logits
//                 max|Δ| 7.6e-6 vs original, 100% mask agreement; 256 input
//                 works and agrees ~89% with 512). The live AR path runs 256.
//
// Everything here is lazy: onnxruntime-web and the model are only fetched when
// lazyInit()/segmentWall() is first called, and dispose() frees the session.

import type { InferenceSession } from 'onnxruntime-web'

const MODEL_INT8_URL = '/models/wall-ade20k-int8.onnx'
const MODEL_FP32_URL = '/models/wall-ade20k-fp32.onnx'
const INPUT_SIZE = 512
const NUM_CLASSES = 150
const WALL_CLASS = 0 // ADE20K 'wall'
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

export interface WallMask {
  /** 1 = wall, 0 = not wall; length = width * height (source resolution). */
  mask: Uint8ClampedArray
  width: number
  height: number
}

type Ort = typeof import('onnxruntime-web/all')
export type ExecutionProvider = 'webgpu' | 'webgl' | 'wasm'

const DEFAULT_PROVIDERS: ExecutionProvider[] = ['webgpu', 'webgl', 'wasm']

let sessionPromise: Promise<InferenceSession> | null = null
let requestedProviders: ExecutionProvider[] = DEFAULT_PROVIDERS
let activeProvider: ExecutionProvider | null = null
let activeModel: 'int8' | 'fp32' | null = null
// Settles when every segmentWall call issued so far has finished. dispose()
// awaits it: releasing a session under an in-flight run is a use-after-free
// in the shared wasm runtime on the WebGPU path.
let inFlightRuns: Promise<void> = Promise.resolve()

// Scratch canvas + tensor buffer are reused across calls (keyed by size): the
// live loop runs ~10×/s and per-frame allocation of a 768 KB Float32Array is
// avoidable GC pressure. Safe because runs against the single session are
// sequential (the tensor is consumed before the next call rewrites the buffer).
// dispose() clears it.
const scratch = new Map<number, { canvas: HTMLCanvasElement; buffer: Float32Array }>()

/**
 * Warm-up run that doubles as a correctness gate: feeds deterministic noise and
 * rejects the provider if the logits come back non-finite or all-constant (the
 * failure mode of a backend that silently mis-executes the graph).
 */
async function warmupAndValidate(session: InferenceSession, ort: Ort): Promise<void> {
  const n = 3 * INPUT_SIZE * INPUT_SIZE
  const noise = new Float32Array(n)
  let seed = 42
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    noise[i] = (seed / 0xffffffff - 0.5) * 4
  }
  const outputs = await session.run({
    pixel_values: new ort.Tensor('float32', noise, [1, 3, INPUT_SIZE, INPUT_SIZE]),
  })
  const logits = (await outputs.logits.getData()) as Float32Array
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < logits.length; i++) {
    const v = logits[i]
    if (!Number.isFinite(v)) throw new Error('Backend produced non-finite logits.')
    if (v < min) min = v
    if (v > max) max = v
  }
  if (max - min < 1e-2) throw new Error('Backend produced degenerate (constant) logits.')
}

async function createSession(providers: ExecutionProvider[]): Promise<InferenceSession> {
  const ort: Ort = await import('onnxruntime-web/all')
  // Serve the wasm/webgpu runtimes same-origin (copied by scripts/copy-ort-wasm.mjs).
  ort.env.wasm.wasmPaths = '/ort/'
  let lastError: unknown
  for (const ep of providers) {
    // WebGPU runs the fp32 graph (its QDQ int8 execution is unreliable); the
    // CPU paths get the small int8 model. Only one file is ever fetched.
    const model = ep === 'webgpu' ? MODEL_FP32_URL : MODEL_INT8_URL
    try {
      const session = await ort.InferenceSession.create(model, {
        executionProviders: [ep],
        graphOptimizationLevel: 'all',
      })
      try {
        await warmupAndValidate(session, ort)
      } catch (e) {
        await session.release().catch(() => undefined)
        throw e
      }
      activeProvider = ep
      activeModel = ep === 'webgpu' ? 'fp32' : 'int8'
      return session
    } catch (e) {
      lastError = e
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Wall segmentation is not supported in this browser.')
}

/**
 * Loads the ORT session once (WebGPU → WebGL → WASM) and warms it up. A
 * providers override is remembered, so retries after a failed init (including
 * the implicit one inside segmentWall) keep honouring it.
 */
export function lazyInit(providers?: ExecutionProvider[]): Promise<InferenceSession> {
  if (providers) requestedProviders = providers
  if (!sessionPromise) {
    const promise: Promise<InferenceSession> = createSession(requestedProviders).catch(
      (e: unknown) => {
        // Identity check: don't clobber a newer init started after dispose().
        if (sessionPromise === promise) sessionPromise = null
        throw e
      },
    )
    sessionPromise = promise
  }
  return sessionPromise
}

/** Which execution provider the live session ended up on (after lazyInit). */
export function getActiveProvider(): ExecutionProvider | null {
  return activeProvider
}

/** Which weights variant the live session runs ('fp32' on WebGPU, else 'int8'). */
export function getActiveModel(): 'int8' | 'fp32' | null {
  return activeModel
}

/** Releases the ORT session, input scratch buffers and the model weights. */
export async function dispose(): Promise<void> {
  const pending = sessionPromise
  sessionPromise = null
  activeProvider = null
  activeModel = null
  scratch.clear() // drop cached input canvases + Float32 tensor buffers (~4 MB)
  if (!pending) return
  await inFlightRuns
  try {
    const session = await pending
    await session.release()
  } catch {
    // init failed — nothing to release
  }
}

function toInputTensorData(
  source: HTMLCanvasElement | ImageData,
  inputSize: number,
): Float32Array {
  let s = scratch.get(inputSize)
  if (!s) {
    const canvas = document.createElement('canvas')
    canvas.width = inputSize
    canvas.height = inputSize
    s = { canvas, buffer: new Float32Array(3 * inputSize * inputSize) }
    scratch.set(inputSize, s)
  }
  const ctx = s.canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D is unavailable.')

  if (source instanceof ImageData) {
    const src = document.createElement('canvas')
    src.width = source.width
    src.height = source.height
    const srcCtx = src.getContext('2d')
    if (!srcCtx) throw new Error('Canvas 2D is unavailable.')
    srcCtx.putImageData(source, 0, 0)
    ctx.drawImage(src, 0, 0, inputSize, inputSize)
  } else {
    ctx.drawImage(source, 0, 0, inputSize, inputSize)
  }

  const { data } = ctx.getImageData(0, 0, inputSize, inputSize)
  const plane = inputSize * inputSize
  const out = s.buffer
  for (let i = 0; i < plane; i++) {
    out[i] = (data[i * 4] / 255 - MEAN[0]) / STD[0]
    out[plane + i] = (data[i * 4 + 1] / 255 - MEAN[1]) / STD[1]
    out[2 * plane + i] = (data[i * 4 + 2] / 255 - MEAN[2]) / STD[2]
  }
  return out
}

/**
 * Per-pixel margin of the wall class over the best other class, at the model's
 * output resolution. margin > 0 ⇔ argmax == wall, but interpolating the margin
 * (instead of a hard mask) gives smooth boundaries when upsampling.
 */
function wallMargin(logits: Float32Array, outW: number, outH: number): Float32Array {
  const plane = outW * outH
  const margin = new Float32Array(plane)
  for (let i = 0; i < plane; i++) {
    const wall = logits[WALL_CLASS * plane + i]
    let best = -Infinity
    for (let c = 0; c < NUM_CLASSES; c++) {
      if (c === WALL_CLASS) continue
      const v = logits[c * plane + i]
      if (v > best) best = v
    }
    margin[i] = wall - best
  }
  return margin
}

function upsampleToMask(
  margin: Float32Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8ClampedArray {
  const mask = new Uint8ClampedArray(dstW * dstH)
  const xRatio = srcW / dstW
  const yRatio = srcH / dstH
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min((y + 0.5) * yRatio - 0.5, srcH - 1)
    const y0 = Math.max(0, Math.floor(sy))
    const y1 = Math.min(srcH - 1, y0 + 1)
    const fy = Math.max(0, sy - y0)
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min((x + 0.5) * xRatio - 0.5, srcW - 1)
      const x0 = Math.max(0, Math.floor(sx))
      const x1 = Math.min(srcW - 1, x0 + 1)
      const fx = Math.max(0, sx - x0)
      const top = margin[y0 * srcW + x0] * (1 - fx) + margin[y0 * srcW + x1] * fx
      const bot = margin[y1 * srcW + x0] * (1 - fx) + margin[y1 * srcW + x1] * fx
      mask[y * dstW + x] = top * (1 - fy) + bot * fy > 0 ? 1 : 0
    }
  }
  return mask
}

async function runMargin(
  source: HTMLCanvasElement | ImageData,
  inputSize: number,
): Promise<{ margin: Float32Array; outW: number; outH: number }> {
  const session = await lazyInit()
  const ort: Ort = await import('onnxruntime-web/all')

  // Everything that touches the session runs inside a tracked promise so
  // dispose() can wait for it before releasing.
  const work = (async () => {
    const input = new ort.Tensor('float32', toInputTensorData(source, inputSize), [
      1,
      3,
      inputSize,
      inputSize,
    ])
    const outputs = await session.run({ pixel_values: input })
    const logits = outputs.logits
    const [, , outH, outW] = logits.dims as [number, number, number, number]
    const data = (await logits.getData()) as Float32Array
    return { data, outH, outW }
  })()
  inFlightRuns = inFlightRuns.then(() =>
    work.then(
      () => undefined,
      () => undefined,
    ),
  )
  const { data, outH, outW } = await work
  return { margin: wallMargin(data, outW, outH), outW, outH }
}

/**
 * Runs ADE20K segmentation on a still and returns a binary wall mask at the
 * source's resolution (1 = wall). Initialises the model on first call.
 */
export async function segmentWall(source: HTMLCanvasElement | ImageData): Promise<WallMask> {
  const { margin, outW, outH } = await runMargin(source, INPUT_SIZE)
  const mask = upsampleToMask(margin, outW, outH, source.width, source.height)
  return { mask, width: source.width, height: source.height }
}

export interface WallMargin {
  /** Wall-vs-best-other-class logit margin (>0 ⇔ wall), model output resolution. */
  margin: Float32Array
  width: number
  height: number
}

/**
 * Live-preview variant: runs the model at a caller-chosen input size (the AR
 * loop uses 256 for ~4× less compute than the 512 still path) and returns the
 * RAW margin at the model's output resolution (inputSize/8) — no upsampling.
 * The caller temporally smooths and feathers it, which must happen before any
 * thresholding to look stable frame-to-frame.
 */
export async function segmentWallMargin(
  source: HTMLCanvasElement | ImageData,
  inputSize: number,
): Promise<WallMargin> {
  const { margin, outW, outH } = await runMargin(source, inputSize)
  return { margin, width: outW, height: outH }
}
