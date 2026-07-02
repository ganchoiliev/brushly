import { NextResponse } from 'next/server'
import { getStaffFromBearer } from '@/lib/admin/api-auth'
import { attachRenderSchema } from '@/lib/visualizer/schemas'
import { createAdminClient } from '@/lib/supabase/admin'

/* Links a visualizer render to a CRM lead — the in-field quoting flow:
   staff shows the client a render, then files it against their lead so it
   surfaces in the admin lead record. Staff-only via bearer + is_admin. */
export async function POST(request: Request) {
  const staff = await getStaffFromBearer(request)
  if (!staff) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const parsed = attachRenderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { renderId, leadId } = parsed.data

  try {
    const supabase = createAdminClient()

    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .maybeSingle()
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { data: updated, error } = await supabase
      .from('visualizer_renders')
      .update({ lead_id: leadId })
      .eq('id', renderId)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!updated) {
      return NextResponse.json({ error: 'Render not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('staff attach-render failed:', error)
    return NextResponse.json({ error: 'Could not attach render' }, { status: 500 })
  }
}
