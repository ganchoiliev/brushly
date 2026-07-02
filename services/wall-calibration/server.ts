// Standalone wall-calibration service.
//
// onnxruntime-node (~258 MB with native binaries) blows past Vercel's serverless
// size limit, so the wall segmentation + render calibration runs here instead —
// a small long-lived Node service (deploy as a container: Fly, Railway, Render,
// a VM). The Next render route calls POST /calibrate with the signed before/
// after image URLs and gets back the render's achieved paint albedo, which the
// native AR app uses to drive the calibrated live shader.
//
// The heavy lifting is the SAME code the app ships (../../src/lib/visualizer),
// so there's no logic to keep in sync — only the transport lives here.

import { createServer, type IncomingMessage } from 'node:http'
import { calibrateRender } from '../../src/lib/visualizer/render-calibration'

const PORT = Number(process.env.PORT ?? 8787)
// When set, callers must send it as `x-calibration-secret` (shared with the
// render route). Leave unset only for local development.
const SECRET = process.env.CALIBRATION_SECRET
const MAX_BODY_BYTES = 64 * 1024 // JSON is just URLs
const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15_000

interface JsonRes {
  writeHead(status: number, headers: Record<string, string>): void
  end(body: string): void
}
function send(res: JsonRes, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('request body too large'))
        req.destroy()
        return
      }
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

async function fetchImage(url: string): Promise<Buffer> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (!r.ok) throw new Error(`image fetch failed (${r.status})`)
    const declared = Number(r.headers.get('content-length') ?? 0)
    if (declared > MAX_IMAGE_BYTES) throw new Error('image too large')
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length > MAX_IMAGE_BYTES) throw new Error('image too large')
    return buf
  } finally {
    clearTimeout(timer)
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      send(res, 200, { ok: true })
      return
    }
    if (req.method !== 'POST' || req.url !== '/calibrate') {
      send(res, 404, { error: 'not found' })
      return
    }
    if (SECRET && req.headers['x-calibration-secret'] !== SECRET) {
      send(res, 401, { error: 'unauthorized' })
      return
    }
    const body = (await readJsonBody(req)) as {
      beforeUrl?: unknown
      afterUrl?: unknown
      service?: unknown
    }
    if (typeof body.beforeUrl !== 'string' || typeof body.afterUrl !== 'string') {
      send(res, 400, { error: 'beforeUrl and afterUrl are required' })
      return
    }
    const [before, after] = await Promise.all([
      fetchImage(body.beforeUrl),
      fetchImage(body.afterUrl),
    ])
    const service = typeof body.service === 'string' ? body.service : 'interior'
    const calibration = await calibrateRender(before, after, service)
    // calibration is null when the wall mask covers too little — the caller then
    // falls back to the raw swatch colour, so this is a normal 200, not an error.
    send(res, 200, { calibration })
  } catch (e) {
    send(res, 500, { error: e instanceof Error ? e.message : 'calibration failed' })
  }
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`wall-calibration listening on :${PORT}`)
})
