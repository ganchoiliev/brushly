import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

/* The brand CTA — gold fill, charcoal text, gentle press-scale.
   Ghost variant is a hairline outline for secondary actions. */
export function GoldButton({
  label,
  onPress,
  variant = 'solid',
  disabled = false,
  style,
}: GoldButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={() => {
        scale.set(withTiming(0.97, { duration: 120 }));
      }}
      onPressOut={() => {
        scale.set(withTiming(1, { duration: 180 }));
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.base,
        variant === 'solid' ? styles.solid : styles.ghost,
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    minHeight: 52,
  },
  solid: {
    backgroundColor: Colors.gold,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    letterSpacing: 0.3,
    color: Colors.charcoal,
  },
  ghostLabel: {
    color: Colors.cream,
  },
});
