# Brushly Visualizer — AR Plan & Fable Prompt Series

> Companion to `brushly-visualizer-plan.md`. Governing standards: **B.L.A.S.T.** (Backend-only secrets · Layered · Authenticated/RLS · Scalable/stateless · Tested) and **A.N.T.** (Atomic · Networked · Themed).
> Decision (2026-07-01): build **both, sequenced** — Phase A (web live-preview AR, in the existing app) first; Phase B (native immersive AR app) second.

---

## 0. The AR ladder (reality-grounded)

Immersive, walk-around AR that recolours walls *live* only works well in a **native app** (ARKit/ARCore). iOS Safari has **no `immersive-ar`** in 2026, and Gemini is request→response (~10–20s) so it can't run per-frame. So "AR" is a ladder, not a single build:

- **Phase A — Web live-preview AR (now):** live camera + on-device wall segmentation + a real-time *flat* colour overlay (the "AR feeling"), with **tap-to-capture → the existing photoreal render** as the payoff. Cross-platform (iPhone included, as a flat preview). Ships on the current site.
- **Phase B — Native app AR (next):** Expo/React Native (or Swift) with true immersive ARKit/ARCore plane detection + the in-field quoting tool for Brushly staff. The "real" AR.

**The crux/risk of Phase A** is the segmentation model — there is no perfect turnkey web wall-segmenter. Phase A is sequenced so **A1 (live camera capture) is a shippable win on its own**; A2–A3 (segmentation + live overlay) are the ambitious part and can be deferred without losing A1.

---

## 1. How to use these prompts with Fable

1. Point Fable at the `brushly-site` repo.
2. Paste the **Context preamble** (below) once at the start of the session (or prepend it to each prompt if Fable doesn't retain context).
3. Run **one prompt at a time, in order.** After each: run `npx tsc --noEmit` and `npx eslint`, do the manual check in the prompt's "Done when", then commit before the next prompt.
4. If a prompt is too big for one pass, ask Fable to split it and keep the "Done when" as the acceptance gate.

### Context preamble (paste once)

```
You are working in an existing PRODUCTION Next.js 16 / React 19 / TypeScript / Tailwind v4 app for "Brushly", a UK painting & decorating company. Do not break existing features.

Existing AI Paint Visualizer (reuse it, don't reinvent):
- Route: src/app/(marketing)/visualizer/page.tsx renders <VisualizerWizard/>.
- Components: src/components/visualizer/* (VisualizerWizard, Uploader, ColorChooser, VisualBeforeAfter, SoftGate, RenderProgress).
- Client helpers: src/lib/visualizer/client.ts exports getSessionId(), processImage(file)->Blob (EXIF-orient + downscale + strip), uploadPhoto(sessionId, blob)->sourcePath, requestRender({sessionId, sourcePath, service, colorId, finish})->{renderId, beforeUrl, afterUrl}.
- Data: src/lib/visualizer/palette.ts exports PALETTE, PALETTE_BY_SPECTRUM, LOOKS, FINISHES, getColor(id), SERVICE_LABELS. VisualizerService = 'interior'|'exterior'|'wallpaper'|'finish'.
- Server proxy: src/app/api/visualizer/render/route.ts calls Google Gemini server-side (never expose keys client-side).
- Analytics: src/lib/gtag.ts exports trackEvent(name).

Design system (premium is mandatory): Tailwind v4 tokens brushly-gold (#C8A96E), brushly-gold-light, brushly-charcoal, brushly-cream, brushly-black, brushly-off-black; fonts font-display (serif) + font-body (sans); ease [0.22,1,0.36,1]; use framer-motion for motion; mobile-first; respect prefers-reduced-motion (hook: src/hooks/useReducedMotion.ts).

Rules: 'use client' only where needed. No new npm deps unless the prompt says so. Match existing code style. B.L.A.S.T.: no secrets in the client bundle; any model/API key stays server-side. After each change, `npx tsc --noEmit` and `npx eslint` must pass. Keep everything typed (no `any`).
```

---

## 2. Phase A — Web live-preview AR (architecture)

- **Camera:** `getUserMedia({ video: { facingMode: 'environment' } })` into a `<video muted playsInline autoPlay>` (iOS-safe). Full-bleed premium viewfinder; stop tracks on unmount.
- **Segmentation:** `onnxruntime-web` running an **ADE20K** semantic-segmentation model (SegFormer-B0 or DeepLabV3+, INT8-quantised, hosted in `/public/models/`). ADE20K has `wall`, `floor`, `ceiling` classes. Execution providers: WebGPU → WebGL → WASM fallback. Run at downscaled input (256–512px), upscale the mask.
- **Overlay:** canvas over the video; composite the chosen colour on the wall mask with a multiply/soft-light blend (keeps texture + shadows); temporal smoothing + feathered edges to cut flicker.
- **Payoff:** shutter captures the current frame → the EXISTING `processImage → uploadPhoto → requestRender` pipeline → the existing result view (before/after, download/share, gate). Live overlay = preview; Gemini render = the hero.
- **Graceful degradation:** if WebGL/WebGPU unavailable or fps too low (older iOS), disable the live overlay and fall back to plain live capture (A1). Never block the user.
- **Guardrails:** camera permission states; memory cleanup (stop tracks, dispose ORT session); no secrets client-side; analytics events.

### Fable prompts — Phase A

#### Prompt A1 — Live camera capture mode
```
Add a live camera mode to the visualizer.

Build a client component src/components/visualizer/ARCamera.tsx: a full-bleed, premium camera viewfinder using getUserMedia({ video: { facingMode: 'environment' }, audio: false }) into a <video muted playsInline autoPlay>. Add a shutter button; on tap, draw the current video frame to a canvas, export a JPEG Blob (max 1600px longest side), and call a prop onCapture(file: File). Handle: permission denied / no camera (friendly message + a "Upload instead" fallback), iOS Safari autoplay quirks, and full cleanup (stop all MediaStream tracks on unmount/close). Include a close (X) button and a subtle "Point at the wall you want to paint" hint. Respect prefers-reduced-motion.

Wire it into VisualizerWizard: on the upload step add a prominent "Use my camera" button next to the existing uploader. When ARCamera calls onCapture(file), feed that file into the SAME flow the uploader uses (processImage → uploadPhoto → step 'design'). No segmentation yet.

Done when: on a phone, "Use my camera" opens the viewfinder; the shutter captures a frame and advances to the design step with that photo; iOS Safari + Android Chrome both work; camera tracks are released on close; tsc + eslint pass.
```

#### Prompt A2 — Wall segmentation model (still frame)
```
Add on-device wall segmentation.

Install onnxruntime-web. Source a permissively-licensed, pre-trained ADE20K semantic-segmentation model (SegFormer-B0 or DeepLabV3+), INT8-quantised, and place it in public/models/ (document the exact source + license in a comment). Build src/lib/visualizer/segmentation.ts:
- lazyInit(): loads the ORT session once, choosing execution provider WebGPU → WebGL → WASM with fallback.
- segmentWall(source: HTMLCanvasElement | ImageData): Promise<{ mask: Uint8ClampedArray; width: number; height: number }> — returns a binary wall mask (1 = wall). Preprocess to the model's input size (e.g. 512), argmax the output, keep the ADE20K 'wall' class, then return the mask at input resolution.
Keep the model lazy-loaded (only when AR mode is entered). Add a tiny debug route or dev-only overlay that runs segmentWall on a captured still and paints the mask so we can eyeball accuracy.

Done when: given a room photo, segmentWall returns a mask that reasonably highlights wall pixels; first inference <~300ms after warmup at 512px on a mid-range phone; the model is lazy-loaded and disposed on exit; no secrets added; tsc + eslint pass.
```

#### Prompt A3 — Real-time live colour overlay
```
Turn the still segmentation into a live AR preview in ARCamera.

Run segmentWall on the live video, throttled to ~6–10 fps at a downscaled 256px input (requestAnimationFrame loop with frame-skipping; never block the main thread — use the ORT session efficiently). Upscale the mask to the display size, apply temporal smoothing (blend with previous mask) and feathered edges to reduce flicker. Composite the user's chosen colour onto the wall region on a <canvas> layered over the <video>, using a multiply or soft-light blend so texture and shadows show through.

Add a compact colour control in AR mode (reuse PALETTE_BY_SPECTRUM as a horizontal swatch row); tapping a colour updates the live overlay instantly. Add a performance guard: measure fps; if WebGL/WebGPU is unavailable or sustained fps < 5, disable the live overlay and show a "Live preview isn't supported on this device — tap to capture and we'll render it" message (falls back to A1 capture).

Done when: pointing at a wall shows the chosen colour tracking the wall live at ≥~6fps on a mid-range phone; switching colours updates immediately; edges are stable (no severe flicker); unsupported devices degrade gracefully; tsc + eslint pass.
```

#### Prompt A4 — Capture → photoreal handoff + controls + polish
```
Connect the AR preview to the existing photoreal render.

In AR mode add service + finish controls (reuse SERVICE_LABELS + FINISHES) and keep the colour control from A3. The shutter should: capture the current frame → run it through the EXISTING pipeline (processImage → uploadPhoto → requestRender with the selected service/colour/finish) → show the result in the EXISTING result view (VisualBeforeAfter, download/share, SoftGate). The live overlay is the preview; the Gemini render is the payoff.

Premium polish: framer-motion transitions, brand tokens, safe-area insets, a subtle reticle/hint, reduced-motion support. Fire analytics via trackEvent: 'ar_open', 'ar_overlay_shown', 'ar_capture', 'ar_render_success'.

Done when: the full AR flow works on mobile end to end — open camera → live colour preview → shutter → photoreal render → result → save/quote — reusing the existing render route + result UI; analytics fire; tsc + eslint pass.
```

#### Prompt A5 — Hardening + tests
```
Harden AR mode and add tests.

Add: device-capability detection + the iOS/low-power fallback path; robust camera permission + error states; full memory cleanup (stop tracks, dispose ORT session/tensors); and a lazy-load boundary so the AR bundle + model are only fetched when AR mode is opened (dynamic import) — keep it off the critical path of /visualizer. Confirm no secrets are added to the client bundle.

Tests: a unit test for segmentation output shape/format (mock ORT), and a Playwright test for the AR entry + the fallback path using a mocked getUserMedia. Ensure `npx tsc --noEmit`, `npx eslint`, and `npm run build` all pass.

Done when: AR works or degrades gracefully on iOS Safari, Android Chrome, and desktop; tests pass; the main /visualizer route's bundle isn't bloated by the AR/model code (verify it's dynamically imported).
```

---

## 3. Phase B — Native app AR (architecture + prompts, later)

- **Stack:** Expo (React Native) + a Dev Client, using an AR library — **ViroReact (`@reactvision/react-viro`)** or an ARKit/ARCore config plugin. Share Brushly's palette/Looks data (copy `palette.ts` or extract a tiny shared package). Reuse the SAME backend: the app calls the existing `/api/visualizer/*` routes for the photoreal render + lead capture.
- **True AR:** ARKit `ARWorldTrackingConfiguration` vertical-plane detection (ARCore equivalent) → detect wall planes → project the chosen colour onto them in real time (much better than the web flat overlay).
- **Dual-use:** a staff-authenticated mode (Supabase auth) that attaches a render to a lead/quote — the in-field quoting tool.

### Fable prompts — Phase B (run after Phase A ships)

```
B1 — Scaffold an Expo (React Native, TypeScript) app "brushly-ar" with a Dev Client and an AR library (ViroReact or an ARKit/ARCore config plugin). Set up the Brushly design tokens (gold/charcoal/cream, serif + sans fonts), a bottom-tab-free single-flow shell, and an env-based API base URL pointing at the Brushly site's /api. No AR logic yet — just a running app on iOS + Android with a "Start AR" screen.

B2 — Add an AR camera screen with vertical-plane (wall) detection. Detect wall planes and render a semi-transparent coloured quad locked to the detected wall in real time. Include a small colour swatch row (hard-code 6 colours for now). Done when: pointing at a wall shows a colour that stays locked to the wall as you move the phone, on a real iOS device.

B3 — Load the real Brushly palette + Looks (port palette.ts). Add service + finish controls. Live-recolour the detected wall(s) as the user changes colour/finish.

B4 — Add a "Capture" that grabs the camera frame and POSTs it to the existing Brushly render API (/api/visualizer/upload-url + /api/visualizer/render) for a photoreal still, then shows a before/after with download/share. Reuse the same backend contract as the web app.

B5 — Add staff mode: Supabase auth (email/OTP), and after a render, an "Attach to quote/lead" action that links the render to a lead via a new authenticated endpoint. This is the in-field quoting tool.

B6 — Store-readiness: camera usage permission strings, app icons/splash, and TestFlight + Play internal-testing builds via EAS.
```

---

## 4. Guardrails, cost, testing (both phases)

- **Cost:** AR live preview is on-device (free); only the tap-to-capture render hits Gemini — the existing quota + monthly spend cap + moderation already apply because the app reuses `/api/visualizer/render`.
- **Privacy:** the live camera feed never leaves the device except the single frame the user captures (same consent + 30-day deletion as the web visualiser).
- **Performance:** Phase A must dynamic-import the model so `/visualizer` stays fast; target ≥6fps live, graceful fallback otherwise.
- **Testing:** each prompt ends with a `tsc + eslint` (and, for A5/native, build + Playwright/device) gate before the next.

## 5. Open risks
- Sourcing a good, licensed, small ADE20K web segmentation model is the #1 unknown (A2). If accuracy/perf is poor, ship A1 (live capture) and jump to Phase B for real AR.
- WebGPU support is uneven on iOS; WebGL/WASM fallback is mandatory.
- Native AR needs a paid Apple Developer account + real devices to test.
