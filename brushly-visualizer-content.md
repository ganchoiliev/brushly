# Brushly Visualizer — Content Pack (palette · scope · legal copy)

> Companion to `brushly-visualizer-plan.md`. Everything here is a DRAFT to finalise with Brushly. Hex values are approximate — calibrate against each brand's official RGB (or a measured swatch) before launch, since the hex drives the render and paint appearance shifts with light and finish.

---

## 1. Colour palette (starter — ~22 across 6 groups)

Curated from Brushly's stated brands (Farrow & Ball, Little Greene, Dulux Trade) plus durable trend colours. Grouped so the UI shows tappable swatches, no typing.

**Neutrals & Whites**
- Wimborne White (F&B) — `#F0EBDA`
- Cornforth White (F&B) — `#CFC9BE`
- Elephant's Breath (F&B) — `#CDC0B0`
- Timeless (Dulux Trade) — `#E6DDCF`
- Purbeck Stone (F&B) — `#B7AE9F`

**Greens**
- Green Smoke (F&B) — `#6C7267`
- Card Room Green (F&B) — `#6A6D5D`
- Sage Green (Little Greene) — `#9AA089`
- Overtly Olive (Dulux Trade) — `#7C7A52`

**Blues**
- Hague Blue (F&B) — `#313E43`
- Stiffkey Blue (F&B) — `#3B4657`
- Denim Drift (Dulux Trade) — `#8E9CA6`
- Bone China Blue (Little Greene) — `#B7C4C3`

**Warm & Earth**
- Setting Plaster (F&B) — `#E3C6B8`
- Red Earth (F&B) — `#B06A50`
- Terracotta (Little Greene) — `#B5623F`

**Greys & Darks**
- Downpipe (F&B) — `#5B5E5B`
- Railings (F&B) — `#45484D`
- Off-Black (front doors) — `#24262A`

**Exterior masonry & doors**
- Classic White masonry — `#EFEAE0`
- Heritage Green door — `#5E6B54`
- Stone render — `#C9BFA9`

Rule: keep the public palette ~16–20 (choice paralysis kills conversion); expose the full range + free-text only in the internal/field mode.

---

## 2. Per-service surface lists + finishes

What the AI is allowed to change per mode. Everything not listed is preserved.

**Interior painting**
- Surfaces: walls · ceiling · woodwork (skirting, architraves, door frames, doors) · radiators · optional single feature wall.
- Finishes: matte/emulsion (walls); eggshell / satinwood / gloss (woodwork).

**Exterior painting**
- Surfaces: masonry / render walls · timber (fascias, soffits, bargeboards, window frames) · uPVC · garage door · front door (accent).
- Finishes: smooth masonry · textured masonry · satin/gloss trim.

**Wallpapering**
- Surfaces: single feature wall (default) or full-room walls.
- Pattern categories: geometric · floral · damask · plain textured · grasscloth. (Pattern application is harder for AI than flat colour — QA gate especially important here.)

**Specialist finishes**
- Surfaces: feature wall (default) or full room.
- Finishes: Venetian / polished plaster · limewash · metallic / pearlescent · colour wash / rag roll. (Highest differentiator — customers can't picture these.)

---

## 3. Legal copy (draft — for owner to place in the policy)

**Consent line (shown at the point of capture, under the email/phone field):**

> By continuing, you agree we can use the photo you upload to create your visualisation and contact you about your project. We never sell your data or use it to train AI, and we delete your photos and renders after 30 days unless you become a client. See our Privacy Policy.

**Privacy Policy — "AI Visualiser" section (draft):**

- **What we collect:** the photo(s) you upload; the visualisation(s) we generate; your name, email and/or phone if you choose to save a render or request a quote; basic anonymous usage events (device type, steps completed).
- **Why / lawful basis:** your consent — to generate your visualisation and, if you ask, to prepare a quote and follow up.
- **Who processes it:** Google (Vertex AI) as our image-processing sub-processor under a Data Processing Agreement — Google does not use your images to train its models; Supabase for storage; Resend for our email notifications. Processing region: **[UK / EU / global — per residency decision]**.
- **Retention:** photos and renders are automatically deleted after 30 days unless you become a client or ask us to keep them; contact details follow our normal enquiry-retention policy.
- **Your rights:** access, correction and deletion at any time — email hello@brushly.uk and we'll remove your data.

The processing-region line is deliberately blank pending the residency decision below.
