# BUILD BRIEF — Brushly Admin v1.2 "Builder & Email" (`brushly.uk/admin`)

Third round. The admin is LIVE IN PRODUCTION at brushly.uk/admin — treat every change with production discipline. Binding law carries over from `ADMIN-BUILD-PROMPT.md` §1 (three-layer security, partner-proof UX §1.9, marketing-site untouchability, pence integers, plain English) and the visual system from `ADMIN-POLISH-PROMPT.md` §2.

This round: rebuild the quote/invoice **builder** (it fails on mobile and has real defects), elevate the **send-by-email experience**, and add **saved line items** for quoting speed. Quotes and invoices share builder components — every change lands in both.

---

## 0. GROUND RULES

- Confirm the v1.1 branch is merged into `master`; if not, STOP and report. Branch `feat/admin-builder` off `master`. Never commit to `master`. Push for Vercel previews; Gancho merges after acceptance.
- Schema changes via new migration `supabase/migrations/0003_item_presets.sql` — idempotent, explicit RLS + policies + grants per 0001 conventions. Print it and PAUSE for Gancho to run before building dependent UI.
- Re-read the existing builder code, send action, and PDF templates before changing anything. Refactor freely inside the admin; keep diffs purposeful.
- Next 16: consult `node_modules/next/dist/docs/` for unfamiliar APIs (AGENTS.md).

## 1. DEFECTS — fix first, in one commit

1. **Price input unusable**: the unit-price field renders ~40px wide — typed amounts are invisible (only the line total shows). Meanwhile qty gets ~6× the width. Priority is inverted; see §2 spec.
2. **Sticky totals overlap**: the sticky summary card overlays form content (the "VALID UNTIL" section heading is clipped beneath it). Sticky bar is REMOVED entirely this round (§3) — but treat the lesson as a rule: nothing may ever overlap interactive content.
3. **Numeric-input audit**: sweep every money/number input in the app (builder qty/price, settings sort code/account) for: visible width fitting realistic values (8 digits + separators for money), `inputmode="decimal"` (or `numeric`) so phones show the number keyboard, select-all on focus, format-on-blur via `formatGBP` conventions.

## 2. LINE-ITEM EDITOR — rebuild as cards (mobile-first)

Each line item is a **card**, not a row of naked inputs:

- **Description** across the card top (auto-growing textarea, placeholder "What's being done").
- Below it one row: **Qty** (compact, ~72px, with − / + stepper buttons flanking a typeable field; steppers move whole numbers, typing allows decimals like 1.5) · **Unit** (select: job/day/room/m²/item) · **Price** — the WIDEST input on the card, right-aligned, £ prefix inside the field, fits "12,500.00" comfortably; placeholder "0.00"; numeric keyboard on mobile; select-all on focus; formats with thousands separators on blur.
- **Line total** bottom-right of the card, bold, tabular, updates live.
- **Remove**: small ghost icon button top-right of the card, with confirm only if the line has content.
- **Reorder**: drag handle on the card edge (framer-motion Reorder) on desktop AND mobile long-press; keep subtle up/down buttons in an overflow position as the accessible fallback. The current chevron stack wastes a full column — kill it.
- "+ Add line" stays as the dashed full-width button; new card autofocuses its description.
- Desktop: same card design, comfortable max-width — no return to the cramped grid.

## 3. BUILDER LAYOUT — no sticky, use the space

- **Remove the sticky totals/save bar everywhere.** Totals (Subtotal / VAT when registered / Total) render as a normal right-aligned block after the line items, followed by the meta fields (valid-until / due date, notes, terms), then a full-width **Save** button at the form's end. "Unsaved changes" indicator sits quietly beside Save, never floating.
- **Desktop ≥1280px — two-pane builder**: form column left (~560px), and a **live document preview** right: a styled HTML rendering that mirrors the PDF layout (header band, parties, items table, totals, footer) and updates as you type. It is a visual mirror, NOT a per-keystroke PDF render — share the layout constants/format helpers with the PDF templates so the preview never lies. "Open PDF" button above the preview renders the real thing.
- **Mobile**: form only (no preview pane, no toggle) + the existing "Preview PDF" action. The form must be fully usable one-handed at 390px: no horizontal scrolling, no overlap, every input visibly wide enough for its content.
- Client picker, "What's the job?", and section order stay; tighten spacing per the §2 type scale of the polish brief.

## 4. SEND EXPERIENCE & EMAIL TEMPLATES

### 4.1 Send dialog (replaces blind send)
Tapping **Send** opens a dialog: To (client email, editable), Subject (prefilled, editable), **personal message** (prefilled paragraph, editable — this becomes the email's main paragraph), attachment chip ("QU-0007.pdf"), and two actions: **Send to client** and **Send test to us** (delivers to hello@brushly.uk only, marked "[TEST]" in subject — confidence button, costs nothing). On success: toast + status `sent` + `sent_at` (test sends change NO state).

### 4.2 Email structure (both documents; multipart HTML + plain-text)
- From: `Brushly <hello@brushly.uk>` · Reply-To: `hello@brushly.uk` · Subject: quote "Your quote from Brushly — QU-0007" / invoice "Invoice INV-0005 from Brushly — £1,250.50".
- Body (text-first HTML, system font stack, charcoal/gold accents, NO remote images — deliverability on a young domain): text wordmark "BRUSHLY" header; "Hi {first name}," ; the editable paragraph (default quote: "Thanks for having us out. Your quote for {title} is attached — it comes to {£total} and is valid until {date}."; default invoice: "Here's the invoice for {title} — {£total}, due {date}."); a compact facts block (number, total, valid-until/due); **invoices additionally include the payment block in the body**: bank name, sort code, account number, "Reference: INV-0005" — payable without opening the PDF; closing line "Questions? Call {settings.phone} or just reply to this email."; sign-off "{admins.name of the sender} — Brushly"; caption footer with the Companies Act line.
- Generate a faithful plain-text part alongside the HTML (multipart/alternative) — never HTML-only.
- Verify rendering by writing the HTML fixture to a file and reviewing it yourself; keep total HTML under ~30KB, tables-and-inline-styles only (no flexbox/grid — email clients).

## 5. SAVED ITEMS — quoting speed (migration 0003, pause for Gancho)

- `item_presets` (id uuid PK, description text not null, unit text check as items, unit_price_pence int not null default 0, position int not null default 0, created_at) — RLS admin-only, grants per 0001 lockdown conventions.
- Builder: "Add from saved" (secondary button beside "+ Add line") → bottom sheet (mobile) / popover (desktop) listing presets — tap inserts as a new line, editable as normal.
- Any line card's overflow: "Save as preset" (stores description/unit/price).
- Settings: "Saved items" section — list, edit, reorder, delete (hard delete acceptable here; presets are conveniences, not records).
- Empty state teaches: "Save the lines you quote all the time — add one from any quote."

## 6. BUILD ORDER (commit per step, conventional commits, on `feat/admin-builder`)

1. `fix(builder)`: §1 defects — price input, sticky overlap removal (interim: bar simply unstuck), numeric audit.
2. `feat(builder-cards)`: §2 line-item cards + reorder.
3. `feat(builder-layout)`: §3 totals-inline layout + desktop live preview pane.
4. `feat(send)`: §4 dialog + email templates + test-send. Review your own rendered email HTML fixture before calling it done.
5. `feat(presets)`: print migration 0003, PAUSE for Gancho, then §5.
6. `polish`: motion pass, full 390px builder audit, `npm run build` + lint clean, marketing byte-equivalence re-verification.

## 7. ACCEPTANCE

- [ ] Type 1250.5 into price on a 390px viewport: digits visible while typing, blurs to "1,250.50", line total correct; numeric keyboard appears on mobile.
- [ ] Nothing sticky in the builder; nothing overlaps; VALID UNTIL/meta sections fully reachable; Save sits at form end with the unsaved indicator.
- [ ] Desktop two-pane: preview mirrors the PDF for the same data (spot-check against a §3.2-style fixture render); "Open PDF" works.
- [ ] Full builder flow one-handed at 390px: client → job → 3 lines (one decimal qty, one from a preset) → save → send test → send real.
- [ ] Send dialog: editable message lands in the email; test-send goes only to hello@ with [TEST] and changes no state; real send sets sent/sent_at once.
- [ ] Email fixtures (quote + invoice) reviewed as rendered HTML: facts correct, invoice payment block present with reference, plain-text part faithful, <30KB, no remote images.
- [ ] Presets: save-from-line, insert-from-saved, manage in settings; RLS spot-check on `item_presets` (anon denied, non-admin zero rows).
- [ ] Counters untouched by all testing; no stray test records left anywhere.
- [ ] Marketing pages byte-equivalent; no gtag in admin; `npm run build` zero errors; no new lint findings.

## 8. OUT OF SCOPE

Money/expenses module, jobs, materials, public quote-acceptance pages or tracking pixels, WhatsApp PDF sharing, rate limiting, attachments other than the document PDF, multi-currency. Do not stub.
