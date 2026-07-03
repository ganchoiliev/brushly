import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { listRooms, type SavedRoom } from '@/lib/saved-rooms';

/* My Rooms: every room the user has painted, kept on the device. Cards show the
   first wall's after image; tapping opens the room's before/after gallery. */

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

export default function MyRoomsScreen() {
  const router = useRouter();
  // null = still loading (first paint); [] = loaded and genuinely empty.
  const [rooms, setRooms] = useState<SavedRoom[] | null>(null);

  // Reload on every refocus so a freshly-kept or just-deleted room is reflected
  // without a manual refresh (returning from /saved-room or /room-result).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (Platform.OS === 'web') {
        setRooms([]);
        return;
      }
      listRooms()
        .then((r) => {
          if (active) setRooms(r);
        })
        .catch(() => {
          if (active) setRooms([]);
        });
      return () => {
        active = false;
      };
    }, []),
  );

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
        <Text style={styles.title}>My Rooms</Text>
      </View>

      {rooms === null ? (
        <View style={styles.centre}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.centre}>
          <Text style={styles.emptyTitle}>No rooms yet</Text>
          <Text style={styles.emptyText}>Paint your first wall.</Text>
          <GoldButton label="Start painting" onPress={() => router.push('/ar')} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {rooms.map((room) => {
            const color = getColor(room.colorId);
            const thumb = room.walls[0]?.afterPath;
            const count = room.walls.length;
            return (
              <Pressable
                key={room.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${color?.label ?? 'room'}`}
                onPress={() =>
                  router.push({ pathname: '/saved-room', params: { id: room.id } })
                }
                style={styles.card}
              >
                <View style={styles.thumbWrap}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
                  ) : null}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {color?.label ?? 'Your room'}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {room.finish}
                  </Text>
                  <Text style={styles.cardMetaFaint} numberOfLines={1}>
                    {count} wall{count === 1 ? '' : 's'} · {formatDate(room.createdAt)}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.cream,
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
  list: {
    gap: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.black,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.offBlack,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.cream,
  },
  cardMeta: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.creamFaint,
  },
  cardMetaFaint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.creamFaint,
  },
  chevron: {
    fontFamily: Fonts.body,
    fontSize: 24,
    color: Colors.creamFaint,
    paddingRight: Spacing.xs,
  },
});
