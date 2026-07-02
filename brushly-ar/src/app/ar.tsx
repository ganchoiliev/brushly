import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '@/components/gold-button';
import { Colors, Fonts, Spacing } from '@/constants/theme';

/* Placeholder — becomes the AR camera screen in B2 (vertical-plane wall
   detection + live colour quad). */
export default function ARScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.title}>AR camera</Text>
        <Text style={styles.sub}>
          Wall detection lands in the next milestone. This screen will open
          the camera, find your walls and paint them live.
        </Text>
      </View>
      <View style={styles.footer}>
        <GoldButton label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.charcoal,
    paddingHorizontal: Spacing.lg,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 34,
    color: Colors.cream,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.creamFaint,
    maxWidth: 320,
  },
  footer: {
    paddingBottom: Spacing.lg,
  },
});
