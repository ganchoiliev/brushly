import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '@/components/gold-button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { getColor } from '@/lib/palette';
import { deleteRoom, getRoom, type SavedRoom, type SavedWall } from '@/lib/saved-rooms';

/* A kept room reopened from My Rooms: the same before/after gallery as the live
   result, but read entirely from persisted local files (no server, no re-spend).
   Tapping a tile opens the full-screen slider; the room can be re-saved,
   re-shared, or deleted. */

function extOf(path: string): 'jpg' | 'png' {
  const p = String(path).split('?')[0];
  return p.endsWith('.jpg') || p.endsWith('.jpeg') ? 'jpg' : 'png';
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function SavedRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ?? '';

  const [room, setRoom] = useState<SavedRoom | null>(null);
  // Start in the loading state only when there's actually something to load —
  // avoids a synchronous setState in the load effect (react-compiler).
  const [loading, setLoading] = useState(() => Platform.OS !== 'web' && !!id);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !id) return;
    getRoom(id)
      .then((r) => {
        if (!alive.current) return;
        setRoom(r);
        setLoading(false);
      })
      .catch(() => {
        if (alive.current) setLoading(false);
      });
  }, [id]);

  function openWall(w: SavedWall) {
    router.push({
      pathname: '/result',
      params: {
        renderId: w.renderId,
        beforeUrl: w.beforePath,
        afterUrl: w.afterPath,
        colorId: room?.colorId ?? '',
        finish: room?.finish ?? '',
        ...(w.calibration
          ? {
              calPaint: w.calibration.paint.join(','),
              calWallLum: String(w.calibration.wallLum),
            }
          : {}),
      },
    });
  }

  /* Re-save the kept renders to the camera roll. The files are already local,
     so this is a straight MediaLibrary insert — no download. */
  async function handleSaveAll() {
    if (!room || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const MediaLibrary = await import('expo-media-library');
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        setNotice('Allow photo access in Settings to save your renders.');
        return;
      }
      let saved = 0;
      for (const w of room.walls) {
        try {
          await MediaLibrary.Asset.create(w.afterPath);
          saved += 1;
        } catch {
          // Skip a single failure; the aggregate count is reported below.
        }
      }
      if (!alive.current) return;
      setNotice(
        saved === room.walls.length
          ? `Saved ${saved} to your photos.`
          : `Saved ${saved} of ${room.walls.length}.`,
      );
    } catch {
      if (alive.current) setNotice('Could not save. Please try again.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function handleShare() {
    if (!room || busy) return;
    const first = room.walls[0];
    if (!first) return;
    setBusy(true);
    setNotice(null);
    try {
      const Sharing = await import('expo-sharing');
      if (!(await Sharing.isAvailableAsync())) {
        setNotice('Sharing isn’t available on this device.');
        return;
      }
      await Sharing.shareAsync(first.afterPath, {
        mimeType: extOf(first.afterPath) === 'jpg' ? 'image/jpeg' : 'image/png',
      });
    } catch {
      if (alive.current) setNotice('Could not share. Please try again.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  function handleDelete() {
    if (!room) return;
    Alert.alert(
      'Delete this room?',
      'Its saved photos and renders will be removed from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteRoom(id)
              .catch(() => {})
              .finally(() => {
                if (alive.current) router.back();
              });
          },
        },
      ],
    );
  }

  const color = room ? getColor(room.colorId) : undefined;
  const count = room?.walls.length ?? 0;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.back}
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {color?.label ?? 'Your room'}
          </Text>
          {room && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {room.finish} · {count} wall{count === 1 ? '' : 's'} ·{' '}
              {formatDate(room.createdAt)}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : !room ? (
        <View style={styles.centre}>
          <Text style={styles.emptyTitle}>Room not found</Text>
          <Text style={styles.emptyText}>This room is no longer on your device.</Text>
          <GoldButton label="Back to My Rooms" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
            {room.walls.map((w) => (
              <Pressable
                key={w.renderId}
                accessibilityRole="button"
                accessibilityLabel="Open before and after"
                onPress={() => openWall(w)}
                style={[styles.tile, count === 1 && styles.tileSingle]}
              >
                <Image
                  source={{ uri: w.afterPath }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.tileBadge}>
                  <Text style={styles.tileBadgeText}>After · tap to compare</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {notice && <Text style={styles.notice}>{notice}</Text>}

          <View style={styles.actions}>
            <View style={styles.secondaryRow}>
              <GoldButton
                label={busy ? 'Saving…' : count > 1 ? `Save all to Photos` : 'Save to Photos'}
                onPress={handleSaveAll}
                disabled={busy}
                style={styles.secondaryButton}
              />
              <GoldButton
                label="Share"
                variant="ghost"
                onPress={handleShare}
                disabled={busy}
                style={styles.secondaryButton}
              />
            </View>
            <GoldButton label="Delete room" variant="ghost" onPress={handleDelete} />
          </View>
        </>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  back: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Spacing.xs,
  },
  backGlyph: {
    fontFamily: Fonts.body,
    fontSize: 30,
    lineHeight: 32,
    color: Colors.cream,
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.cream,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.creamFaint,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.cream,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.creamFaint,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  tile: {
    width: '48%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.black,
  },
  tileSingle: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  tileBadge: {
    position: 'absolute',
    left: Spacing.sm,
    bottom: Spacing.sm,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.scrim,
  },
  tileBadgeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.3,
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
});
