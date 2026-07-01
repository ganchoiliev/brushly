import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/* All access to the private `visualizer` bucket goes through the service-role
   client here. The browser only ever sees short-lived signed URLs. */

export const VISUALIZER_BUCKET = 'visualizer'

export async function signUploadUrl(path: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(VISUALIZER_BUCKET)
    .createSignedUploadUrl(path)
  if (error || !data) throw new Error(`signUploadUrl: ${error?.message ?? 'unknown'}`)
  return data // { signedUrl, token, path }
}

export async function signReadUrl(path: string, expiresIn = 600): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(VISUALIZER_BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error || !data) throw new Error(`signReadUrl: ${error?.message ?? 'unknown'}`)
  return data.signedUrl
}

export async function downloadAsBase64(
  path: string,
): Promise<{ base64: string; mimeType: string }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(VISUALIZER_BUCKET).download(path)
  if (error || !data) throw new Error(`download: ${error?.message ?? 'unknown'}`)
  const buf = Buffer.from(await data.arrayBuffer())
  return { base64: buf.toString('base64'), mimeType: data.type || 'image/jpeg' }
}

export async function uploadResult(
  path: string,
  base64: string,
  mimeType: string,
): Promise<void> {
  const supabase = createAdminClient()
  const buf = Buffer.from(base64, 'base64')
  const { error } = await supabase.storage
    .from(VISUALIZER_BUCKET)
    .upload(path, buf, { contentType: mimeType, upsert: true })
  if (error) throw new Error(`uploadResult: ${error.message}`)
}
