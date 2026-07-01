-- ============================================================
-- Brushly Admin — 0007_visualizer
-- AI Paint Visualizer: renders + usage/quota + private storage.
-- Run once in the Supabase SQL editor (role: postgres).
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- ===================== LEADS SOURCE ========================
-- Add 'visualizer' as a lead source (mirrors the check in 0001).
alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads
  add constraint leads_source_check
  check (source in ('website','ads','referral','phone','manual','visualizer'));

-- ===================== TABLES ==============================

create table if not exists public.visualizer_renders (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  session_id   text not null,
  ip_hash      text,
  service      text not null
               check (service in ('interior','exterior','wallpaper','finish')),
  color_label  text,
  color_hex    text,
  finish       text,
  prompt       text,
  source_path  text not null,
  result_path  text,
  model        text,
  status       text not null default 'processing'
               check (status in ('processing','done','failed')),
  qa_score     numeric,
  cost_pence   int not null default 0,
  lead_id      uuid references public.leads(id) on delete set null
);

create index if not exists visualizer_renders_session_idx
  on public.visualizer_renders (session_id, created_at desc);
create index if not exists visualizer_renders_created_idx
  on public.visualizer_renders (created_at desc);
create index if not exists visualizer_renders_lead_idx
  on public.visualizer_renders (lead_id);

-- One row per (bucket_key) where bucket_key encodes session-or-ip + day.
create table if not exists public.visualizer_usage (
  bucket_key   text primary key,
  day          date not null default (now() at time zone 'utc')::date,
  render_count int  not null default 0,
  spend_pence  int  not null default 0,
  updated_at   timestamptz not null default now()
);

-- ===================== QUOTA RPC ===========================
-- Atomic check-and-increment for the public render path. Called only by the
-- service-role client inside the route handler (anon has no DB access at all).
-- Mirrors the atomic-counter discipline of public.next_number().
create or replace function public.visualizer_check_and_increment(
  p_session          text,
  p_ip_hash          text,
  p_max_per_session  int,
  p_max_per_ip       int,
  p_est_cost_pence   int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today    date := (now() at time zone 'utc')::date;
  sess_key text := 'sess:' || p_session || ':' || today::text;
  ip_key   text := 'ip:'   || coalesce(p_ip_hash, 'none') || ':' || today::text;
  sess_count int;
  ip_count   int;
begin
  insert into public.visualizer_usage (bucket_key, day)
    values (sess_key, today) on conflict (bucket_key) do nothing;
  insert into public.visualizer_usage (bucket_key, day)
    values (ip_key, today) on conflict (bucket_key) do nothing;

  -- Lock both rows for the duration of the transaction.
  select render_count into sess_count from public.visualizer_usage
    where bucket_key = sess_key for update;
  select render_count into ip_count from public.visualizer_usage
    where bucket_key = ip_key for update;

  if sess_count >= p_max_per_session then
    return jsonb_build_object('allowed', false, 'reason', 'session_limit',
                              'session_count', sess_count);
  end if;
  if ip_count >= p_max_per_ip then
    return jsonb_build_object('allowed', false, 'reason', 'ip_limit',
                              'ip_count', ip_count);
  end if;

  update public.visualizer_usage
     set render_count = render_count + 1,
         spend_pence  = spend_pence + p_est_cost_pence,
         updated_at   = now()
   where bucket_key = sess_key;
  update public.visualizer_usage
     set render_count = render_count + 1,
         spend_pence  = spend_pence + p_est_cost_pence,
         updated_at   = now()
   where bucket_key = ip_key;

  return jsonb_build_object('allowed', true,
                            'session_count', sess_count + 1,
                            'ip_count', ip_count + 1);
end;
$$;

-- ===================== RLS =================================
-- Same posture as 0001: anon gets nothing; authenticated gated by is_admin();
-- the public render path reaches these tables only via the service-role client.
alter table public.visualizer_renders enable row level security;
alter table public.visualizer_usage   enable row level security;

drop policy if exists visualizer_renders_admin_all on public.visualizer_renders;
create policy visualizer_renders_admin_all on public.visualizer_renders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists visualizer_usage_admin_all on public.visualizer_usage;
create policy visualizer_usage_admin_all on public.visualizer_usage
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.visualizer_renders from anon;
revoke all on public.visualizer_usage   from anon;

-- ===================== STORAGE =============================
-- Private bucket. No anon/authenticated storage policies are created, so only
-- the service role can read/write objects; the client uses short-lived signed
-- upload/read URLs minted server-side.
insert into storage.buckets (id, name, public)
  values ('visualizer', 'visualizer', false)
  on conflict (id) do nothing;

commit;
