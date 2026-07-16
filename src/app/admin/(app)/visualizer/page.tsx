import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import StatusBadge from '@/components/admin/StatusBadge'
import VisualizerRenderRow, { SERVICE_LABEL } from '@/components/admin/VisualizerRenderRow'
import { requireUser } from '@/lib/admin/auth'
import { formatDateShort, formatTime } from '@/lib/admin/format'
import { signReadUrls } from '@/lib/visualizer/storage'

export const metadata: Metadata = {
  title: 'Visualizer',
}

/* Bounds one page load: newest renders only, one batch signing call.
   The footer says so whenever the window is actually full. */
const RENDER_WINDOW = 200

/* Same TTL as the lead-record section: staff view once, page re-signs on
   every load. */
const SIGNED_URL_TTL = 3_600

const SESSION_BADGE = {
  anonymous: { label: 'Anonymous', tone: 'muted' as const },
}

const londonDay = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date(iso))

/* Kept out of the component body so the linter's purity rule doesn't flag
   the unavoidable clock read — this is a request-time server component. */
const weekAgoIso = () => new Date(Date.now() - 7 * 86_400_000).toISOString()

/* "Tue 15 Jul, 18:29–18:54" — or both ends dated when a session straddles
   midnight. */
function rangeLabel(firstIso: string, lastIso: string, count: number): string {
  if (count === 1) return `${formatDateShort(firstIso)}, ${formatTime(firstIso)}`
  if (londonDay(firstIso) === londonDay(lastIso)) {
    return `${formatDateShort(firstIso)}, ${formatTime(firstIso)}–${formatTime(lastIso)}`
  }
  return `${formatDateShort(firstIso)}, ${formatTime(firstIso)} – ${formatDateShort(lastIso)}, ${formatTime(lastIso)}`
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-4 py-3">
      <p className="font-body text-2xl font-semibold tabular-nums text-admin-text">{value}</p>
      <p className="mt-0.5 font-body text-[11px] font-medium uppercase tracking-wider text-admin-muted">
        {label}
      </p>
    </div>
  )
}

export default async function VisualizerActivityPage() {
  const { supabase } = await requireUser()

  /* Sessions the decorator can act on = completed renders only; failed
     attempts have no image and stay internal. linkedRows is fetched
     un-windowed so a session keeps its lead name even when the linked
     render has aged out of the display window. */
  const [{ data: windowRows }, { data: weekRows }, { data: linkedRows }] = await Promise.all([
    supabase
      .from('visualizer_renders')
      .select(
        'id, created_at, session_id, service, color_label, color_hex, finish, source_path, result_path'
      )
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(RENDER_WINDOW),
    supabase
      .from('visualizer_renders')
      .select('session_id')
      .eq('status', 'done')
      .gte('created_at', weekAgoIso()),
    supabase
      .from('visualizer_renders')
      .select('session_id, lead_id')
      .not('lead_id', 'is', null),
  ])

  const rows = windowRows ?? []

  /* Rows arrive newest-first, so first-seen order = sessions by newest
     activity. */
  const sessions = new Map<string, typeof rows>()
  for (const r of rows) {
    const group = sessions.get(r.session_id)
    if (group) group.push(r)
    else sessions.set(r.session_id, [r])
  }

  const linkedBySession = new Map<string, Set<string>>()
  for (const r of linkedRows ?? []) {
    if (!r.lead_id) continue
    const set = linkedBySession.get(r.session_id) ?? new Set<string>()
    set.add(r.lead_id)
    linkedBySession.set(r.session_id, set)
  }

  const displayedLeadIds = [
    ...new Set(
      [...sessions.keys()].flatMap((sid) => [...(linkedBySession.get(sid) ?? [])])
    ),
  ]
  const leadName = new Map<string, string>()
  if (displayedLeadIds.length > 0) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name')
      .in('id', displayedLeadIds)
    for (const l of leads ?? []) leadName.set(l.id, l.name)
  }

  const urls = await signReadUrls(
    [...new Set(rows.flatMap((r) => [r.result_path, r.source_path]))].filter(
      (p): p is string => Boolean(p)
    ),
    SIGNED_URL_TTL
  ).catch(() => new Map<string, string>())

  const weekSessionIds = new Set((weekRows ?? []).map((r) => r.session_id))
  const rendersWeek = (weekRows ?? []).length
  const becameLeads = [...weekSessionIds].filter((sid) => linkedBySession.has(sid)).length
  const leadPct =
    weekSessionIds.size > 0 ? Math.round((becameLeads / weekSessionIds.size) * 100) : null

  return (
    <>
      <PageHeader title="Visualizer" />

      <div className="space-y-5 px-4 py-5 md:max-w-3xl md:px-8">
        <section className="grid grid-cols-3 divide-x divide-admin-hairline rounded-sm border border-admin-hairline bg-admin-card">
          <Stat value={String(rendersWeek)} label="renders, last 7 days" />
          <Stat value={String(weekSessionIds.size)} label="sessions, last 7 days" />
          <Stat
            value={`${becameLeads}${leadPct !== null ? ` (${leadPct}%)` : ''}`}
            label="became leads"
          />
        </section>

        {sessions.size === 0 ? (
          <p className="rounded-sm border border-admin-hairline bg-admin-card p-4 font-body text-[14px] text-admin-muted">
            No visualizer activity yet.
          </p>
        ) : (
          <section className="rounded-sm border border-admin-hairline bg-admin-card">
            {[...sessions.entries()].map(([sessionId, group]) => {
              const chrono = [...group].reverse()
              const first = chrono[0].created_at
              const last = chrono[chrono.length - 1].created_at
              const services = [
                ...new Set(group.map((r) => SERVICE_LABEL[r.service] ?? r.service)),
              ].join(' · ')
              const leads = [...(linkedBySession.get(sessionId) ?? [])]
                .map((id) => ({ id, name: leadName.get(id) }))
                .filter((l): l is { id: string; name: string } => Boolean(l.name))

              return (
                <details
                  key={sessionId}
                  className="group border-b border-admin-hairline last:border-b-0"
                >
                  <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 transition-colors hover:bg-admin-raised [&::-webkit-details-marker]:hidden">
                    <ChevronRight
                      className="mt-1 h-4 w-4 shrink-0 text-admin-muted transition-transform group-open:rotate-90"
                      strokeWidth={1.8}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {leads.length > 0 ? (
                          leads.map((l) => (
                            <Link
                              key={l.id}
                              href={`/admin/leads/${l.id}`}
                              className="font-body text-[15px] font-medium text-brushly-gold hover:underline"
                            >
                              {l.name}
                            </Link>
                          ))
                        ) : (
                          <StatusBadge map={SESSION_BADGE} status="anonymous" />
                        )}
                        <span className="font-body text-[13px] text-admin-muted">
                          {group.length} render{group.length === 1 ? '' : 's'} · {services}
                        </span>
                      </div>
                      <p className="mt-0.5 font-body text-[12px] text-admin-muted">
                        {rangeLabel(first, last, group.length)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {chrono.map(
                          (r) =>
                            r.color_hex && (
                              <span
                                key={r.id}
                                title={r.color_label ?? undefined}
                                className="h-4 w-4 shrink-0 rounded-full border border-white/20"
                                style={{ backgroundColor: r.color_hex }}
                              />
                            )
                        )}
                      </div>
                    </div>
                  </summary>
                  <div className="space-y-4 border-t border-admin-hairline py-4 pl-11 pr-4">
                    {chrono.map((r) => (
                      <VisualizerRenderRow
                        key={r.id}
                        render={r}
                        resultUrl={(r.result_path && urls.get(r.result_path)) || null}
                        sourceUrl={urls.get(r.source_path) ?? null}
                        meta={formatTime(r.created_at)}
                      />
                    ))}
                  </div>
                </details>
              )
            })}
          </section>
        )}

        {rows.length === RENDER_WINDOW && (
          <p className="pb-4 font-body text-[12px] text-admin-muted/60">
            Showing the latest {RENDER_WINDOW} renders.
          </p>
        )}
      </div>
    </>
  )
}
