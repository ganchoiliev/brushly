import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  FINISHES,
  SERVICES,
  SERVICE_SHORT_LABELS,
  type VisualizerService,
} from '@/lib/palette';

interface ServiceFinishBarProps {
  service: VisualizerService;
  finish: string;
  onServiceChange: (service: VisualizerService) => void;
  onFinishChange: (finish: string) => void;
}

/* Two compact chip rows: the four Brushly services, then the finishes for
   the active service. Both drive the live wall material + the B4 render. */
export function ServiceFinishBar({
  service,
  finish,
  onServiceChange,
  onFinishChange,
}: ServiceFinishBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.serviceRow}>
        {SERVICES.map((s) => {
          const active = s === service;
          return (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={`Service ${SERVICE_SHORT_LABELS[s]}`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                Haptics.selectionAsync();
                onServiceChange(s);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {SERVICE_SHORT_LABELS[s]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.finishRow}
      >
        {FINISHES[service].map((f) => {
          const active = f === finish;
          return (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityLabel={`Finish ${f}`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                Haptics.selectionAsync();
                onFinishChange(f);
              }}
              style={[styles.finishChip, active && styles.finishChipActive]}
            >
              <Text
                style={[styles.finishText, active && styles.finishTextActive]}
              >
                {f}
              </Text>
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
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  chipActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  chipText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.3,
    color: Colors.cream,
  },
  chipTextActive: {
    color: Colors.charcoal,
  },
  finishRow: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  finishChip: {
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.pill,
  },
  finishChipActive: {
    backgroundColor: 'rgba(200, 169, 110, 0.18)',
  },
  finishText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.creamFaint,
  },
  finishTextActive: {
    color: Colors.goldLight,
  },
});
