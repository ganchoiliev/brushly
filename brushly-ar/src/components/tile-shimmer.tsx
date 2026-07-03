import { useEffect } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Fonts } from '@/constants/theme';

/* The "still working" state for a room tile. Replaces the old flat scrim +
   spinner with a soft cream sheen that sweeps across the darkened before-photo,
   so a pending grid feels like a reveal in progress rather than a dead wait.

   No gradient library (that'd be a native module → a fresh dev-client build);
   the sweep is a single translucent band whose opacity fades in and out at the
   ends, which reads soft without a real gradient. Respects reduced motion with
   a static scrim + label. The animation is started inside an effect, so it
   never runs during web SSR — the first paint is just the static tile. */

type ShimmerStatus = 'pending' | 'uploading' | 'rendering';

const SWEEP_MS = 1500;
// Band spans just over half the tile — wide + low-opacity reads as a gentle
// wash rather than a hard stripe.
const BAND_FRACTION = 0.55;
const SHEEN_PEAK = 0.14;

function statusLabel(status: ShimmerStatus): string {
  switch (status) {
    case 'uploading':
      return 'Uploading…';
    case 'rendering':
      return 'Painting…';
    default:
      return 'Waiting…';
  }
}

export function TileShimmer({ status }: { status: ShimmerStatus }) {
  const reduced = useReducedMotion();
  // Tile width, measured once via onLayout — lets the band sweep in real pixels
  // without a re-render (shared value writes don't re-render the component).
  const width = useSharedValue(0);
  // Sweep progress 0→1, looped. Starts at 0 so the pre-effect (and SSR) frame
  // shows an invisible band.
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    progress.set(
      withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(progress);
  }, [reduced, progress]);

  const bandStyle = useAnimatedStyle(() => {
    const tileW = width.get();
    const bandW = tileW * BAND_FRACTION;
    const p = progress.get();
    // Travel from fully off the left edge to fully off the right edge.
    const x = -bandW + (tileW + bandW) * p;
    const fade = interpolate(p, [0, 0.2, 0.8, 1], [0, 1, 1, 0], Extrapolation.CLAMP);
    return {
      width: bandW,
      opacity: fade * SHEEN_PEAK,
      transform: [{ translateX: x }],
    };
  });

  function onLayout(e: LayoutChangeEvent) {
    width.set(e.nativeEvent.layout.width);
  }

  return (
    <View style={styles.scrim} onLayout={onLayout}>
      {!reduced && <Animated.View pointerEvents="none" style={[styles.band, bandStyle]} />}
      <Text style={styles.label}>{statusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    // Matches the error/limit tile scrim in room-result so simultaneous tile
    // states read as one family.
    backgroundColor: 'rgba(21, 21, 21, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Colors.cream,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.cream,
    textAlign: 'center',
  },
});
