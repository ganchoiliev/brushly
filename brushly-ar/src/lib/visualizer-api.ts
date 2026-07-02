import { randomUUID } from 'expo-crypto'

import { apiUrl } from '@/lib/config'
import type { VisualizerService } from '@/lib/palette'

/* Mobile port of the site's src/lib/visualizer/client.ts — same endpoints,
   same request/response shapes, same error contract (429 → 'limit_reached').
   The photo goes straight to Supabase Storage via the signed URL the site
   mints, so the binary never transits the API route. */

let sessionId: string | null = null

/* One visualizer session per app run — mirrors the web's sessionStorage
   semantics (per-tab session). Drives the server's quota + render grouping. */
export function getSessionId(): string {
  if (!sessionId) sessionId = randomUUID()
  return sessionId
}

export interface RenderResult {
  renderId: string
  beforeUrl: string
  afterUrl: string
}

export async function uploadPhoto(session: string, localUri: string): Promise<string> {
  const res = await fetch(apiUrl('/api/visualizer/upload-url'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: session, contentType: 'image/jpeg' }),
  })
  if (!res.ok) throw new Error('Could not start the upload. Please try again.')
  const { path, signedUrl } = (await res.json()) as {
    path: string
    token: string
    signedUrl: string
  }

  // RN's fetch turns a file:// response into a Blob it can re-send as a body.
  const photo = await (await fetch(localUri)).blob()
  const put = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: photo,
  })
  if (!put.ok) throw new Error('Could not upload your photo. Please try again.')
  return path
}

export async function requestRender(input: {
  sessionId: string
  sourcePath: string
  service: VisualizerService
  colorId: string
  finish?: string
}): Promise<RenderResult> {
  const res = await fetch(apiUrl('/api/visualizer/render'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    if (res.status === 429) throw new Error('limit_reached')
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error || 'Render failed. Please try again.')
  }
  return (await res.json()) as RenderResult
}
