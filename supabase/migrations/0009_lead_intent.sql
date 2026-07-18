-- ============================================================
-- Brushly Admin — 0009_lead_intent
-- Lead intent: marks visualizer quote requests so they stand out
-- from save-only leads. NULL = no explicit ask (all existing rows
-- and every non-quote submission keep their current behaviour).
-- Run once in the Supabase SQL editor (role: postgres).
-- Idempotent: safe to re-run.
-- NOTE on numbering: the live DB also carries hand-applied
-- migrations numbered 0007–0009 that are NOT files in this
-- directory — check the live schema (leads.intent) rather than
-- this folder to decide whether it has been applied.
-- ============================================================

begin;

alter table public.leads
  add column if not exists intent text
  check (intent in ('quote_request'));

commit;
