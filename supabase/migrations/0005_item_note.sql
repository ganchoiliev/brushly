-- Brushly Admin — 0005_item_note
-- Run once in the Supabase SQL editor (role: postgres).
-- Idempotent: safe to re-run.
--
-- Each priced line can now carry an optional NOTE — a detail/spec line
-- (paint, colour, scope) printed under the description on the PDF,
-- separate from the main description and never affecting pricing.
-- Additive and nullable, so code deployed before/after this runs in
-- either order is safe for reads — only the new writes use the column.
--
-- No new tables: the admin-only RLS policy and the grants from 0001
-- already cover these columns (same as 0002's/0004's columns).
-- item_presets is intentionally left untouched.

begin;

alter table public.quote_items
  add column if not exists note text;

alter table public.invoice_items
  add column if not exists note text;

commit;
