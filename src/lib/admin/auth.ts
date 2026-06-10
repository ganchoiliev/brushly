import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/* Deduped per request (layout + page + actions share one lookup). */
export const getAdminSession = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, isAdmin: false as const }
  const { data: isAdmin } = await supabase.rpc('is_admin')
  return { supabase, user, isAdmin: isAdmin === true }
})

/* For pages/layouts: bounce to login when signed out. A signed-in user who
   is not in `admins` is NOT redirected (the proxy would bounce them straight
   back — loop); callers render the no-access screen instead. */
export async function requireUser() {
  const session = await getAdminSession()
  if (!session.user) redirect('/admin/login')
  return session
}

/* For server actions and route handlers: hard stop, no redirects. RLS would
   block a non-admin anyway — this just fails earlier with a clear error. */
export async function requireAdmin() {
  const session = await getAdminSession()
  if (!session.user || !session.isAdmin) {
    throw new Error('Not authorised')
  }
  return { supabase: session.supabase, user: session.user }
}
