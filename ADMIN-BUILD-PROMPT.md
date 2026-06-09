# BUILD BRIEF — Brushly Internal Admin (`brushly.uk/admin`)

You are building the internal operations dashboard for Brushly Ltd (premium painting & decorating, Reigate/Surrey) inside this existing Next.js repo. Two users only: Gancho and his business partner. This brief is the contract — follow it exactly. Where it is silent, choose the simplest secure option and note the decision in your final summary.

---

## 0. GROUND TRUTH (verified against this repo — do not re-litigate)

- Next.js **16.2.1** App Router, React 19.2.4, TypeScript, **Tailwind v4** (tokens via CSS, no tailwind.config). Read `node_modules/next/dist/docs/` before writing Next-specific code — this Next version has breaking changes vs your training data (see AGENTS.md).
- Deployed on Vercel. Domain brushly.uk. Repo: github.com/ganchoiliev/brushly.
- **There is NO Supabase code in this project yet.** You are adding it from scratch. The Supabase project itself exists (name "Brushly", region eu-west-2 London, Micro compute, Data API ON). It was created with the permissive defaults — **"Automatically expose new tables" ON, automatic RLS OFF** — so the migration MUST remediate in a lockdown block at the end:
  1. Strip `anon` entirely: `revoke all on all tables in schema public from anon; revoke all on all sequences in schema public from anon; revoke all on all functions in schema public from anon; revoke usage on schema public from anon;` and `alter default privileges in schema public revoke all on tables from anon;` (repeat for sequences/functions). Public visitors touch the database only via the service-role client in the contact route.
  2. Keep/ensure explicit grants for `authenticated` (usage on schema, select/insert/update/delete on tables, usage+select on sequences) — RLS gates every row regardless.
  3. `enable row level security` explicitly on EVERY table created (never rely on project settings).
  4. Best-effort future-proofing: attempt to create an event trigger that auto-enables RLS on new tables in `public`, wrapped in a `DO` block with an exception handler that raises a notice and continues if Supabase denies event-trigger creation. Every future migration must still enable RLS explicitly — the trigger is insurance, not the mechanism.
- Email: Resend, verified sender `hello@brushly.uk` (`RESEND_API_KEY` exists in Vercel env). Contact form posts to `src/app/api/contact/route.ts` → email only, no persistence.
- Root layout (`src/app/layout.tsx`) currently hard-wires marketing chrome: Lenis `SmoothScroll`, `PageLoader`, `Header`, `Footer`, `CustomCursor`, `GrainOverlay`, Google Ads gtag (Consent Mode v2), Vercel Analytics. Fonts: `cormorantGaramond` (display) + `dmSans` (body) from `@/lib/fonts`. Brand classes like `bg-brushly-charcoal`, `text-brushly-cream` exist in globals.css; gold is `#C8A96E`.
- Business facts: Brushly Ltd, Companies House 17056861. NOT VAT registered (schema must carry VAT fields, defaulted off via settings). Invoices to date were manual PDFs — last number used is **004**, so the invoice counter starts at **5**. Quotes start at 1. Currency GBP, timezone Europe/London.

## 1. NON-NEGOTIABLE CONSTRAINTS

1. **Marketing site must not change behavior.** Same URLs, same SEO, same animations, same gtag firing on marketing pages only. Run `npm run build` after the restructure and verify every existing route still renders.
2. **Admin must NOT load**: Lenis/GSAP smooth scroll, CustomCursor, GrainOverlay, PageLoader, marketing Header/Footer, or the Google Ads gtag (internal traffic must never hit the Ads pixel).
3. **Security layers — all three, no shortcuts:**
   - Supabase Auth (email+password), public signups DISABLED. Sessions via `@supabase/ssr` cookies.
   - Next middleware guards `/admin/*` (unauthenticated → `/admin/login`) and keeps sessions refreshed.
   - **RLS enabled on every table.** Policies allow access only to authenticated users present in the `admins` table. RLS is the real boundary; middleware is convenience.
4. `SUPABASE_SERVICE_ROLE_KEY` is server-only: used exclusively in route handlers/server actions. It must never appear in client bundles. Public envs limited to `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. `/admin` is invisible to search: `robots.ts` disallow + `robots: { index: false, follow: false }` metadata in the admin layout. Sitemap must not include admin routes.
6. All mutations go through **server actions or route handlers** (validate with zod). No direct client-side table writes even though RLS would permit them — keeps an auditable choke point.
7. Money is stored as **integer pence** (`amount_pence`), never floats. Format with a single `formatGBP()` util.
8. Mobile-first. This gets used on ladders and in vans. Every screen must work one-handed on a phone; test at 390px.
9. **Partner-proof UX (binding, equal in weight to security).** The second user answers all calls and talks to clients; he is NOT technical. Design for him, not for you:
   - **Flagship interaction: add a lead while ON a phone call.** A "+ Lead" button reachable from every screen (center slot of the mobile tab bar). Only NAME and PHONE required to save — everything else optional, fillable later. Target: under 20 seconds, one thumb.
   - Plain English everywhere. "Turn into quote", "Mark as won", "Call back" — never "convert", "pipeline", "CRM", "CTA". Labels a decorator would say out loud on the phone.
   - One primary action per screen (the gold button). Tap targets ≥48px. No hover-only affordances.
   - Status changes are big labeled buttons on the detail screen ("Mark as contacted", "Mark as won") — never dropdowns, never drag-and-drop as the only path.
   - Every lead/client shows tap-to-call and tap-to-WhatsApp as prominent buttons, not buried icons.
   - Forgiving by default: no hard-delete anywhere in the UI (status changes only), confirmation dialog on anything irreversible (sending a quote/invoice), success toast on every save so he KNOWS it worked.
   - Never force re-login on trusted devices — rely on Supabase refresh-token persistence; sessions effectively permanent.
   - Empty states teach the next step in one sentence ("No leads yet — tap + when someone calls").
   - The home screen answers "what needs doing today?" at a glance, before any stats.

## 2. RESTRUCTURE (do this first, in its own commit)

1. Create route group `src/app/(marketing)/` and move into it: `page.tsx`, `HomePageClient.tsx`, `about/`, `services/`, `gallery/`, `contact/`, `template.tsx`, `not-found.tsx`.
2. Create `src/app/(marketing)/layout.tsx` carrying everything currently in the root layout's body: gtag scripts, `SmoothScroll`, `PageLoader`, `Header`, `Footer`, `CustomCursor`, `GrainOverlay`, Analytics, SpeedInsights, plus the existing marketing metadata.
3. Slim `src/app/layout.tsx` to: `<html>` with font variables + `globals.css` import + bare `<body>`. Move marketing-specific `metadata`/`viewport` down into the marketing layout; keep a minimal sane default at root.
4. Keep `api/`, `sitemap.ts`, `robots.ts`, icons at app root. Route groups don't change URLs — verify `/`, `/about`, `/services`, `/gallery`, `/contact` and the sitemap output are byte-identical in intent.

## 3. SUPABASE FOUNDATION

Install `@supabase/supabase-js` + `@supabase/ssr`. Create:

- `src/lib/supabase/client.ts` (browser client), `server.ts` (server client from cookies), `admin.ts` (service-role client, `import 'server-only'`).
- `middleware.ts` with matcher `['/admin/:path*']` — session refresh + redirect logic per current `@supabase/ssr` docs.

### Schema — ALREADY WRITTEN AND APPLIED. `supabase/migrations/0001_init.sql` exists in this repo and Gancho has run it (plus `supabase/seed-admins.sql`) against the live project. Do NOT regenerate or re-run it. READ THE FILE — it is the schema ground truth (the sketch below is an abbreviated reference only). At build step 2, verify connectivity with a throwaway script (then delete it): service-role `select * from settings` returns 1 row, `select count(*) from admins` returns 2, AND the live `information_schema.columns` for all 8 tables matches `0001_init.sql` column-for-column (earlier ad-hoc SQL experiments ran against this project — abort and report any drift instead of building on it).

```sql
-- admins: allowlist mapping auth users to the dashboard
admins        (user_id uuid PK references auth.users, name text, created_at)

-- helper used by every policy
create function is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from admins where user_id = auth.uid()) $$;

leads (
  id uuid PK default gen_random_uuid(), created_at timestamptz default now(),
  name text not null, email text, phone text, service text, message text,
  source text not null default 'website',          -- website | ads | referral | phone | manual
  status text not null default 'new',              -- new | contacted | quoted | won | lost | spam
  notes text, status_changed_at timestamptz default now()
)

clients (
  id uuid PK, created_at, name text not null, email text, phone text,
  address_line1 text, address_line2 text, town text, postcode text, notes text
)

quotes (
  id uuid PK, created_at, quote_number int unique not null,   -- from counter, display "QU-0001"
  client_id uuid references clients not null,
  lead_id uuid references leads,
  title text not null,                             -- e.g. "Full interior repaint — 3-bed, Reigate"
  status text not null default 'draft',            -- draft | sent | accepted | declined | expired
  issue_date date, valid_until date,
  vat_rate numeric not null default 0,
  subtotal_pence int not null default 0, vat_pence int not null default 0,
  total_pence int not null default 0,
  notes text, terms text, sent_at timestamptz, decided_at timestamptz
)

quote_items (
  id uuid PK, quote_id uuid references quotes on delete cascade,
  position int, description text not null, qty numeric not null default 1,
  unit text default 'job',                         -- job | day | room | m2 | item
  unit_price_pence int not null, total_pence int not null
)

invoices (
  id uuid PK, created_at, invoice_number int unique not null, -- counter starts at 5 ("INV-0005")
  quote_id uuid references quotes, client_id uuid references clients not null,
  title text, status text not null default 'draft',           -- draft | sent | paid | overdue | void
  issue_date date, due_date date,
  vat_rate numeric not null default 0,
  subtotal_pence int, vat_pence int, total_pence int,
  paid_at timestamptz, payment_method text, notes text
)

invoice_items ( -- same shape as quote_items, FK to invoices

)

settings (   -- single row
  id int PK default 1 check (id = 1),
  company_name text default 'Brushly Ltd',
  company_number text default '17056861',
  address text default '18 Howard Road, Reigate, Surrey RH2 7JE',
  phone text default '01737 479161', email text default 'hello@brushly.uk',
  vat_registered boolean default false, vat_number text,
  bank_name text, bank_sort_code text, bank_account_no text,  -- printed on invoices
  default_terms text, quote_counter int default 0, invoice_counter int default 4
)

create function next_number(kind text) returns int ...
-- atomic: UPDATE settings SET <kind>_counter = <kind>_counter + 1 RETURNING — no race, no gaps from reads
```

- Enable RLS on ALL tables. One policy set per table: `for all using (is_admin()) with check (is_admin())`. No anon policies — the public contact form inserts leads via the service-role client in the route handler.
- End the migration with the lockdown block from §0 (anon fully revoked, explicit authenticated grants, best-effort auto-RLS event trigger).
- Indexes: `leads(status, created_at desc)`, `quotes(status)`, `invoices(status)`, FKs.
- Seed: insert the settings row.

### Wire the contact form (small, high-value):
In `src/app/api/contact/route.ts`, after validation insert the lead via the service-role client, then send the Resend email. Wrap each side so one failing never blocks the other (lead insert failure → still email; email failure → still store lead, return success to the visitor either way, log the error).

## 4. ADMIN APP — STRUCTURE & DESIGN SYSTEM

```
src/app/admin/
├── layout.tsx          # auth check (server), noindex, AdminShell
├── login/page.tsx      # the only unauthenticated admin route
├── page.tsx            # Dashboard home
├── leads/page.tsx      + [id]/
├── quotes/page.tsx     + new/ + [id]/ + [id]/edit/
├── invoices/page.tsx   + new/ + [id]/
├── clients/page.tsx    + [id]/
└── settings/page.tsx
src/components/admin/   # admin-only components — never import marketing animation components
src/lib/admin/          # zod schemas, server actions, formatGBP, pdf/
```

New deps (admin only): `framer-motion`, `lucide-react`, `sonner` (toasts), `zod`, Radix primitives as needed (`@radix-ui/react-dialog`, `dropdown-menu`, `select`), `@react-pdf/renderer`. No shadcn generator, no chart lib in v1.

**Design system — premium tool, not marketing site.** Same brand DNA, different temperament:
- Surfaces: layered charcoal — canvas = existing `--color-brushly-charcoal` (#151515), cards `#1C1C1C`, raised `#262626` (add as new `@theme` tokens in globals.css, e.g. `--color-admin-card`), 1px borders `white/8%`, cream text (existing token), muted `#9A9A93`. Gold `#C8A96E` reserved for primary actions, active nav, focus rings, key numbers — scarcity keeps it premium.
- Status colors (badges/borders only): green `#4ADE80` won/paid/accepted, amber `#FBBF24` pending/sent, red `#F87171` lost/overdue, neutral for draft.
- Type: `dmSans` for ALL data/UI; `cormorantGaramond` only for page titles and the login wordmark. Tabular numerals (`font-variant-numeric: tabular-nums`) on every money/number column.
- Motion: framer-motion micro-transitions only — 150–250ms fades/slides on page enter, list item layout animations, dialog spring. Zero scroll-hijacking, zero cursor effects. `prefers-reduced-motion` respected (reuse `useReducedMotion` hook).
- Shell: desktop = slim icon+label sidebar; mobile = bottom tab bar (Dashboard, Leads, Quotes, Invoices, More) with safe-area padding. Sticky top bar with page title + primary action button.
- PWA-feel: `apple-mobile-web-app-capable`, `theme-color #151515`, app manifest scoped so "Add to Home Screen" opens /admin standalone.

## 5. FEATURES (v1)

### 5.1 Login
Email + password against Supabase Auth. Brushly gold-B wordmark, single card, error states. No signup, no password reset UI in v1 (reset happens via Supabase dashboard).

### 5.2 Dashboard home — "Today" first, numbers second
- Top of screen: big "+ Add lead" button and the "Needs attention" list (see below) — this is what the partner sees and acts on. Stats come after.
- Stat row: New leads (7d), Open quotes (count + £ value), Accepted this month (£), Unpaid invoices (count + £).
- "Needs attention" list: leads in `new` older than 24h, quotes `sent` with no decision after 7d, invoices past `due_date` (auto-show as overdue).
- Recent activity feed (last 10 leads/quotes/invoices by updated time).

### 5.3 Leads
- List with status filter tabs + search. Each row: name, service, source badge, age, status.
- Detail: full message, contact actions (`tel:`, `mailto:`, WhatsApp deep link), editable notes, big status buttons, "Turn into quote" → creates/links client (dedupe by email/phone prompt), opens prefilled quote builder, sets lead `quoted`.
- Quick-add lead (the constraint-9 flagship): name + phone required, service/area/notes optional. Source defaults to `phone`.

### 5.4 Quotes — the core
- Pipeline view: status columns/tabs with £ totals per status.
- Builder: client picker (inline-create), title, line items (description, qty, unit, unit price → auto line total), drag/re-order, subtotal/VAT(0 default, from settings)/total computed live server-validated, valid-until (default +30d), notes/terms (default from settings).
- Numbering via `next_number('quote')` at first save.
- Actions: **Preview PDF** (inline viewer or new tab), **Download PDF**, **Send** → Resend email to client (from hello@brushly.uk, replyTo hello@, warm 2-line body, PDF attached) → status `sent`, `sent_at` stamped. Mark accepted/declined → timestamps + lead status sync (`won`/`lost`).
- Accepted quote → "Create invoice" copies everything to a draft invoice in one click.

### 5.5 Invoices
Same builder/PDF/send machinery (shared components). Due date default +14d. "Mark paid" (records `paid_at`, method: bank transfer/cash). Overdue computed from `due_date`, surfaces on dashboard.

### 5.6 Clients
Auto-created via lead conversion or inline. Detail shows contact info + every quote/invoice + lifetime value. (KMNS — 3 past invoices — gets added manually by Gancho later.)

### 5.7 Settings
Edit the settings row: company/bank details, default terms, VAT toggle (+VAT number). VAT on → builders default 20%, PDFs show VAT lines + number. Counters displayed read-only.

### PDF spec (`@react-pdf/renderer`, Node runtime route handlers `/admin/api/quotes/[id]/pdf`, `/admin/api/invoices/[id]/pdf` — behind the same auth)
A4. Charcoal header band: gold "B" + BRUSHLY wordmark (Cormorant TTF registered, dmSans/standard sans for body), doc type + number ("QUOTE QU-0007"). Company block (name, Companies House no., address, phone, email) vs client block. Items table with gold rules, right-aligned tabular figures, totals block (subtotal/VAT if registered/total bold gold). Footer: payment details (invoices), validity (quotes), terms, registered-office line per Companies Act. White background for print. This must look hand-set — it IS the brand in the client's hands.

## 6. BUILD ORDER (commit per step, conventional commits)

All work happens on branch `feat/admin` — NEVER commit to or push `main`. The live site runs a paid Ads campaign; production breakage costs real money. Push the branch for Vercel preview deployments; Gancho merges to `main` only after §7 passes.

1. `chore(structure)`: route-group restructure + slim root layout. **Verify marketing site unchanged + `npm run build` passes before proceeding.**
2. `feat(supabase)`: deps, clients, middleware, contact-form lead capture. Migration is already applied (§3) — verify connectivity, do not regenerate schema.
3. `feat(admin-shell)`: login, auth guard, layout, nav, design tokens, empty pages.
4. `feat(leads)`: list/detail/status/manual add.
5. `feat(clients)` + `feat(quotes)`: builder, pipeline, numbering.
6. `feat(pdf)` + `feat(send)`: PDF routes, Resend send, accept/decline, lead sync.
7. `feat(invoices)`: quote→invoice, paid/overdue.
8. `feat(dashboard)` + `feat(settings)`.
9. `polish`: motion pass, empty states (every list needs a designed empty state — day one is all empty states), loading skeletons, error boundaries, mobile audit at 390px, `npm run build` + lint clean.

## 7. ACCEPTANCE CHECKS (run before declaring done)

- [ ] Marketing pages byte-equivalent in behavior; gtag absent from any `/admin` page source.
- [ ] `/admin` logged out → login. Wrong creds → clean error. Logged in → dashboard.
- [ ] curl any admin API/PDF route unauthenticated → 401/redirect, never data.
- [ ] Service-role key absent from client bundles (`grep` the `.next` client chunks).
- [ ] Contact form submission → row in `leads` AND email received; kill Supabase env locally → email still sends.
- [ ] Full flow on a 390px viewport: lead → convert → quote with 3 line items → PDF → send → accept → invoice → mark paid. Numbers: first quote QU-0001, first invoice INV-0005.
- [ ] £ values: enter 1,250.50 → stored 125050 → renders "£1,250.50" everywhere incl. PDF.
- [ ] Lockdown spot check: with the anon key and no session, `select * from leads` returns permission denied or zero rows — never data. With a logged-in session whose user is NOT in `admins`, also zero rows.
- [ ] `npm run build` zero errors; no new lint errors.

## 8. HUMAN SETUP (Claude: when you reach step 2, verify envs exist in `.env.local` and pause with this checklist if not)

Done before the build (verify, don't redo):
1. ✅ Supabase project "Brushly" created — London, Micro, Data API ON, auto-expose new tables OFF, automatic RLS ON. DB password in password manager.
2. ✅ Authentication: Email provider ON, **signups disabled**. Two users created: Gancho `ss7538dk@gmail.com`, partner `pstoya1@yahoo.co.uk` (strong passwords, stored in password manager).
3. ✅ Vercel env vars (+ local `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

4. ✅ Schema applied: `supabase/migrations/0001_init.sql` run in SQL editor; both admins seeded via `supabase/seed-admins.sql` (verification select returned 2 rows).

Remaining for Gancho after the build:
5. After deploy: both phones log in → Add to Home Screen. Walk the partner through it once; the app must carry him from there.

## 9. EXPLICITLY OUT OF SCOPE (v2+ — do not build, do not stub UI)

Money module (expenses w/ receipt photos in Supabase Storage, income vs invoices, per-job P&L, accountant CSV export), jobs & scheduling, materials per job, bank feed (open banking), CIS handling, multi-user roles, client portal. Schema for these arrives as future migrations — do NOT pre-create their tables now.
