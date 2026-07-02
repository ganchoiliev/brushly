# Brushly AR

Native AR companion app for [brushly.uk](https://brushly.uk) — point the
camera at a wall, see Brushly paint colours on it live (ARKit/ARCore plane
detection via ViroReact), then capture a frame for a photoreal Gemini
render through the site's existing `/api/visualizer/*` backend. Staff can
sign in and attach a render to a CRM lead — the in-field quoting tool.

## Stack

- **Expo SDK 56 / React Native 0.85** — pinned: `@reactvision/react-viro`
  2.57.x supports `expo >=55 <57`. Upgrade to SDK 57 once
  [ReactVision/viro#492](https://github.com/ReactVision/viro/issues/492) closes.
- **ViroReact** for AR (config plugin in `app.json`; New Architecture only).
- **expo-router** single-flow stack: `index` → `ar` → `result` (→ `attach`),
  plus `staff` sign-in. No tabs.
- Brand tokens in `src/constants/theme.ts` mirror the site's Tailwind tokens.
- `src/lib/palette.ts` is a verbatim port of the site's
  `src/lib/visualizer/palette.ts` — **keep them in sync** (the render API
  validates colour ids server-side).

## Environment

Copy `.env.example` → `.env`. `EXPO_PUBLIC_API_BASE_URL` points at the
Brushly site (production or your LAN dev server); the Supabase URL/anon key
are the same public pair the site uses (staff auth is enforced server-side).

## Development

ViroReact contains native code, so **Expo Go won't work** — you need a dev
client build:

```bash
npm install
npx expo start          # JS only; pair with an installed dev client
npm run web             # web preview of the non-AR screens (AR shows a fallback)
```

There is no local Xcode/Android toolchain requirement — build dev clients
in the cloud with EAS (below), install on the phone, then `npx expo start`
and scan the QR.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
npx expo export --platform ios --platform android   # bundle sanity check
```

## EAS builds (dev / TestFlight / Play internal)

One-time setup (needs an Expo account; iOS also needs a paid Apple
Developer account, Android a Play Console account):

```bash
npm install -g eas-cli
eas login
eas init                # links the project (writes extra.eas.projectId)
```

Dev clients for real devices (AR needs a physical iPhone / ARCore phone):

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

Store test tracks:

```bash
eas build --profile production --platform ios
eas submit --platform ios          # → App Store Connect → TestFlight

eas build --profile production --platform android
eas submit --platform android      # → Play Console → internal testing
```

Notes:

- Camera / photo-library permission strings live in `app.json` under the
  Viro and expo-media-library plugins.
- ARCore is declared **optional** in the manifest; unsupported devices get
  a graceful fallback screen pointing at the web visualiser.
- Icons/splash are generated from brand tokens — `node scripts/generate-assets.mjs`
  (uses the parent site's `sharp`). Replace with designed assets any time.
- `visualizer_renders.lead_id` powers "Attach to lead"; the endpoints are
  `GET /api/staff/leads` and `POST /api/staff/attach-render` on the site,
  authenticated with the staff member's Supabase access token (`is_admin`).
- Known hardening TODO: the staff Supabase session persists in plaintext
  AsyncStorage (app sandbox). Android backup extraction is closed off with
  `android.allowBackup: false`; for defence in depth, migrate to Supabase's
  documented LargeSecureStore pattern (AES key in expo-secure-store,
  ciphertext in AsyncStorage) before wide staff rollout.
