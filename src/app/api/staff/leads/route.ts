import { NextResponse } from 'next/server'
import { getStaffFromBearer } from '@/lib/admin/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

/* Recent/searchable leads for the native app's "attach render to lead"
   picker. Staff-only (Supabase bearer token + is_admin), reads via the
   service client after the explicit staff check. */
export async function GET(request: Request) {
  const staff = await getStaffFromBearer(request)
  if (!staff) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
  }

  const raw = new URL(request.url).searchParams.get('q') ?? ''
  // PostgREST .or() filters parse commas/parens/dots — strip anything that
  // could restructure the filter, keep name/phone-ish characters.
  const q = raw.replace(/[^\p{L}\p{N}@+' -]/gu, '').trim().slice(0, 64)

  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('leads')
      .select('id, name, phone, email, service, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    }
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ leads: data })
  } catch (error) {
    console.error('staff leads lookup failed:', error)
    return NextResponse.json({ error: 'Could not load leads' }, { status: 500 })
  }
}
