-- =============================================================================
-- Brushly Admin — 0012_reconcile_public_invoice
--
-- Commits public.get_public_invoice, which until now existed ONLY in the live
-- database (hand-applied, present in no migration file). A rebuild-from-
-- migrations — fresh environment, a new machine, disaster recovery — would
-- silently omit it and 404 the public /i/<token> invoice page.
--
-- The body below is byte-for-byte the live definition (dumped from production
-- 2026-07-25). Applying this to the CURRENT database is a no-op — it is
-- identical to what already runs. Its purpose is the repo and any future
-- rebuild, not a behaviour change. No column is added, no payload changes; the
-- bank block is preserved exactly as the payment section needs it.
--
-- Ordering note: this file runs AFTER 0011, whose ALTER DEFAULT PRIVILEGES
-- revokes execute-from-anon on newly created functions. So the anon grant is
-- re-asserted explicitly below — get_public_invoice is the single public
-- keyhole the /i/<token> page reaches, exactly like get_public_quote in 0006.
--
-- Run once in the Supabase SQL editor (role: postgres). Idempotent.
-- =============================================================================

begin;

create or replace function public.get_public_invoice(p_token text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'invoice', jsonb_build_object(
      'invoice_number', inv.invoice_number, 'title', inv.title, 'status', inv.status,
      'issue_date', inv.issue_date, 'due_date', inv.due_date, 'vat_rate', inv.vat_rate,
      'subtotal_pence', inv.subtotal_pence, 'vat_pence', inv.vat_pence, 'total_pence', inv.total_pence,
      'notes', inv.notes, 'site_address', inv.site_address, 'public_token', inv.public_token
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'description', i.description, 'note', i.note, 'qty', i.qty, 'unit', i.unit,
        'unit_price_pence', i.unit_price_pence, 'total_pence', i.total_pence
      ) order by i.position)
      from public.invoice_items i where i.invoice_id = inv.id), '[]'::jsonb),
    'client', jsonb_build_object('name', c.name, 'address_line1', c.address_line1,
      'address_line2', c.address_line2, 'town', c.town, 'postcode', c.postcode),
    'company', jsonb_build_object('company_name', s.company_name, 'company_number', s.company_number,
      'address', s.address, 'phone', s.phone, 'email', s.email, 'vat_registered', s.vat_registered,
      'vat_number', s.vat_number, 'default_terms', s.default_terms,
      'bank_name', s.bank_name, 'bank_sort_code', s.bank_sort_code, 'bank_account_no', s.bank_account_no)
  )
  from public.invoices inv
  join public.clients c on c.id = inv.client_id
  join public.settings s on s.id = 1
  where inv.public_token = p_token
  limit 1;
$function$;

grant execute on function public.get_public_invoice(text) to anon, authenticated, service_role;

commit;

-- =============================================================================
-- OPTIONAL, not applied: a revoke/kill switch for leaked invoice links.
-- Deliberately left out — the 72-bit token is unguessable, and the bank details
-- in the payload are already on every invoice Brushly sends, so the practical
-- value for this business is low. If ever wanted, it is two changes:
--   alter table public.invoices add column if not exists revoked_at timestamptz;
--   -- then add "and inv.revoked_at is null" to the WHERE clause above.
-- =============================================================================
