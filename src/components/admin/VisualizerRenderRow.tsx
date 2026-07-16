/* eslint-disable @next/next/no-img-element */
// Signed, short-lived Supabase URLs — not next/image candidates (the
// signature rotates every visit, so the optimizer cache never hits).

import type { VisualizerRender } from '@/lib/supabase/types'

export const SERVICE_LABEL: Record<string, string> = {
  interior: 'Interior',
  exterior: 'Exterior',
  wallpaper: 'Wallpaper',
  finish: 'Finish',
}

export type RenderRowData = Pick<VisualizerRender, 'color_label' | 'color_hex' | 'finish'>

/* One render as staff see it — result image, source thumbnail, colour chip
   with label + finish, and a caller-composed meta line. Shared by the lead
   record and the visualizer activity page so both read identically.
   Internal fields (prompt/model/qa_score/cost_pence) are not part of the
   row's type on purpose. */
export default function VisualizerRenderRow({
  render,
  resultUrl,
  sourceUrl,
  meta,
}: {
  render: RenderRowData
  resultUrl: string | null
  sourceUrl: string | null
  meta: string
}) {
  return (
    <div>
      <div className="flex gap-2">
        {resultUrl && (
          <a href={resultUrl} target="_blank" rel="noreferrer" className="block min-w-0 flex-1">
            <img
              src={resultUrl}
              alt={`Visualised result${render.color_label ? ` — ${render.color_label}` : ''}`}
              loading="lazy"
              className="h-44 w-full rounded-sm border border-admin-hairline object-cover"
            />
          </a>
        )}
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="block w-20 shrink-0 self-end">
            <img
              src={sourceUrl}
              alt="Original room photo"
              loading="lazy"
              className="h-20 w-20 rounded-sm border border-admin-hairline object-cover"
            />
          </a>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-[13px]">
        {render.color_hex && (
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-full border border-white/20"
            style={{ backgroundColor: render.color_hex }}
          />
        )}
        <span className="text-brushly-cream">
          {[render.color_label, render.finish].filter(Boolean).join(' · ')}
        </span>
        <span className="ml-auto text-admin-muted">{meta}</span>
      </div>
    </div>
  )
}
