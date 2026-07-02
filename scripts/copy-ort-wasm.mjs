// Copies the onnxruntime-web wasm runtimes into public/ort/ so the
// segmentation session can load them same-origin (no CDN dependency).
// Runs on postinstall; public/ort/ is gitignored — the binaries are
// versioned by the onnxruntime-web npm package, not the repo.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', 'onnxruntime-web', 'dist')
const dest = join(root, 'public', 'ort')

// The 'onnxruntime-web/all' bundle loads the JSEP build for BOTH the webgpu
// and wasm execution providers — the plain (non-jsep) pair is never fetched.
const FILES = ['ort-wasm-simd-threaded.jsep.wasm', 'ort-wasm-simd-threaded.jsep.mjs']

mkdirSync(dest, { recursive: true })
for (const f of FILES) copyFileSync(join(src, f), join(dest, f))
console.log(`copy-ort-wasm: copied ${FILES.length} files to public/ort/`)
