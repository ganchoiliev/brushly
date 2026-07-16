import VisualizerRenderRow, { SERVICE_LABEL } from '@/components/admin/VisualizerRenderRow'
import { formatDateShort } from '@/lib/admin/format'
import { signReadUrls } from '@/lib/visualizer/storage'
import type { VisualizerRender } from '@/lib/supabase/types'

export type LeadRenderRow = Pick<
  VisualizerRender,
  | 'id'
  | 'created_at'
  | 'service'
  | 'color_label'
  | 'color_hex'
  | 'finish'
  | 'source_path'
  | 'result_path'
>

/* 1h, not the visitor-facing 24h default: staff view once from the lead
   record and the page re-signs on every load. */
const SIGNED_URL_TTL = 3_600

/* What the customer saw in the AI Visualizer, newest first. Renders reach
   a lead via lead_id only: set at gate-submit (session-verified) or by
   staff attach-render — never inferred here, so another visitor's photos
   can't surface on the wrong lead. */
export default async function LeadRenders({ renders }: { renders: LeadRenderRow[] }) {
  if (renders.length === 0) return null

  /* A storage hiccup must not 500 the whole lead page — rows render
     text-only when their paths are missing from the map. */
  const urls = await signReadUrls(
    [...new Set(renders.flatMap((r) => [r.result_path, r.source_path]))].filter(
      (p): p is string => Boolean(p)
    ),
    SIGNED_URL_TTL
  ).catch(() => new Map<string, string>())

  return (
    <section className="rounded-sm border border-admin-hairline bg-admin-card">
      <h2 className="border-b border-admin-hairline px-4 py-3 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
        Visualizer renders
      </h2>
      {renders.map((r) => (
        <div key={r.id} className="border-b border-admin-hairline p-4 last:border-b-0">
          <VisualizerRenderRow
            render={r}
            resultUrl={(r.result_path && urls.get(r.result_path)) || null}
            sourceUrl={urls.get(r.source_path) ?? null}
            meta={`${SERVICE_LABEL[r.service] ?? r.service} · ${formatDateShort(r.created_at)}`}
          />
        </div>
      ))}
    </section>
  )
}
