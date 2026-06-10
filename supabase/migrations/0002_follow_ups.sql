-- ============================================================
-- Brushly Admin — 0002_follow_ups
-- Run once in the Supabase SQL editor (role: postgres).
-- Idempotent: safe to re-run.
-- No new tables: the admin-only RLS policies and the precise
-- grants from 0001 already cover these columns. Never modify
-- 0001 — it is applied and live.
-- ============================================================

begin;

-- Follow-up reminders (§4): a lead or quote carries at most one
-- "call them back at" timestamp; clearing it marks the follow-up
-- as done. Due/overdue rows surface in "Needs attention".
alter table public.leads  add column if not exists follow_up_at timestamptz;
alter table public.quotes add column if not exists follow_up_at timestamptz;

-- Partial indexes: "Needs attention" scans only rows that have a
-- follow-up pending, so index nothing else.
create index if not exists leads_follow_up_idx
  on public.leads (follow_up_at)
  where follow_up_at is not null;

create index if not exists quotes_follow_up_idx
  on public.quotes (follow_up_at)
  where follow_up_at is not null;

commit;
