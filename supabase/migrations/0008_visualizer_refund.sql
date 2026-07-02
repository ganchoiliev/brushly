-- ============================================================
-- Brushly Admin — 0008_visualizer_refund
-- Refund a failed render's quota + estimated spend: a flaky evening at the
-- model provider must not burn a visitor's whole daily allowance with zero
-- images delivered. Mirrors visualizer_check_and_increment's bucket scheme.
-- Run once in the Supabase SQL editor (role: postgres).
-- Idempotent: safe to re-run.
-- ============================================================

begin;

create or replace function public.visualizer_refund(
  p_session        text,
  p_ip_hash        text,
  p_est_cost_pence int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today    date := (now() at time zone 'utc')::date;
  sess_key text := 'sess:' || p_session || ':' || today::text;
  ip_key   text := 'ip:'   || coalesce(p_ip_hash, 'none') || ':' || today::text;
begin
  -- Floored at zero; a render that straddled midnight UTC simply no-ops on
  -- the (fresh) buckets rather than going negative.
  update public.visualizer_usage
     set render_count = greatest(render_count - 1, 0),
         spend_pence  = greatest(spend_pence - p_est_cost_pence, 0),
         updated_at   = now()
   where bucket_key = sess_key;
  update public.visualizer_usage
     set render_count = greatest(render_count - 1, 0),
         spend_pence  = greatest(spend_pence - p_est_cost_pence, 0),
         updated_at   = now()
   where bucket_key = ip_key;
end;
$$;

commit;
