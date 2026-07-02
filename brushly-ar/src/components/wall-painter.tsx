import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ViroARSceneNavigator,
  isARSupportedOnDevice,
  requestRequiredPermissions,
} from '@reactvision/react-viro';

import { SwatchRow } from '@/components/swatch-row';
import WallScene, { type WallSceneProps } from '@/components/wall-scene';
import { DEFAULT_SWATCH_ID } from '@/constants/swatches';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { GoldButton } from '@/components/gold-button';

type Phase = 'checking' | 'unsupported' | 'denied' | 'ready';

/* Full-bleed AR wall painter: camera passthrough, vertical-plane detection,
   live colour quads, swatch picker. Native only — see wall-painter.web.tsx. */
export function WallPainter() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>('checking');
  const [selectedId, setSelectedId] = useState(DEFAULT_SWATCH_ID);
  const [trackingReady, setTrackingReady] = useState(false);
  const [wallCount, setWallCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const support = await isARSupportedOnDevice();
        if (cancelled) return;
        if (!support.isARSupported) {
          setPhase('unsupported');
          return;
        }
        const granted = await requestRequiredPermissions(['camera']);
        if (cancelled) return;
        setPhase(granted.camera === false ? 'denied' : 'ready');
      } catch {
        // If the pre-checks themselves fail, let the AR session make the
        // OS-level permission prompt — never brick the screen on a check.
        if (!cancelled) setPhase('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const viroAppProps: WallSceneProps = useMemo(
    () => ({
      selectedColorId: selectedId,
      onWallCountChanged: setWallCount,
      onTrackingReady: setTrackingReady,
    }),
    [selectedId],
  );

  if (phase === 'checking') {
    return (
      <View style={styles.messageScreen}>
        <Text style={styles.messageText}>Preparing your camera…</Text>
      </View>
    );
  }

  if (phase === 'unsupported' || phase === 'denied') {
    return (
      <View style={styles.messageScreen}>
        <Text style={styles.messageTitle}>
          {phase === 'unsupported'
            ? 'AR isn’t supported here'
            : 'Camera access needed'}
        </Text>
        <Text style={styles.messageText}>
          {phase === 'unsupported'
            ? 'This device doesn’t support augmented reality. You can still get a photoreal preview at brushly.uk/visualizer.'
            : 'Allow camera access in Settings to paint your walls in AR.'}
        </Text>
        <GoldButton label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const hint = !trackingReady
    ? 'Move your phone slowly'
    : wallCount === 0
      ? 'Point at the wall you want to paint'
      : null;

  return (
    <View style={styles.screen}>
      <ViroARSceneNavigator
        autofocus
        initialScene={{ scene: WallScene }}
        viroAppProps={viroAppProps}
        style={StyleSheet.absoluteFill}
      />

      {/* Overlay UI */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close AR"
        onPress={() => router.back()}
        style={[styles.close, { top: insets.top + Spacing.sm }]}
        hitSlop={12}
      >
        <Text style={styles.closeGlyph}>✕</Text>
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.md }]}>
        {hint && (
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>{hint}</Text>
          </View>
        )}
        <SwatchRow
          selectedId={selectedId}
          onSelect={(swatch) => setSelectedId(swatch.id)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  messageScreen: {
    flex: 1,
    backgroundColor: Colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  messageTitle: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.cream,
    textAlign: 'center',
  },
  messageText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.creamFaint,
    textAlign: 'center',
    maxWidth: 300,
  },
  close: {
    position: 'absolute',
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeGlyph: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.cream,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.scrim,
  },
  hintPill: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  hintText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.cream,
  },
});
