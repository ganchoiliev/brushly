import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '@/components/gold-button';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { API_BASE_URL } from '@/lib/config';

/* The single entry point: brand moment + "Start AR". No tabs, no menu —
   the whole app is one flow. */
export default function StartScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.hero}>
        <Animated.Text entering={FadeInUp.duration(600)} style={styles.wordmark}>
          Brushly<Text style={styles.wordmarkDot}>.</Text>
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(120).duration(600)}
          style={styles.headline}
        >
          See your walls{'\n'}in a new colour
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(240).duration(600)}
          style={styles.sub}
        >
          Point your camera at any wall and try Farrow &amp; Ball, Little
          Greene and Dulux shades on it — live, in your room.
        </Animated.Text>
      </View>

      <Animated.View
        entering={FadeInDown.delay(360).duration(600)}
        style={styles.footer}
      >
        <GoldButton label="Start AR" onPress={() => router.push('/ar')} />
        <Text style={styles.footnote}>
          Uses your camera. Nothing is uploaded until you tap capture.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Staff sign in"
          onPress={() => router.push('/staff')}
          hitSlop={8}
        >
          <Text style={styles.staffLink}>Staff</Text>
        </Pressable>
        {__DEV__ && <Text style={styles.devNote}>API: {API_BASE_URL}</Text>}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.charcoal,
    paddingHorizontal: Spacing.lg,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  wordmark: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 18,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: Colors.cream,
  },
  wordmarkDot: {
    color: Colors.gold,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 44,
    lineHeight: 50,
    color: Colors.cream,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.creamFaint,
    maxWidth: 320,
  },
  footer: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  footnote: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.creamFaint,
    textAlign: 'center',
  },
  staffLink: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.creamFaint,
    textAlign: 'center',
  },
  devNote: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.goldDark,
    textAlign: 'center',
  },
});
