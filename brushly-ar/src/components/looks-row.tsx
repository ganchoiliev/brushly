import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { LOOKS, getColor, type Look } from '@/lib/palette';

interface LooksRowProps {
  selectedLookId: string | null;
  onSelect: (look: Look) => void;
}

/* Curated one-tap Looks: colour dot + name + vibe, horizontally scrollable.
   Selecting a Look sets colour and finish together. */
export function LooksRow({ selectedLookId, onSelect }: LooksRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {LOOKS.map((look) => {
        const color = getColor(look.colorId);
        const active = look.id === selectedLookId;
        return (
          <Pressable
            key={look.id}
            accessibilityRole="button"
            accessibilityLabel={`Look ${look.name}: ${look.vibe}`}
            accessibilityState={{ selected: active }}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(look);
            }}
            style={[styles.card, active && styles.cardActive]}
          >
            <View style={[styles.dot, { backgroundColor: color?.hex ?? Colors.cream }]} />
            <View style={styles.copy}>
              <Text style={styles.name}>{look.name}</Text>
              <Text style={styles.vibe} numberOfLines={1}>
                {look.vibe}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  cardActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(200, 169, 110, 0.12)',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  copy: {
    gap: 1,
  },
  name: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.cream,
  },
  vibe: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.creamFaint,
    maxWidth: 140,
  },
});
