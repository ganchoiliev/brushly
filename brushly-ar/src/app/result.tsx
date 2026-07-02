import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '@/components/gold-button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { getColor } from '@/lib/palette';
import { useStaffSession } from '@/lib/staff';

/* The payoff screen: photoreal Gemini render vs the captured original,
   compared with a draggable divider. Save/share the after image. */
export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    renderId: string;
    beforeUrl: string;
    afterUrl: string;
    colorId: string;
    finish: string;
    // Present when the render route ran the calibration step — enables the
    // "See it live on your wall" AR re-entry in the render's achieved colour.
    calPaint?: string;
    calWallLum?: string;
  }>();

  const color = getColor(params.colorId ?? '');
  const staffSession = useStaffSession();
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const progress = useSharedValue(0.5);
  const containerW = useSharedValue(0);
  const [layoutW, setLayoutW] = useState(0);

  const pan = Gesture.Pan().onChange((event) => {
    const width = containerW.get();
    if (width <= 0) return;
    const next = progress.get() + event.changeX / width;
    progress.set(Math.min(1, Math.max(0, next)));
  });

  const beforeClipStyle = useAnimatedStyle(() => ({
    width: containerW.get() * progress.get(),
  }));
  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: containerW.get() * progress.get() - 21 }],
  }));

  /* The render is stored as result-<id>.png (Gemini returns PNG) — derive
     extension + MIME from the signed URL's path instead of assuming jpg. */
  const afterPath = String(params.afterUrl ?? '').split('?')[0];
  const afterExt = afterPath.endsWith('.jpg') || afterPath.endsWith('.jpeg') ? 'jpg' : 'png';
  const afterMime = afterExt === 'jpg' ? 'image/jpeg' : 'image/png';

  /* The signed afterUrl expires 10 minutes after render — pull it into
     cache once and reuse the local copy for save and share. expo-file-system
     / media-library / sharing are lazy-imported: their native classes don't
     exist in the web target's Node render. */
  async function downloadAfter(): Promise<string> {
    const { Directory, File, Paths } = await import('expo-file-system');
    const target = new File(
      new Directory(Paths.cache),
      `brushly-render-${params.renderId}.${afterExt}`,
    );
    if (target.exists) return target.uri;
    const downloaded = await File.downloadFileAsync(String(params.afterUrl), target);
    return downloaded.uri;
  }

  /* Prefetch on mount so save/share still work if the client and staff
     linger past the URL's TTL — and swap the on-screen image to the local
     copy, so the comparison view survives a cache eviction after the signed
     URL has expired (a lingering demo would otherwise go blank). */
  const [localAfterUri, setLocalAfterUri] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web' || !params.renderId) return;
    downloadAfter()
      .then(setLocalAfterUri)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per render result
  }, [params.renderId]);

  async function handleSave() {
    setBusy('save');
    setNotice(null);
    try {
      const MediaLibrary = await import('expo-media-library');
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        setNotice('Allow photo access in Settings to save your render.');
        return;
      }
      const uri = await downloadAfter();
      await MediaLibrary.Asset.create(uri);
      setNotice('Saved to your photos.');
    } catch {
      setNotice('Could not save the image. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy('share');
    setNotice(null);
    try {
      const Sharing = await import('expo-sharing');
      if (!(await Sharing.isAvailableAsync())) {
        setNotice('Sharing isn’t available on this device.');
        return;
      }
      const uri = await downloadAfter();
      await Sharing.shareAsync(uri, { mimeType: afterMime });
    } catch {
      setNotice('Could not share the image. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Your new wall</Text>
        {color && (
          <Text style={styles.subtitle}>
            {color.label} · {params.finish}
          </Text>
        )}
      </View>

      <GestureDetector gesture={pan}>
        <View
          style={styles.compare}
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            setLayoutW(width);
            containerW.set(width);
          }}
        >
          {/* After fills the frame; Before sits on top, clipped by width. */}
          <Image
            source={{ uri: localAfterUri ?? String(params.afterUrl) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          <Animated.View style={[styles.beforeClip, beforeClipStyle]}>
            {layoutW > 0 && (
              <Image
                source={{ uri: String(params.beforeUrl) }}
                style={{ width: layoutW, height: '100%' }}
                contentFit="cover"
              />
            )}
          </Animated.View>

          <Animated.View style={[styles.handle, handleStyle]}>
            <View style={styles.handleLine} />
            <View style={styles.handleKnob}>
              <Text style={styles.handleGlyph}>⇔</Text>
            </View>
            <View style={styles.handleLine} />
          </Animated.View>

          <View style={[styles.tag, styles.tagLeft]}>
            <Text style={styles.tagText}>Before</Text>
          </View>
          <View style={[styles.tag, styles.tagRight]}>
            <Text style={styles.tagText}>After</Text>
          </View>
        </View>
      </GestureDetector>

      {notice && <Text style={styles.notice}>{notice}</Text>}

      <View style={styles.actions}>
        {params.calPaint ? (
          <GoldButton
            label="See it live on your wall"
            onPress={() =>
              router.push({
                pathname: '/ar',
                params: {
                  calPaint: String(params.calPaint),
                  calWallLum: String(params.calWallLum ?? ''),
                  calColorId: String(params.colorId ?? ''),
                  calFinish: String(params.finish ?? ''),
                },
              })
            }
          />
        ) : null}
        <GoldButton
          label={busy === 'save' ? 'Saving…' : 'Save to Photos'}
          onPress={handleSave}
          disabled={busy !== null}
        />
        <View style={styles.secondaryRow}>
          <GoldButton
            label="Share"
            variant="ghost"
            onPress={handleShare}
            disabled={busy !== null}
            style={styles.secondaryButton}
          />
          <GoldButton
            label="Try another colour"
            variant="ghost"
            onPress={() => router.back()}
            style={styles.secondaryButton}
          />
        </View>
        {staffSession && (
          <GoldButton
            label="Attach to lead"
            variant="ghost"
            onPress={() =>
              router.push({
                pathname: '/attach',
                params: { renderId: String(params.renderId) },
              })
            }
          />
        )}
        <Text style={styles.footnote}>
          Your photo and render are kept for 30 days, then deleted.
        </Text>
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
  header: {
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.cream,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.creamFaint,
  },
  compare: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.black,
  },
  beforeClip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 42,
    alignItems: 'center',
  },
  handleLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.cream,
  },
  handleKnob: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleGlyph: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.charcoal,
  },
  tag: {
    position: 'absolute',
    top: Spacing.md,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.scrim,
  },
  tagLeft: {
    left: Spacing.md,
  },
  tagRight: {
    right: Spacing.md,
  },
  tagText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: Colors.cream,
  },
  notice: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.goldLight,
    textAlign: 'center',
    paddingTop: Spacing.sm,
  },
  actions: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
  },
  footnote: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.creamFaint,
    textAlign: 'center',
  },
});
