import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { uploadUrlSchema, UPLOAD_EXT } from '@/lib/visualizer/schemas'
import { signUploadUrl } from '@/lib/visualizer/storage'

/* Mint a short-lived signed upload URL so the browser PUTs the photo straight
   to Supabase Storage — the big binary never transits this function (Vercel's
   ~4.5MB body limit) and the service-role key never reaches the client. */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const parsed = uploadUrlSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { sessionId, contentType } = parsed.data
  const ext = UPLOAD_EXT[contentType]
  const path = `${sessionId}/${crypto.randomUUID()}.${ext}`

  try {
    const data = await signUploadUrl(path)
    return NextResponse.json({
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
    })
  } catch (error) {
    console.error('visualizer upload-url failed:', error)
    return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 })
  }
}
