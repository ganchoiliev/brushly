import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

/* Bearer-token counterpart of src/lib/admin/auth.ts for API routes called
   by the native app (no cookies there). The token is a Supabase access
   token from the app's signInWithPassword session; staff = the same
   `is_admin` RPC the admin area uses, evaluated as that user. */
export async function getStaffFromBearer(
  request: Request
): Promise<{ userId: string; email: string | null } | null> {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  if (!token) return null

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (isAdmin !== true) return null

  return { userId: user.id, email: user.email ?? null }
}
