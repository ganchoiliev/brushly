-- ============================================================
-- Brushly Admin — 0001_init
-- Run once in the Supabase SQL editor (role: postgres).
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- ===================== TABLES ===============================

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  name              text not null,
  email             text,
  phone             text,
  service           text,
  message           text,
  source            text not null default 'website'
                    check (source in ('website','ads','referral','phone','manual')),
  status            text not null default 'new'
                    check (status in ('new','contacted','quoted','won','lost','spam')),
  notes             text,
  status_changed_at timestamptz not null default now()
);

create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text not null,
  email         text,
  phone         text,
  address_line1 text,
  address_line2 text,
  town          text,
  postcode      text,
  notes         text
);

create table if not exists public.quotes (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  quote_number   int not null unique,
  client_id      uuid not null references public.clients(id),
  lead_id        uuid references public.leads(id),
  title          text not null,
  status         text not null default 'draft'
                 check (status in ('draft','sent','accepted','declined','expired')),
  issue_date     date,
  valid_until    date,
  vat_rate       numeric(5,2) not null default 0,
  subtotal_pence int not null default 0,
  vat_pence      int not null default 0,
  total_pence    int not null default 0,
  notes          text,
  terms          text,
  sent_at        timestamptz,
  decided_at     timestamptz
);

create table if not exists public.quote_items (
  id               uuid primary key default gen_random_uuid(),
  quote_id         uuid not null references public.quotes(id) on delete cascade,
  position         int not null default 0,
  description      text not null,
  qty              numeric(10,2) not null default 1,
  unit             text not null default 'job'
                   check (unit in ('job','day','room','m2','item')),
  unit_price_pence int not null default 0,
  total_pence      int not null default 0
);

create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  invoice_number int not null unique,
  quote_id       uuid references public.quotes(id),
  client_id      uuid not null references public.clients(id),
  title          text,
  status         text not null default 'draft'
                 check (status in ('draft','sent','paid','overdue','void')),
  issue_date     date,
  due_date       date,
  vat_rate       numeric(5,2) not null default 0,
  subtotal_pence int not null default 0,
  vat_pence      int not null default 0,
  total_pence    int not null default 0,
  paid_at        timestamptz,
  payment_method text check (payment_method in ('bank_transfer','cash')),
  notes          text
);

create table if not exists public.invoice_items (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references public.invoices(id) on delete cascade,
  position         int not null default 0,
  description      text not null,
  qty              numeric(10,2) not null default 1,
  unit             text not null default 'job'
                   check (unit in ('job','day','room','m2','item')),
  unit_price_pence int not null default 0,
  total_pence      int not null default 0
);

create table if not exists public.settings (
  id              int primary key default 1 check (id = 1),
  company_name    text not null default 'Brushly Ltd',
  company_number  text not null default '17056861',
  address         text not null default '18 Howard Road, Reigate, Surrey RH2 7JE',
  phone           text not null default '01737 479161',
  email           text not null default 'hello@brushly.uk',
  vat_registered  boolean not null default false,
  vat_number      text,
  bank_name       text,
  bank_sort_code  text,
  bank_account_no text,
  default_terms   text,
  quote_counter   int not null default 0,   -- first quote  = QU-0001
  invoice_counter int not null default 4    -- first invoice = INV-0005 (004 used manually)
);

-- ===================== FUNCTIONS ============================

-- Single source of truth for "is the caller one of the two admins".
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Atomic counters: no race, no gaps. Admin-only.
create or replace function public.next_number(kind text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  if kind = 'quote' then
    update public.settings set quote_counter = quote_counter + 1
      where id = 1 returning quote_counter into n;
  elsif kind = 'invoice' then
    update public.settings set invoice_counter = invoice_counter + 1
      where id = 1 returning invoice_counter into n;
  else
    raise exception 'unknown counter kind: %', kind;
  end if;

  if n is null then
    raise exception 'settings row missing';
  end if;
  return n;
end;
$$;

-- ===================== INDEXES ==============================

create index if not exists leads_status_created_idx   on public.leads (status, created_at desc);
create index if not exists quotes_status_idx          on public.quotes (status);
create index if not exists quotes_client_idx          on public.quotes (client_id);
create index if not exists quote_items_quote_idx      on public.quote_items (quote_id);
create index if not exists invoices_status_idx        on public.invoices (status);
create index if not exists invoices_client_idx        on public.invoices (client_id);
create index if not exists invoice_items_invoice_idx  on public.invoice_items (invoice_id);

-- ===================== RLS ==================================

alter table public.admins        enable row level security;
alter table public.leads         enable row level security;
alter table public.clients      enable row level security;
alter table public.quotes        enable row level security;
alter table public.quote_items   enable row level security;
alter table public.invoices      enable row level security;
alter table public.invoice_items enable row level security;
alter table public.settings      enable row level security;

do $pol$
declare
  t text;
begin
  foreach t in array array['admins','leads','clients','quotes','quote_items','invoices','invoice_items','settings']
  loop
    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    execute format(
      'create policy %I_admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t, t
    );
  end loop;
end
$pol$;

-- ===================== SEED =================================

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ===================== LOCKDOWN =============================
-- Project was created with permissive defaults; remediate here.
-- anon gets NOTHING. Public traffic reaches the DB only through
-- the service-role client inside server route handlers.

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
revoke usage on schema public from anon;

alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- authenticated keeps precise grants; RLS gates every row anyway.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;

-- ===================== AUTO-RLS INSURANCE ===================
-- Best effort: auto-enable RLS on any future table in public.
-- If the instance refuses event triggers, we continue — every
-- migration must enable RLS explicitly regardless.

create or replace function public.auto_enable_rls()
returns event_trigger
language plpgsql
as $$
declare
  obj record;
begin
  for obj in
    select * from pg_event_trigger_ddl_commands()
    where command_tag = 'CREATE TABLE'
  loop
    if obj.schema_name = 'public' then
      execute format('alter table %s enable row level security', obj.object_identity);
    end if;
  end loop;
end;
$$;

do $evt$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'auto_enable_rls_trigger') then
    create event trigger auto_enable_rls_trigger
      on ddl_command_end
      when tag in ('CREATE TABLE')
      execute function public.auto_enable_rls();
  end if;
exception when others then
  raise notice 'auto-RLS event trigger skipped (%) — migrations must enable RLS explicitly', sqlerrm;
end
$evt$;

commit;
