import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { PALETTE_BY_SPECTRUM, type PaintColor } from '@/lib/palette';

interface SwatchRowProps {
  selectedId: string;
  onSelect: (color: PaintColor) => void;
}

/* Horizontal colour picker for AR mode — the full Brushly palette in
   spectrum order, gold ring on the active swatch, name + brand above. */
export function SwatchRow({ selectedId, onSelect }: SwatchRowProps) {
  const selected = PALETTE_BY_SPECTRUM.find((c) => c.id === selectedId);

  return (
    <View style={styles.wrap}>
      {selected && (
        <Text style={styles.label}>
          {selected.label}
          <Text style={styles.brand}>  ·  {selected.brand}</Text>
        </Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PALETTE_BY_SPECTRUM.map((color) => {
          const active = color.id === selectedId;
          return (
            <Pressable
              key={color.id}
              accessibilityRole="button"
              accessibilityLabel={`Paint colour ${color.label} by ${color.brand}`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(color);
              }}
              style={[styles.ring, active && styles.ringActive]}
            >
              <View style={[styles.dot, { backgroundColor: color.hex }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.4,
    color: Colors.cream,
    textAlign: 'center',
  },
  brand: {
    fontFamily: Fonts.body,
    color: Colors.creamFaint,
  },
  row: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  ring: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringActive: {
    borderColor: Colors.gold,
  },
  dot: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
