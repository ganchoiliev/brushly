/* Environment-driven configuration. EXPO_PUBLIC_* vars are inlined at build
   time by Expo — set them in .env (see .env.example). The app talks to the
   Brushly site's existing /api routes; there is no separate mobile backend. */

const DEFAULT_API_BASE = 'https://brushly.uk'

function normalise(url: string): string {
  return url.replace(/\/+$/, '')
}

export const API_BASE_URL = normalise(
  process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE,
)

export function apiUrl(path: `/${string}`): string {
  return `${API_BASE_URL}${path}`
}
