import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Colors, Fonts, Spacing } from '@/constants/theme';

const STAGES = [
  'Uploading your photo…',
  'Mixing your colour…',
  'Painting your walls…',
  'Adding the finishing touches…',
] as const;

const STAGE_MS = 4000;

/* Full-screen staged progress while the Gemini render runs (~10–20s).
   Stages are timed, not wired to real progress — same trick as the site's
   RenderProgress; the last stage holds until the promise settles. */
export function RenderProgress({ colorLabel }: { colorLabel: string }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      STAGE_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.overlay}>
      <ActivityIndicator size="large" color={Colors.gold} />
      <Text style={styles.stage}>{STAGES[stage]}</Text>
      <View style={styles.colorRow}>
        <Text style={styles.colorLabel}>{colorLabel}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(21, 21, 21, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    zIndex: 20,
  },
  stage: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.cream,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  colorLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.creamFaint,
  },
});
