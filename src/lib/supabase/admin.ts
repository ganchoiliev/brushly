import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/* Service-role client — bypasses RLS. Route handlers and server actions
   only; the 'server-only' import makes any client-bundle leak a build
   error. */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
