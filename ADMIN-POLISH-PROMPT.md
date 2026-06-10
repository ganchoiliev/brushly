# BUILD BRIEF — Brushly Admin v1.1 "Polish & PDF" (`brushly.uk/admin`)

Second round on the live internal dashboard. v1 shipped complete (see `ADMIN-BUILD-PROMPT.md` — its §1 constraints remain binding law, especially the three-layer security model, partner-proof UX §1.9, marketing-site untouchability, and pence-integer money). This round has three missions, in priority order:

1. **PDF overhaul** — quotes/invoices must look hand-set by a print designer, verified by actually rendering and inspecting them.
2. **Visual elevation** — same brand, far better hierarchy, density, and polish. Easy to read, instant to understand.
3. **Copy & usefulness pass** — plain English everywhere; small features that make daily use faster for a non-technical user.

No new modules. Money/expenses, jobs, materials remain out of scope (v2).

---

## 0. GROUND RULES

- Branch: `git checkout master && git pull`, confirm `feat/admin` is merged (admin code present in master). If it is NOT merged, STOP and report. Then branch `feat/admin-polish`. Never touch `master` directly; Gancho merges after acceptance.
- Marketing site: zero behavioral change, re-verified at the end exactly as v1 did (byte-equivalence of prerendered marketing pages, no gtag in admin output).
- Any schema change is a NEW numbered migration `supabase/migrations/0002_*.sql` — idempotent, RLS enabled explicitly on any new table, lockdown conventions from 0001 maintained. Print the file and pause for Gancho to run it in the SQL editor before building dependent UI. Never modify 0001.
- Re-read the repo before assuming: file names, the proxy.ts auth guard, existing tokens in `globals.css`, the PDF components from v1. Build on what exists; refactor where it fights the new spec, but keep diffs purposeful.
- Next 16 caveat stands: consult `node_modules/next/dist/docs/` before using unfamiliar APIs (AGENTS.md).

## 1. COPY & CLARITY PASS (do first — cheap, immediate value)

Rename across app (and anywhere else jargon survives):

| Current | New |
|---|---|
| "New leads (7D)" | Title "New leads", subtitle "last 7 days" |
| "Open quotes" | Title "Open quotes", subtitle "awaiting answer" |
| "Won this month" | Title "Booked this month", subtitle "accepted quotes" |
| "Unpaid invoices" | Title "Unpaid invoices", subtitle "£X outstanding" |

Rules: no abbreviations a decorator wouldn't say on the phone ("7D", "QTY" → "Qty" is fine on tight tables, "VAT" is fine — it's universal). Dates render UK-style everywhere: "Mon 9 Jun" in lists, "9 June 2026" in detail/PDF. Ages as "2h ago", "3 days ago". Audit every button, empty state, toast, and error message against §1.9 plain-English; fix what fails. Error messages must say what to DO ("Check the email address and try again"), not what went wrong internally.

## 2. VISUAL ELEVATION

### 2.1 Foundation
- Formalize the admin token set in `globals.css` (`--color-admin-*`): canvas #151515, card #1C1C1C, raised #262626, hairline white/8%, text cream, text-muted — **run a contrast audit**: body text ≥4.5:1 against its actual surface, large numerals ≥3:1; adjust the muted token if it fails on cards. Gold stays scarce: primary action, active nav, focus ring, the one number that matters per screen.
- Type scale, 4 steps, enforced via shared components — Display (Cormorant, page titles), Heading (DM Sans 600), Body, Caption. Brand signature: page titles render with a gold terminal period — "Today.", "Leads." (app only, never in PDFs).
- All money right-aligned, `tabular-nums`, thousands separators via the existing `formatGBP`.

### 2.2 Dashboard "Today"
- Desktop currently wastes ~60% of the viewport. New layout ≥1024px: left column (2/3) = Add lead action + "Needs attention" + Recent activity; right column (1/3) = 2×2 stat grid. Mobile: stat cards as a 2×2 compact grid above the fold, Needs attention immediately under Add lead.
- Stat cards get: small icon, title + subtitle per §1 table, big numeral, and a **trend delta vs the prior period** ("↑ 3 vs last week", muted green/red, neutral when 0). Subtle count-up animation on load (≤400ms, disabled under reduced motion).
- "Needs attention" items become actionable rows: tap-to-call directly from the row where the action is a call.

### 2.3 Lists & detail screens
- List rows: client/lead name prominent, status as dot+label pill (color per existing status palette), money right-aligned, age muted; hover/active states; initials avatar for clients.
- Quote/invoice detail: document-style header (number large in Cormorant, status pill, client block), actions as a sticky bottom bar on mobile / top-right on desktop.
- Quote builder is the money screen: sticky running-total card (subtotal/VAT/total) always visible while editing line items; line-item rows with obvious add/remove/reorder affordances; explicit save state ("Saved ✓" / "Unsaved changes").
- Every list's empty state: one friendly teaching line + the primary action button (audit existing ones for tone and consistency).
- Motion: 150–250ms enter transitions, list layout animations, dialog springs — framer-motion only, reduced-motion respected, nothing slower than 300ms.

## 3. PDF OVERHAUL — the centerpiece

Rebuild the quote/invoice PDF templates to print-designer standard. White paper (always — these get printed), charcoal + gold accents.

### 3.1 Layout spec (A4, both documents share a system)
- **Header band**: charcoal block, gold "B" mark + BRUSHLY letterspaced wordmark (Cormorant), right side: document type + number ("QUOTE · QU-0007") and dates (issue, and valid-until for quotes / due for invoices).
- **Parties**: two columns — FROM (company, Companies House no., address, phone, email) and TO (client name, address). Em-dash for missing optional fields, never blank gaps.
- **Items table**: generous row height, hairline rules only (no zebra fills), columns Description / Qty / Unit / Unit price / Total; description wraps cleanly; qty shows trailing decimals only when present ("2" not "2.00", "1.5" stays "1.5").
- **Totals block**: right-aligned card — Subtotal, VAT line only when `vat_registered` (with rate), gold rule, TOTAL bold and larger. Pence-perfect, thousands separators.
- **Footer**: invoices → payment details (bank name, sort code formatted 00-00-00, account number, "Reference: INV-0005"); quotes → validity line + acceptance instruction ("Reply to this email or call us to accept"). Both → default terms, then the Companies Act line (registered name, number, office) in caption size. Page numbers "Page 1 of 2" when multipage.
- **States**: status `draft` renders a subtle diagonal "DRAFT" watermark; sent/accepted/paid render clean.
- Typography: registered TTFs — Cormorant (wordmark/display numerals), DM Sans (everything else), tabular numerals in all number columns. Consistent 8pt-grid spacing; nothing optically misaligned.

### 3.2 Verification protocol (this is what "no mistakes" means — not optional)
Build `scripts/pdf-proof.ts` (dev-only, kept in repo, excluded from build): renders SIX fixtures through the real template code:
1. Minimal quote — 1 line item, no VAT.
2. Long invoice — 14 line items forcing 2+ pages (table header must repeat; totals block must never orphan alone on a page without context).
3. VAT-registered invoice — 20% lines + VAT number shown.
4. Decimal quantities + units — 1.5 days, 32.5 m².
5. Hostile content — very long client name/address, descriptions with &, é, /, 60+ char unbroken strings.
6. Draft quote at £12,847.50 — watermark + thousands separator.

The script outputs PDFs AND page PNGs (use `pdftoppm` or equivalent). **You must view every PNG yourself and fix what you see** — overlap, clipping, widows/orphans, broken wrapping, inconsistent gutters, misaligned columns — and re-render until every page passes your own adversarial review. Additionally assert programmatically: fixture totals in the PDF text layer match computed pence math exactly. Report the fixture matrix as part of acceptance.

## 4. USEFULNESS UPGRADES (small, partner-focused)

- **Migration `0002_follow_ups.sql`**: add `follow_up_at timestamptz` to `leads` and `quotes` + supporting indexes. (Pause for Gancho to run it.)
- **Call-outcome buttons** on lead detail — one tap after a call: "No answer" (sets follow-up tomorrow 09:00, stays current status), "Call back…" (chips: This afternoon / Tomorrow / Next week / pick date), "Not interested" (→ lost). Each confirms via toast.
- **Follow-ups feed "Needs attention"**: due/overdue follow-ups appear as "Call Sarah back — today", tap-to-call, with a done action that clears `follow_up_at`.
- **Duplicate quote** action on quote detail (repeat clients): copies title, items, terms into a new draft with fresh number; nothing else carried.
- **Quotes auto-expire visually**: past `valid_until` and still `sent` → show as "expired" in lists/detail (computed at read time, consistent with the overdue-invoice pattern).

## 5. BUILD ORDER (commit per step, conventional commits, on `feat/admin-polish`)

1. `chore(tokens)`: token formalization + type-scale components + contrast audit fixes.
2. `feat(copy)`: §1 rename + plain-English audit.
3. `feat(dashboard)`: Today layout (desktop two-column, mobile 2×2), stat cards with deltas.
4. `feat(lists)`: row/pill/avatar polish, detail headers, builder sticky totals, empty-state audit.
5. `feat(pdf)`: templates + `pdf-proof.ts` + the full §3.2 render-inspect-fix loop. Do not proceed until all six fixtures pass your own review.
6. `feat(follow-ups)`: migration 0002 (pause for Gancho), outcome buttons, needs-attention integration, duplicate quote, expired quotes.
7. `polish`: motion pass, 390px full re-audit, `npm run build` + lint clean, marketing byte-equivalence re-verification.

## 6. ACCEPTANCE

- [ ] All §1 renames live; zero jargon survivors ("(7D)" gone).
- [ ] Contrast: no body text below 4.5:1 on its real surface (report measured ratios for the muted token on canvas and card).
- [ ] Desktop Today uses the viewport; mobile shows stats 2×2 above the fold at 390px.
- [ ] Six PDF fixtures rendered → PNGs reviewed → zero visual defects; totals in PDFs match pence math; multipage header repeats; watermark only on drafts. Attach the fixture pass matrix.
- [ ] Outcome buttons: each sets the documented status/follow-up; due follow-up appears in Needs attention and clears on done.
- [ ] Duplicate quote produces a clean draft with a fresh number.
- [ ] Full mobile flow re-run (lead → quote → PDF → accept → invoice → paid) still passes; counters untouched.
- [ ] Marketing pages byte-equivalent; no gtag in admin; `npm run build` zero errors; no new lint findings.
- [ ] RLS spot-check unchanged (anon denied; non-admin zero rows).

## 7. OUT OF SCOPE (unchanged from v1 + new exclusions)

Money/expenses module, jobs/scheduling, materials, bank feeds, rate limiting (documented limitation stands), global cmd-K search, WhatsApp PDF sharing, client-facing portal, light mode. Do not stub any of it.
