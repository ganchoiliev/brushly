import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { SWATCHES, type Swatch } from '@/constants/swatches';

interface SwatchRowProps {
  selectedId: string;
  onSelect: (swatch: Swatch) => void;
}

/* Horizontal colour picker for AR mode — dark scrim behind, gold ring on
   the active swatch, selected colour name above. */
export function SwatchRow({ selectedId, onSelect }: SwatchRowProps) {
  const selected = SWATCHES.find((s) => s.id === selectedId);

  return (
    <View style={styles.wrap}>
      {selected && <Text style={styles.label}>{selected.label}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {SWATCHES.map((swatch) => {
          const active = swatch.id === selectedId;
          return (
            <Pressable
              key={swatch.id}
              accessibilityRole="button"
              accessibilityLabel={`Paint colour ${swatch.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(swatch);
              }}
              style={[styles.ring, active && styles.ringActive]}
            >
              <View style={[styles.dot, { backgroundColor: swatch.hex }]} />
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
  row: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
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
