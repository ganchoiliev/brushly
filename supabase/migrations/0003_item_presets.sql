-- Brushly Admin — 0003_item_presets (v1.2 §5: saved line items)
-- Run once in the Supabase SQL editor (role: postgres).
-- Idempotent: safe to re-run.
--
-- One new table: item_presets — reusable quote/invoice lines. Column
-- shape mirrors quote_items/invoice_items (same unit check, integer
-- pence) so presets copy straight into either. Conveniences, not
-- records: the app may hard-delete them.
--
-- Grants: none needed here. 0001's `alter default privileges` lines
-- already revoke everything from anon and grant table DML to
-- authenticated for tables created later by postgres — RLS below does
-- the row gating, exactly as for every other table.

begin;

create table if not exists public.item_presets (
  id               uuid primary key default gen_random_uuid(),
  description      text not null,
  unit             text not null default 'job'
                     check (unit in ('job', 'day', 'room', 'm2', 'item')),
  unit_price_pence int not null default 0,
  position         int not null default 0,
  created_at       timestamptz not null default now()
);

-- The auto_enable_rls event trigger from 0001 is best-effort insurance
-- only — every migration enables RLS explicitly regardless.
alter table public.item_presets enable row level security;

drop policy if exists item_presets_admin_all on public.item_presets;
create policy item_presets_admin_all on public.item_presets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
