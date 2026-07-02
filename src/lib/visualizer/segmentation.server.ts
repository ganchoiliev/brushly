// Server-side wall segmentation (Node) for the native AR "calibrated real-time"
// pipeline. The native app has no on-device ONNX and the render route needs a
// wall mask registered to the source photo to (a) extract the achieved paint
// colour / lighting response from the Gemini render and (b) supply the wall
// alpha the native shader composites with. This mirrors the class/margin logic
// of the browser module (segmentation.ts) but runs on `onnxruntime-node` +
// `sharp` — no DOM, no WebGPU.
//
// Model provenance, ADE20K classes and the fp32/int8 story are documented in
// segmentation.ts. Server uses the fp32 graph on CPU: onnxruntime-node executes
// it accurately (unlike ort-web's WebGPU EP with the int8 QDQ graph) and the
// render route is not latency-critical (~100ms next to a ~15s render).

import path from 'node:path'
import * as ort from 'onnxruntime-node'
import sharp from 'sharp'

const INPUT_SIZE = 512
const NUM_CLASSES = 150
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

// ADE20K class indices — keep in sync with segmentation.ts.
export const INTERIOR_CLASSES: readonly number[] = [0] // wall
export const EXTERIOR_CLASSES: readonly number[] = [0, 1, 25] // wall, building, house

// public/ isn't guaranteed on a serverless function's filesystem, so allow an
// override (e.g. a bundled models dir or a mounted volume) via env.
const MODEL_PATH =
  process.env.WALL_MODEL_PATH ??
  path.join(process.cwd(), 'public', 'models', 'wall-ade20k-fp32.onnx')

let sessionPromise: Promise<ort.InferenceSession> | null = null

/** Loads the ONNX session once per process (cached). */
function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
    }).catch((e) => {
      sessionPromise = null // let a later call retry a transient load failure
      throw e
    })
  }
  return sessionPromise
}

/** Decode + resize to 512² and build the normalised CHW float tensor. */
async function toInputTensor(image: Buffer): Promise<Float32Array> {
  const { data } = await sharp(image)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill' }) // matches drawImage(...,0,0,512,512)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const plane = INPUT_SIZE * INPUT_SIZE
  const out = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    out[i] = (data[i * 3] / 255 - MEAN[0]) / STD[0]
    out[plane + i] = (data[i * 3 + 1] / 255 - MEAN[1]) / STD[1]
    out[2 * plane + i] = (data[i * 3 + 2] / 255 - MEAN[2]) / STD[2]
  }
  return out
}

/**
 * Per-pixel margin of the best TARGET class over the best other class, at the
 * model's output resolution (INPUT_SIZE/8). >0 ⇔ argmax ∈ targets. Interpolating
 * the margin (rather than a hard mask) keeps boundaries smooth when upsampling.
 * Identical to classMargin() in segmentation.ts — keep the two in sync.
 */
export function classMargin(
  logits: Float32Array,
  outW: number,
  outH: number,
  targets: readonly number[],
): Float32Array {
  const plane = outW * outH
  const margin = new Float32Array(plane)
  const isTarget = new Uint8Array(NUM_CLASSES)
  for (const c of targets) isTarget[c] = 1
  for (let i = 0; i < plane; i++) {
    let target = -Infinity
    let best = -Infinity
    for (let c = 0; c < NUM_CLASSES; c++) {
      const v = logits[c * plane + i]
      if (isTarget[c]) {
        if (v > target) target = v
      } else if (v > best) {
        best = v
      }
    }
    margin[i] = target - best
  }
  return margin
}

export interface ServerWallMargin {
  /** Wall-vs-best-other logit margin (>0 ⇔ target), at model output resolution. */
  margin: Float32Array
  width: number
  height: number
}

/**
 * Runs ADE20K segmentation on an encoded image (jpeg/png/webp Buffer) and
 * returns the raw wall-vs-rest margin at the model's output resolution
 * (INPUT_SIZE/8 = 64). The caller feathers / upsamples as needed.
 */
export async function segmentWallServerMargin(
  image: Buffer,
  targets: readonly number[] = INTERIOR_CLASSES,
): Promise<ServerWallMargin> {
  const session = await getSession()
  const input = await toInputTensor(image)
  const feeds = {
    pixel_values: new ort.Tensor('float32', input, [1, 3, INPUT_SIZE, INPUT_SIZE]),
  }
  const outputs = await session.run(feeds)
  const logits = outputs.logits.data as Float32Array
  const [, , outH, outW] = outputs.logits.dims as [number, number, number, number]
  return { margin: classMargin(logits, outW, outH, targets), width: outW, height: outH }
}
