import 'server-only'
import crypto from 'node:crypto'
import { callGenerateContent } from './gemini-shared'
import type { EngineEditInput, EngineEditResult, ImageEngine } from './types'

/* Dependency-free Vertex AI adapter: mints a Google access token from the
   service-account key (RS256 JWT → OAuth token exchange) and calls the regional
   generateContent REST endpoint. No SDK, stateless, secrets server-only. */

interface ServiceAccount {
  client_email: string
  private_key: string
  project_id?: string
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GCP_SERVICE_ACCOUNT_KEY not set')
  const json = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8')
  const sa = JSON.parse(json) as ServiceAccount
  if (!sa.client_email || !sa.private_key) {
    throw new Error('Invalid GCP service account key')
  }
  return sa
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

let tokenCache: { token: string; exp: number } | null = null

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache && tokenCache.exp - 60 > now) return tokenCache.token

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const signingInput = `${header}.${claim}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const signature = base64url(signer.sign(sa.private_key))
  const assertion = `${signingInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as { access_token: string; expires_in: number }
  tokenCache = { token: data.access_token, exp: now + data.expires_in }
  return data.access_token
}

/**
 * Regional endpoint + auth header for an arbitrary Vertex model. Lets the
 * moderation classifier ride the same EU-resident plumbing as the renders —
 * a Vertex-only deployment has no GEMINI_API_KEY, and without this the
 * pre-spend gate would be silently disabled.
 */
export async function vertexRequestContext(
  model: string,
): Promise<{ url: string; headers: Record<string, string> }> {
  const sa = loadServiceAccount()
  const project = process.env.GCP_PROJECT_ID || sa.project_id
  const location = process.env.GCP_LOCATION || 'europe-west3'
  if (!project) throw new Error('GCP_PROJECT_ID not set')
  const token = await getAccessToken(sa)
  return {
    url:
      `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
      `/locations/${location}/publishers/google/models/${model}:generateContent`,
    headers: { Authorization: `Bearer ${token}` },
  }
}

export class VertexEngine implements ImageEngine {
  readonly name = 'vertex'

  async editImage(input: EngineEditInput): Promise<EngineEditResult> {
    const sa = loadServiceAccount()
    const project = process.env.GCP_PROJECT_ID || sa.project_id
    const location = process.env.GCP_LOCATION || 'europe-west3'
    const model =
      input.model || process.env.VISUALIZER_MODEL || 'gemini-3-pro-image-preview'
    if (!project) throw new Error('GCP_PROJECT_ID not set')

    const token = await getAccessToken(sa)
    const url =
      `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
      `/locations/${location}/publishers/google/models/${model}:generateContent`

    const img = await callGenerateContent(
      'Vertex',
      url,
      { Authorization: `Bearer ${token}` },
      input,
    )
    return {
      imageBase64: img.data,
      mimeType: img.mimeType || 'image/png',
      model,
    }
  }
}
