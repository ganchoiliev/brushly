-- Brushly Admin — 0006_quote_public_token
-- Run once in the Supabase SQL editor (role: postgres). NOT auto-applied.
-- Idempotent: safe to re-run.
--
-- Gives every quote a short, URL-unguessable token so it can be shown on a
-- public page (/q/<token>) — emailed or texted to the client — without any
-- login. The token (72 bits of randomness, base64url) IS the capability:
-- knowing it is the only way to reach the quote. The table itself stays
-- locked to anon; the public page reads ONE quote through a SECURITY DEFINER
-- RPC that takes only the token and never exposes the tables.

begin;

-- 1) Column + uniqueness. A DEFAULT means every NEW quote (create, duplicate,
--    copy-to-client) gets its own token with no app-code change.
alter table public.quotes
  add column if not exists public_token text unique;

alter table public.quotes
  alter column public_token set default
    replace(replace(encode(gen_random_bytes(9), 'base64'), '/', '_'), '+', '-');

-- 2) Backfill the quotes that pre-date the column.
update public.quotes
  set public_token =
    replace(replace(encode(gen_random_bytes(9), 'base64'), '/', '_'), '+', '-')
  where public_token is null;

-- 3) Public read path: token in, one assembled quote out (or null). SECURITY
--    DEFINER so it reads the locked tables as owner; it only ever returns the
--    single row whose token matches, plus the display fields needed to render.
create or replace function public.get_public_quote(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'quote', jsonb_build_object(
      'quote_number',   q.quote_number,
      'title',          q.title,
      'status',         q.status,
      'issue_date',     q.issue_date,
      'valid_until',    q.valid_until,
      'vat_rate',       q.vat_rate,
      'subtotal_pence', q.subtotal_pence,
      'vat_pence',      q.vat_pence,
      'total_pence',    q.total_pence,
      'notes',          q.notes,
      'terms',          q.terms,
      'public_token',   q.public_token
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'description',      i.description,
        'note',             i.note,
        'qty',              i.qty,
        'unit',             i.unit,
        'unit_price_pence', i.unit_price_pence,
        'total_pence',      i.total_pence
      ) order by i.position)
      from public.quote_items i
      where i.quote_id = q.id
    ), '[]'::jsonb),
    'client', jsonb_build_object(
      'name',          c.name,
      'address_line1', c.address_line1,
      'address_line2', c.address_line2,
      'town',          c.town,
      'postcode',      c.postcode
    ),
    'company', jsonb_build_object(
      'company_name',   s.company_name,
      'company_number', s.company_number,
      'address',        s.address,
      'phone',          s.phone,
      'email',          s.email,
      'vat_registered', s.vat_registered,
      'vat_number',     s.vat_number,
      'default_terms',  s.default_terms
    )
  )
  from public.quotes q
  join public.clients c  on c.id = q.client_id
  join public.settings s on s.id = 1
  where q.public_token = p_token
  limit 1;
$$;

-- 4) Minimal anon surface: schema usage + execute on THIS function only.
--    No table grants are restored — 0001's lockdown stands, and the function
--    is the single keyhole anon can reach (RLS is bypassed only inside it).
grant usage on schema public to anon;
grant execute on function public.get_public_quote(text) to anon;

commit;
