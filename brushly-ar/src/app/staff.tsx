import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '@/components/gold-button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useStaffSession } from '@/lib/staff';
import { supabase } from '@/lib/supabase';

/* Staff sign-in — same Supabase accounts as the site's /admin (email +
   password; swap to signInWithOtp if OTP is ever preferred). Staff mode
   unlocks "Attach to lead" on the result screen. */
export default function StaffScreen() {
  const router = useRouter();
  const session = useStaffSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (busy) return;
    if (!supabase) {
      setError('Staff sign-in is not configured in this build.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError('Sign in failed — check your email and password.');
    } else {
      setPassword('');
    }
    setBusy(false);
  }

  async function handleSignOut() {
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <Text style={styles.title}>Staff</Text>

          {session ? (
            <>
              <Text style={styles.sub}>
                Signed in as {session.user.email ?? 'staff'}. After a render,
                use “Attach to lead” to file it against a client.
              </Text>
              <GoldButton
                label={busy ? 'Signing out…' : 'Sign out'}
                variant="ghost"
                onPress={handleSignOut}
                disabled={busy}
              />
            </>
          ) : (
            <>
              <Text style={styles.sub}>
                Sign in with your Brushly admin account to attach renders to
                leads while you’re on site.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.creamFaint}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.creamFaint}
                secureTextEntry
                autoComplete="current-password"
                value={password}
                onChangeText={setPassword}
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <GoldButton
                label={busy ? 'Signing in…' : 'Sign in'}
                onPress={handleSignIn}
                disabled={busy || !email.trim() || !password}
              />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <GoldButton label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.charcoal,
    paddingHorizontal: Spacing.lg,
  },
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 34,
    color: Colors.cream,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.creamFaint,
    maxWidth: 320,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.goldLight,
  },
  footer: {
    paddingBottom: Spacing.lg,
  },
});
