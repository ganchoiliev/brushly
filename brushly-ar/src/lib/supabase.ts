import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'

/* Same Supabase project as the site. Only staff ever sign in here (the
   public visualizer flow is anonymous); access is enforced server-side by
   the is_admin RPC and RLS, the anon key is public by design. */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — see .env.example',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // AsyncStorage's web shim touches `window` during the router-server's
    // Node render — on web, supabase's own SSR-guarded storage is correct.
    ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

/* Keep tokens fresh while the app is foregrounded (official Expo pattern). */
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}
