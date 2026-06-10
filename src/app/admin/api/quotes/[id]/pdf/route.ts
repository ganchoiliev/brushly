import type { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/admin/auth'
import { buildQuotePdfInput } from '@/lib/admin/pdf/data'
import { renderBrushlyPdf } from '@/lib/admin/pdf/BrushlyDocument'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, isAdmin, supabase } = await getAdminSession()
  if (!user || !isAdmin) return new Response('Unauthorised', { status: 401 })

  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 })

  const built = await buildQuotePdfInput(supabase, id)
  if (!built) return new Response('Not found', { status: 404 })

  const buffer = await renderBrushlyPdf(built.input)
  const download = request.nextUrl.searchParams.get('download') === '1'
  const filename = `Brushly-Quote-${built.input.reference}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'cache-control': 'private, no-store',
    },
  })
}
