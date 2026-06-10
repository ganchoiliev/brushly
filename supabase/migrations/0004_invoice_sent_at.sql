-- Brushly Admin — 0004_invoice_sent_at (v1.2 follow-up)
-- Run once in the Supabase SQL editor (role: postgres).
-- Idempotent: safe to re-run.
--
-- Quotes already record WHEN they were sent; invoices only recorded
-- THAT they were sent. This adds the matching timestamp, written by
-- sendInvoice on a real (non-test) send. Additive and nullable, so
-- code deployed before/after this runs in either order is safe for
-- reads — only the new sendInvoice write needs the column.
--
-- No new tables: the admin-only RLS policy and the grants from 0001
-- already cover this column (same as 0002's columns).

begin;

alter table public.invoices
  add column if not exists sent_at timestamptz;

commit;
