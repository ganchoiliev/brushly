-- =============================================================================
-- Brushly Admin — 0011_close_public_execute
--
-- FIXES: anon can execute every function in schema public, including the two
-- visualizer quota RPCs, which are SECURITY DEFINER and take the rate-limit
-- identity as a parameter.
--
-- HOW THE HOLE OPENED (three correct-looking lines, one hole):
--   0001 line 219  revoke all on all functions in schema public from anon;
--   0001 line 224  alter default privileges ... revoke all on functions from anon;
--   0001 line 220  revoke usage on schema public from anon;        <- the real gate
--   0006 line 94   grant  usage on schema public to anon;          <- gate reopened
--
-- Postgres grants EXECUTE on every new function to PUBLIC, not to anon. anon
-- merely inherits it. Both 0001 revokes name `anon`, so neither removes the
-- PUBLIC grant. While 0001's `revoke usage on schema` stood, that did not
-- matter — anon could not reach the schema at all. 0006 restored schema usage
-- so the public quote page could call one function, and in doing so re-exposed
-- every function created afterwards. 0007's visualizer_check_and_increment and
-- 0008's visualizer_refund were created after 0006.
--
-- IMPACT: visualizer_refund(p_session, p_ip_hash, p_est_cost_pence) is definer,
-- so it bypasses RLS on visualizer_usage, and it takes the bucket identity as a
-- parameter. An anonymous caller decrements any bucket to zero, in a loop, with
-- the anon key that is already in the browser bundle. The daily render cap
-- (8/session, 30/IP at ~12p a render) stops constraining anything, and the
-- model spend is Brushly's.
--
-- Same class as second-brain 0027 step 2 — see
-- [[Grants And Policies Are Two Different Locks]].
--
-- Run once in the Supabase SQL editor (role: postgres). Idempotent.
-- =============================================================================

begin;

-- 1) Strip the implicit PUBLIC grant from every function in the schema, then
--    hand execute back only where it is earned. Loop rather than enumerate:
--    the live database carries hand-applied functions that are not files in
--    this directory (get_public_invoice among them), and an enumeration would
--    silently miss exactly the objects nobody reviewed.
do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public'
      and p.prokind in ('f','p')
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    n := n + 1;
  end loop;
  raise notice '0011: revoked PUBLIC+anon execute on % function(s)', n;
end
$$;

-- 2) authenticated keeps the whole surface; is_admin() gates every policy and
--    next_number() gates itself. This restores 0001's intent exactly.
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema public to service_role;

-- 3) anon gets back EXACTLY the two capability-token readers the public pages
--    need, and nothing else. Named explicitly — this list is the anon surface,
--    and it should be reviewable in one glance forever.
grant execute on function public.get_public_quote(text)   to anon;

-- get_public_invoice was applied by hand and is not a file in this directory.
-- Guarded so this migration does not fail on a database where it is absent.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_public_invoice'
  ) then
    execute 'grant execute on function public.get_public_invoice(text) to anon';
    raise notice '0011: re-granted anon execute on get_public_invoice(text)';
  else
    raise warning '0011: get_public_invoice NOT FOUND — /i/<token> will 404. '
                  'It exists in src/lib/supabase/types.ts but in no migration. '
                  'Dump it from the live DB and commit it before relying on this.';
  end if;
end
$$;

-- 4) Stop the next function from arriving pre-exposed. Postgres applies the
--    built-in PUBLIC default at creation time; this makes the revoke automatic
--    for anything postgres creates in this schema from here on.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public grant  execute on functions to authenticated, service_role;

commit;

-- =============================================================================
-- VERIFY — run after commit. Both must come back exactly as annotated.
-- =============================================================================
-- Expect ONLY get_public_quote and get_public_invoice:
select p.oid::regprocedure as anon_reachable
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and has_function_privilege('anon', p.oid, 'execute')
order by 1;

-- Expect zero rows:
select p.oid::regprocedure as public_still_holds_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('public', p.oid, 'execute')
order by 1;

-- And the probe that is actual evidence (expect 401 or 404, never 200):
--   curl -s -o /dev/null -w '%{http_code}\n' \
--     -X POST 'https://<ref>.supabase.co/rest/v1/rpc/visualizer_refund' \
--     -H 'apikey: <ANON_KEY>' -H 'Content-Type: application/json' \
--     -d '{"p_session":"probe","p_ip_hash":null,"p_est_cost_pence":0}'
