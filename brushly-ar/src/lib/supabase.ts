import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'

/* Same Supabase project as the site. Only staff ever sign in here (the
   public visualizer flow is anonymous); access is enforced server-side by
   the is_admin RPC and RLS, the anon key is public by design. */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/* Supabase is OPTIONAL. The anonymous capture → render → result flow never
   touches it — only staff sign-in ("Attach to lead") does. So a build that
   ships without these vars (e.g. EAS never inlined the gitignored .env) must
   degrade gracefully, NOT crash the app at import. `supabase` is null when
   unconfigured and every staff call site guards on it. */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // AsyncStorage's web shim touches `window` during the router-server's
          // Node render — on web, supabase's own SSR-guarded storage is correct.
          ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null

if (!supabase && __DEV__) {
  console.warn(
    '[brushly] Supabase not configured — EXPO_PUBLIC_SUPABASE_URL / ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY missing from this build. Staff sign-in is ' +
      'disabled; the anonymous render flow is unaffected. See eas.json / .env.example.',
  )
}

/* Keep tokens fresh while the app is foregrounded (official Expo pattern). */
if (supabase && Platform.OS !== 'web') {
  const client = supabase
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      client.auth.startAutoRefresh()
    } else {
      client.auth.stopAutoRefresh()
    }
  })
}
