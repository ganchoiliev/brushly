import { createClient } from '@/lib/supabase/client'
import type { VisualizerService } from '@/lib/supabase/types'

/* Client-side visualizer helpers: session id, image preprocessing (EXIF-orient
   + downscale + strip metadata), direct-to-storage upload, and the API calls.
   Browser-only — imported by client components. */

const BUCKET = 'visualizer'

export function getSessionId(): string {
  const KEY = 'brushly_viz_session'
  try {
    let id = sessionStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

/* Bake EXIF orientation into pixels, downscale, re-encode as JPEG (which strips
   metadata for privacy). Fixes the sideways-iPhone-photo problem. */
export async function processImage(file: File, maxDim = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser cannot process images.')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9),
  )
  if (!blob) throw new Error('Could not process that image. Try another photo.')
  return blob
}

export async function uploadPhoto(sessionId: string, blob: Blob): Promise<string> {
  const res = await fetch('/api/visualizer/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, contentType: 'image/jpeg' }),
  })
  if (!res.ok) throw new Error('Could not start the upload. Please try again.')
  const { path, token } = (await res.json()) as { path: string; token: string }

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(path, token, blob, { contentType: 'image/jpeg' })
  if (error) throw new Error(error.message)
  return path
}

export interface RenderResult {
  renderId: string
  beforeUrl: string
  afterUrl: string
}

export async function requestRender(input: {
  sessionId: string
  sourcePath: string
  service: VisualizerService
  colorId: string
  finish?: string
}): Promise<RenderResult> {
  const res = await fetch('/api/visualizer/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    if (res.status === 429) throw new Error('limit_reached')
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error || 'Render failed. Please try again.')
  }
  return res.json()
}

export async function submitLead(input: {
  sessionId: string
  name: string
  email?: string
  phone: string
  consent: true
  renderIds?: string[]
  company?: string
}): Promise<void> {
  const res = await fetch('/api/visualizer/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error || 'Could not save your details. Please try again.')
  }
}
