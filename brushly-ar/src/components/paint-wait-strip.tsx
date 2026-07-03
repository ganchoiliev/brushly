import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import type { PaintColor } from '@/lib/palette';

/* The "while we paint…" strip — shown only while a room is still rendering, and
   removed the moment it settles. A calm, on-brand card that turns the wait into
   a moment: the chosen colour (swatch + label · brand · finish) and a rotating
   painter's tip as the hero. If the colour has a short "story", it leads the
   rotation so popular shades feel bespoke; everything else falls back to the
   generic tips. Reduced motion → no rotation, no cross-fade (shows the lead
   line only). */

// Generic, brand-voiced tips — a decorator talking you through the work. Kept
// small and colour-agnostic so any shade gets something to read.
const TIPS: string[] = [
  'Two coats give the truest depth of colour.',
  'Colours shift through the day as the light moves.',
  'We cut in by hand for crisp edges — no tape lines.',
  'A matte finish softens a room; eggshell wipes clean.',
  'Test it on your own wall before you commit — light changes everything.',
  'The right prep is what makes a finish last.',
]

const ROTATE_MS = 4200;

function buildLines(color: PaintColor | undefined): string[] {
  // A colour "story" (if we have one) leads, then the generic tips cycle.
  return color?.description ? [color.description, ...TIPS] : TIPS;
}

interface PaintWaitStripProps {
  color: PaintColor | undefined;
  finish: string;
}

export function PaintWaitStrip({ color, finish }: PaintWaitStripProps) {
  const reduced = useReducedMotion();
  const lines = useMemo(() => buildLines(color), [color]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced || lines.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % lines.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [reduced, lines.length]);

  // Guard against a stale index if the line set ever shrinks.
  const line = lines[index % lines.length] ?? lines[0];
  const caption = [color?.label, color?.brand, finish].filter(Boolean).join(' · ');

  return (
    <View style={styles.card}>
      {color ? <View style={[styles.swatch, { backgroundColor: color.hex }]} /> : null}
      <View style={styles.body}>
        <Text style={styles.eyebrow}>While we paint…</Text>
        {/* Fixed-height slot so a rotating tip of a different length never
            reflows the card (which would nudge the grid below). */}
        <View style={styles.tipSlot}>
          {reduced ? (
            <Text style={styles.tip} numberOfLines={3} maxFontSizeMultiplier={1.4}>
              {line}
            </Text>
          ) : (
            <Animated.Text
              key={index}
              entering={FadeIn.duration(450)}
              style={styles.tip}
              numberOfLines={3}
              maxFontSizeMultiplier={1.4}
            >
              {line}
            </Animated.Text>
          )}
        </View>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.offBlack,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  body: {
    flex: 1,
    gap: Spacing.xs,
  },
  eyebrow: {
    fontFamily: Fonts.displayMedium,
    fontSize: 15,
    letterSpacing: 0.3,
    color: Colors.gold,
  },
  tipSlot: {
    // Three lines at lineHeight 25 — the tallest a clamped tip is at default
    // text size — kept constant and vertically centred so shorter tips don't
    // shift the caption. minHeight (not a fixed height) lets it grow rather
    // than clip when the OS text size is enlarged; the font multiplier is
    // capped on the tip so the growth stays bounded.
    minHeight: 75,
    justifyContent: 'center',
  },
  tip: {
    fontFamily: Fonts.display,
    fontSize: 19,
    lineHeight: 25,
    color: Colors.cream,
  },
  caption: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.creamFaint,
  },
});
