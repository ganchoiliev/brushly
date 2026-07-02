import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '@/components/gold-button';
import { Colors, Fonts, Spacing } from '@/constants/theme';

/* Web build of the AR screen — ViroReact is native-only, so the web target
   (used for design preview) gets a friendly explainer instead. */
export function WallPainter() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>AR runs in the app</Text>
      <Text style={styles.sub}>
        Wall detection needs ARKit or ARCore, so this screen only works in
        the iOS and Android builds. On the web, try the visualiser at
        brushly.uk/visualizer instead.
      </Text>
      <GoldButton label="Back" variant="ghost" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.cream,
    textAlign: 'center',
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.creamFaint,
    textAlign: 'center',
    maxWidth: 320,
  },
});
