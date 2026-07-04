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
  useWindowDimensions,
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
  // Tiles whose persisted after-image won't decode — a corrupt/partial file from
  // an older save (before download verification). Keyed by renderId so the tile
  // shows an honest "Image unavailable" state instead of a silent blank, and the
  // room can be re-rendered from its kept before-photos to recover.
  const [failedById, setFailedById] = useState<Record<string, boolean>>({});

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

  // Tile sizing computed from the window width: aspectRatio on a percentage-width
  // flex child inside the wrapping grid collapsed to ZERO height on Android
  // (Yoga quirk), so the image had a 0px box and nothing showed. Explicit numeric
  // width+height per tile is robust. 3:4 portrait (width:height = 3:4).
  const { width: winW } = useWindowDimensions();
  const gutter = Spacing.lg * 2; // screen paddingHorizontal, both sides
  const colW = (winW - gutter - Spacing.sm) / 2; // two columns + one gap
  const fullW = winW - gutter;

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
      // Don't push a tile we know is broken to the camera roll — save only the
      // ones that decode, and report against that count so it stays honest.
      const savable = room.walls.filter((w) => !failedById[w.renderId]);
      let saved = 0;
      for (const w of savable) {
        try {
          await MediaLibrary.Asset.create(w.afterPath);
          saved += 1;
        } catch {
          // Skip a single failure; the aggregate count is reported below.
        }
      }
      if (!alive.current) return;
      setNotice(
        savable.length === 0
          ? 'These renders need re-rendering before you can save them.'
          : saved === savable.length
            ? `Saved ${saved} to your photos.`
            : `Saved ${saved} of ${savable.length}.`,
      );
    } catch {
      if (alive.current) setNotice('Could not save. Please try again.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  /* Re-render the walls whose after-image won't load, reusing the room-result
     pipeline on their kept before-photos. Produces fresh renders (new signed
     urls, re-verified on save) as a new room — the recovery path for a room
     with corrupt files. The kept before-photo is a local copy, so it's the one
     durable source we still have; the expired after-url is long gone. */
  function handleReRender() {
    if (!room) return;
    const shots = room.walls.filter((w) => failedById[w.renderId]).map((w) => w.beforePath);
    if (!shots.length) return;
    router.push({
      pathname: '/room-result',
      params: {
        shots: JSON.stringify(shots),
        colorId: room.colorId,
        finish: room.finish,
        service: room.service,
      },
    });
  }

  async function handleShare() {
    if (!room || busy) return;
    // Never share a tile we know is broken — pick the first that still decodes.
    const first = room.walls.find((w) => !failedById[w.renderId]);
    if (!first) {
      setNotice('These renders need re-rendering before you can share.');
      return;
    }
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
  const brokenCount = room ? room.walls.filter((w) => failedById[w.renderId]).length : 0;

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
      ) : room.walls.length === 0 ? (
        // An honest state for a room whose renders aren't on the device (e.g. saved
        // by an older build, or their files were cleared) — never a blank grid. The
        // colour is still known, so offer to paint it live right away.
        <View style={styles.centre}>
          <Text style={styles.emptyTitle}>No saved renders</Text>
          <Text style={styles.emptyText}>
            This room’s renders aren’t on this device anymore — but you can paint{' '}
            {color?.label ?? 'this colour'} live on your wall right now.
          </Text>
          <GoldButton
            label="See it live on your wall"
            onPress={() =>
              router.push({
                pathname: '/ar',
                params: { calColorId: room.colorId, calFinish: room.finish },
              })
            }
          />
          <GoldButton label="Delete room" variant="ghost" onPress={handleDelete} />
        </View>
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
            {room.walls.map((w) => {
              const isFailed = !!failedById[w.renderId];
              return (
                <Pressable
                  key={w.renderId}
                  accessibilityRole={isFailed ? 'image' : 'button'}
                  accessibilityLabel={isFailed ? 'Image unavailable' : 'Open before and after'}
                  accessibilityState={{ disabled: isFailed }}
                  disabled={isFailed}
                  onPress={() => openWall(w)}
                  style={[
                    styles.tile,
                    count === 1
                      ? { width: fullW, height: fullW * (4 / 3) }
                      : { width: colW, height: colW * (4 / 3) },
                  ]}
                >
                  {isFailed ? (
                    <View style={styles.tileScrim}>
                      <Text style={styles.tileUnavailableTitle}>Image unavailable</Text>
                      <Text style={styles.tileUnavailableText}>This render didn’t save fully.</Text>
                    </View>
                  ) : (
                    <>
                      <Image
                        source={{ uri: w.afterPath }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={200}
                        onError={() =>
                          setFailedById((prev) =>
                            prev[w.renderId] ? prev : { ...prev, [w.renderId]: true },
                          )
                        }
                      />
                      <View style={styles.tileBadge}>
                        <Text style={styles.tileBadgeText}>After · tap to compare</Text>
                      </View>
                    </>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {brokenCount > 0 && (
            <Text style={styles.warnNote}>
              {brokenCount === 1 ? 'One render' : `${brokenCount} renders`} didn’t save fully —
              re-render to restore {brokenCount === 1 ? 'it' : 'them'}.
            </Text>
          )}
          {notice && <Text style={styles.notice}>{notice}</Text>}

          <View style={styles.actions}>
            {/* Re-enter AR and paint this room's colour live on the wall. Works
                even if the saved renders are broken — it repaints live, it doesn't
                read the stored images. Calibration rides along when a wall has it. */}
            <GoldButton
              label="See it live on your wall"
              onPress={() =>
                router.push({
                  pathname: '/ar',
                  params: {
                    calColorId: room.colorId,
                    calFinish: room.finish,
                    ...(room.walls[0]?.calibration
                      ? {
                          calPaint: room.walls[0].calibration.paint.join(','),
                          calWallLum: String(room.walls[0].calibration.wallLum),
                        }
                      : {}),
                  },
                })
              }
            />
            {brokenCount > 0 && (
              <GoldButton
                label={`Re-render ${brokenCount} wall${brokenCount === 1 ? '' : 's'}`}
                onPress={handleReRender}
                disabled={busy}
              />
            )}
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
    // width + height are set inline (from window width) — aspectRatio collapsed
    // to zero height on Android inside the wrapping grid.
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.black,
  },
  tileScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: Colors.offBlack,
  },
  tileUnavailableTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.cream,
    textAlign: 'center',
  },
  tileUnavailableText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.creamFaint,
    textAlign: 'center',
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
  warnNote: {
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
