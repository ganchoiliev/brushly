-- ============================================================
-- Brushly Admin — 0010_render_delivery_email
-- Customer render delivery: when a visitor passes the gate with a
-- saved render, we email them that render. This column stamps the
-- claim: NULL = never sent. Stamped atomically BEFORE the send is
-- attempted, so delivery is at-most-once — a duplicate submit (or
-- a race between two) skips instead of double-sending, and a
-- failed send is logged but never retried.
-- Run once in the Supabase SQL editor (role: postgres).
-- Idempotent: safe to re-run.
-- NOTE on numbering: the live DB also carries hand-applied
-- migrations numbered 0007–0009 that are NOT files in this
-- directory — check the live schema
-- (visualizer_renders.customer_email_sent_at) rather than this
-- folder to decide whether it has been applied.
-- ============================================================

begin;

alter table public.visualizer_renders
  add column if not exists customer_email_sent_at timestamptz;

commit;
