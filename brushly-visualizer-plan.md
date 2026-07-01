# Brushly AI Visualizer — Architecture & Build Plan

> Status: DRAFT v2 (decisions locked) · Owner: Gancho · Engine: Google Gemini via Vertex AI (EU)
> Governing standards: **B.L.A.S.T.** (Backend-only secrets · Layered auth · Authenticated/RLS · Scalable/stateless · Tested) and **A.N.T.** (Atomic · Networked · Themed).

---

## 0. Strategic frame (why this exists)

Not a gimmick — a **multi-year positioning bet**, app-grade, with two jobs:

1. **Public lead magnet** on brushly.uk — a homeowner snaps their room, sees it repainted/decorated photorealistically, converts into a warm, specific lead.
2. **Internal field tool** — Brushly opens the same tool on a tablet at the customer's house during a quote ("here's your lounge in three of our colours"), and attaches the render to the quote.

Launch: **ship free, instrument everything, validate before investing further.** Phase 1 answers three questions with real data — *Do people use it? Is it usable by non-technical homeowners? Does it capture usable contact info?*

**Success metric:** qualified leads + validated engagement. NOT render count.

---

## 1. Locked decisions

| Decision | Choice | Notes |
|---|---|---|
| Engine | **Gemini via Vertex AI — EU region** | Frankfurt (europe-west3) / Netherlands (europe-west4). Hero `gemini-3-pro-image-preview` / try-ons `gemini-3.1-flash-image-preview` (best regionally available). Base64 `inlineData` only. Thin `ImageEngine` interface (commitment, not lock-in). |
| Scope | **Surfaces only — furniture & layout preserved** | Maps 1:1 to Brushly's 4 services. No furniture swaps → highest fidelity, on-brand, lowest hallucination. |
| Capture | **1 free render → single-field soft gate** | Everyone gets one photoreal render; email OR phone unlocks more/save/quote. Free-render count tuned from Phase-1 data. |
| AR | **Capability ladder, sequenced** | Phase 1 = camera-capture → photoreal (iOS first-class). Live flat-preview = Phase 2. True immersive AR = native app (Phase 4). |
| Rate-limit store | **Postgres security-definer RPC** | Mirrors existing `next_number()`. No new infra. Upstash only if edge/high-concurrency later. |
| Hosting | **Vercel Pro + Fluid compute** | Render route `maxDuration = 60`. Async job+poll design kept on shelf for batches. |
| Compliance | **EU residency · Vertex DPA · no-training · 30-day auto-delete · consent** | Locked: EU region is UK-adequate under UK GDPR. Consent + policy copy in the content pack. |

---

## 2. Scope = Brushly's service menu (1:1)

The visualizer only ever shows what Brushly can actually deliver. Four modes, mirroring `/services`:

1. **Interior painting** — walls, ceilings, woodwork/skirting/architraves; finishes (matte, eggshell, satinwood, gloss).
2. **Exterior painting** — masonry, render, timber, uPVC, fascias/soffits. Whole-house colour; the most reliable AI recolor and highest kerb-appeal "wow".
3. **Wallpapering** — feature walls and full rooms; curated pattern library.
4. **Specialist finishes** — Venetian/polished plaster, limewash, metallic/pearlescent. Biggest differentiator: customers cannot picture these, so seeing them sells.

Furniture, layout, windows, and belongings are always preserved. No furniture/decor swaps — off-brand and the least reliable configuration.

---

## 3. AR capability ladder (the "most advanced available now", honestly sequenced)

Verified constraints (2026): iOS Safari has **no `immersive-ar`** (inline AR only); no turnkey **wall**-segmentation model exists; MediaPipe is flaky in Safari; Gemini is request→response (~3–15s), so it cannot run per-frame. Therefore:

- **Phase 1 — Universal camera-capture → photoreal (iOS = first-class):** live `getUserMedia` viewfinder → shutter → Gemini photoreal render. The captured render is the hero and beats any flat overlay. iPhone loses nothing that matters.
- **Phase 2 — Live flat-preview (the "AR feeling"):** on-device segmentation overlays colour that tracks the wall live; cross-platform via custom segmentation model + Safari fallback (BodyPix-class). Real build — do it after demand is proven. Shares its segmentation with render masking (§6 anti-hallucination).
- **Phase 3 — Progressive AR extras:** Android WebXR inline AR; iOS AR Quick Look (USDZ) swatch placement.
- **Phase 4 — Native app:** true immersive room-scale AR (ARKit/ARCore) + strongest in-field quoting tool. Separate project, only if validated.

---

## 4. System architecture (B.L.A.S.T.)

```
[Client /visualizer]
   1. compress + strip EXIF (canvas, ≤1600px)         ── privacy + cost + speed
   2. POST /api/visualizer/upload-url  ─────────────▶  signed upload URL (Supabase Storage)
   3. PUT photo ───────────────────────────────────▶  private bucket `visualizer/` (direct; bypasses 4.5MB fn limit)
   4. POST /api/visualizer/render {path,service,colour,finish}
          ├─ Zod validate → check_and_increment_quota() RPC → interior/safety moderation
          ├─ fetch photo from Storage → base64 inlineData → Vertex AI Gemini (creds server-only)
          ├─ automated QA gate (diff non-target regions) → retry/discard
          ├─ write result to Storage
          └─ return {beforeUrl, afterUrl, renderId} (short-TTL signed)
   5. render shown in existing <BeforeAfterSlider>
   6. (after 1st render) POST /api/visualizer/lead ─▶  insert leads(source='visualizer') + Resend notify
```

| B.L.A.S.T. | How this build satisfies it |
|---|---|
| **Backend-only secrets** | Vertex service-account creds only in the route handler env; `server-only` guard as in `admin.ts`. Never in the bundle. |
| **Layered** | client → signed-URL API → Storage → render proxy → Gemini → Storage. Each boundary validates independently; binaries never transit compute. |
| **Authenticated / RLS** | New private bucket + `visualizer_renders` table; `anon` revoked (matches 0001); public reaches data only via service-role handlers; reads via short-TTL signed URLs; internal mode gated by `is_admin()`. |
| **Scalable / stateless** | Stateless handlers; Postgres RPC quota; identical-input caching; Flash-first tiering; hard spend cap + kill-switch; sync→async drop-in. |
| **Tested** | Zod, handler smoke (mocked engine), rate-limit, RLS (anon reads nothing), migration, QA-gate, Playwright happy/sad. Failed tests block deploy. |

---

## 5. Data model & migrations

**`supabase/migrations/0007_visualizer.sql`**

- Extend `leads.source` check to include `'visualizer'`.
- `visualizer_renders`: `id, created_at, session_id, ip_hash, service ('interior'|'exterior'|'wallpaper'|'finish'), color_label, color_hex, finish, prompt, source_path, result_path, model, status, qa_score, cost_pence, lead_id (nullable fk)`.
- `visualizer_usage`: quota/spend counters keyed by ip_hash/session/day.
- `check_and_increment_quota(session, ip)` — security-definer RPC, atomic, mirrors `next_number()`.
- Enable RLS explicitly; `anon` = nothing; `authenticated` gated by `is_admin()`; public writes via service-role only.
- Private Storage bucket `visualizer` — signed URLs only.
- **Retention/GDPR:** EU region; consent line at capture; scheduled auto-delete of source+result after N days unless attached to a lead; documented deletion path.

---

## 6. AI pipeline

- **Engine:** Vertex AI. `inlineData` base64 (Files API breaks editing). ≤20MB request (our images far under). Region/residency per §15.
- **Model tiering:** `gemini-3.1-flash-image-preview` for rapid try-ons; `gemini-3-pro-image-preview` for the hero/save render. Confirm live pricing at build (~£0.02–0.05 Flash, ~£0.10–0.15 Pro/edit).
- **Prompt strategy (constrained edit):** "Repaint ONLY {service surfaces} in {colour name} ({hex}), {finish} finish. Preserve furniture, layout, floor, windows, trim, perspective, lighting and shadows exactly." Per-service surface lists; negative instructions against altering belongings/geometry.
- **Curated palette:** 16–24 named swatches (Brushly go-to + 2026 trend), grouped; big tap targets, no typing. Free-text only in internal mode.

### Anti-hallucination plan (smart)
1. **Furniture preserved by scope** — removes most risk up front.
2. **Automated QA gate** — diff non-target regions (SSIM/pixel); if the model changed furniture/geometry beyond threshold → auto-retry once, else discard with a friendly message. Bad renders never reach a customer.
3. **Surface masking (Phase 2)** — segment target surfaces, constrain edit to those pixels for pixel-precise results; reuses the live-preview segmentation model.
4. **Pre-tested prompts + curated palette** — minimise variance vs free-text.
5. **Human-in-the-loop (internal mode)** — Brushly reviews/regenerates before showing/sending to a client.
6. **Honest microcopy** — "AI visualisation — exact colours confirmed at survey." Manages trust + liability.
7. **Kill-switch** — global spend cap flips the tool to a "book a free colour consult" CTA.

---

## 7. Frontend (A.N.T. + premium, mandatory)

New route `src/app/(marketing)/visualizer/`. Mobile-first 3-step wizard, reusing the design system.

- **Atomic components:** `VisualizerUploader` (getUserMedia viewfinder + `capture` file input), `ServicePicker` (4 modes), `ColorPalette`, `FinishPicker`, `RenderStage` (shimmer→result), `SoftGate` (single email/phone field), `BeforeAfter` (reuse existing slider).
- **Networked:** composed under one `VisualizerWizard`; reuse `Button`, `MagneticButton`, `ScrollReveal`, `shimmer.ts`, `useReducedMotion`.
- **Themed:** existing brand tokens (gold/charcoal/cream), Framer Motion step transitions.
- **Entry points:** `Header` nav link; homepage teaser + CTA; gallery cross-link.
- **Capture UX:** 1 free render, then single-field soft gate framed as value ("Where shall we send your render?" / "Get a free quote on this exact look"). Threshold tunable.

---

## 8. Internal / field mode (dual-use)

Admin-gated `src/app/admin/(app)/visualizer/` (`is_admin()`): no rate limit, free-text prompts, higher-res Pro renders, multi-colour compare, human review. **Attach render to lead/quote/client**; surface on lead + quote detail pages. Usable on a tablet on-site.

---

## 9. Instrumentation (validate-to-learn)

Reuse `gtag.ts` + Vercel Analytics. Funnel: `open → photo_added → render_succeeded → colour_changed → gate_shown → lead_captured`. Usability: per-step drop-off, time-to-first-render, retries, failed renders, device/OS split, QA-gate discards. Cost: renders/day & spend vs cap. Weekly auto-digest to Gancho (schedulable).

---

## 10. Security & abuse

Secrets server-only · RLS on new table · signed short-TTL URLs · EXIF strip client-side · interior+safety moderation pre-spend · Postgres RPC rate limits · global spend cap + kill-switch · honeypot on the gate (repo pattern) · Zod-validated, HTML-escaped notification emails (mirror `contact/route.ts`).

---

## 11. Testing (T — gates deploy)

Unit (Zod, prompt builder, cost calc, QA-gate) · integration (render w/ mocked engine, upload-url, lead insert) · RLS (anon reads neither bucket nor table) · migration · rate-limit + cap · Playwright e2e happy + sad (bad file, oversized, non-image, cap hit, engine failure). CI blocks deploy on failure.

---

## 12. Cost model (indicative — confirm at build)

Avg engaged session ≈ 4 Flash try-ons + 1 Pro hero ≈ **£0.20–0.35**. At 1,000 engaged sessions/mo ≈ **£200–350** uncapped. Levers: Flash-first tiering, caching, per-session caps, monthly kill-switch, and the 1-free-render gate (anonymous users capped at 1). Conservative cap for the free validation phase.

---

## 13. Phased roadmap

- **Phase 0 — Spike (½ day):** on a real Brushly room photo, prove one excellent interior-decorate render + one exterior render; validate prompt fidelity and whether masking is needed for Phase 1. Model IDs/contract already confirmed. Go/no-go on quality.
- **Phase 1 — Web MVP (public):** migration 0007, bucket, upload-url/render/lead handlers, Vertex integration, quota RPC + cap, QA gate, 4-service wizard, palette, before/after, soft gate, nav + homepage entry, instrumentation, tests. **← ship & validate free.**
- **Phase 2 — Internal field mode + live flat-preview:** admin route, attach-to-quote; on-device segmentation live preview + render masking.
- **Phase 3 — Hardening & growth:** retention cron, moderation tuning, weekly digest, per-colour/per-town SEO pages, share cards, WebXR/AR Quick Look extras.
- **Phase 4 — Native app AR (if validated):** ARKit/ARCore immersive AR + in-field tool.

---

## 14. Resolved / remaining

- ✅ Engine, scope, capture, AR path, rate-limit store, hosting, Gemini contract — locked above.
- ✅ Palette + per-service surface lists + legal copy — drafted in `brushly-visualizer-content.md` (awaiting Brushly's colour sign-off).
- ✅ **Data-residency — LOCKED: EU residency + best regional model (§15).**
- ▢ At build: pin exact EU region + model IDs, confirm current availability, watch `-preview` → GA.

---

## 15. Data-residency decision — LOCKED: Option A (EU residency + best model)

**Decision (2026-07-01): EU residency (Frankfurt/Netherlands) with the best regionally-available model.** UK-adequate under UK GDPR; near-best renders; strong safeguards. Rationale below.

Verified on Vertex AI (2026): **Gemini 3 image models require the global endpoint, which does not guarantee data residency.** UK/EU regional residency is only available on older image models (Gemini 2.5 Flash Image, Imagen) with visibly weaker renders. So best-model vs strict-residency is a real either/or. Three paths:

| Option | Model quality | Data location | When it's right |
|---|---|---|---|
| **A. EU residency + best regional model** *(recommended)* | High (Nano Banana Pro where regional; confirm at build) | EU (Frankfurt/NL) — UK-adequate under UK GDPR | Best balance; near-best renders, data stays in EU |
| **B. Global endpoint, absolute-best/newest model** | Highest (incl. newest previews) | Global (no residency) — covered by DPA, DPF, no-training, our auto-delete | If render quality must be maximal and low-sensitivity room photos + safeguards are acceptable |
| **C. UK-only residency (London)** | Lower (2.5 Flash Image / Imagen only) | UK only | Only if "photos stay in the UK" is a hard contractual/marketing promise |

`ImageEngine` abstraction + Vertex config make region a config change later, not a rewrite — so we can start on one and tighten/loosen without refactoring.
