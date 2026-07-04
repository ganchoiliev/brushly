import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '@/components/gold-button';
import { PaintWaitStrip } from '@/components/paint-wait-strip';
import { TileShimmer } from '@/components/tile-shimmer';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { getColor, type VisualizerService } from '@/lib/palette';
import { isValidImageFile, newRoomId, saveRoom } from '@/lib/saved-rooms';
import { getSessionId, requestRender, uploadPhoto } from '@/lib/visualizer-api';

/* The room gallery: every captured wall is uploaded + rendered on the server
   in the chosen colour, streaming into a before/after grid. Each render is an
   independent, metered Gemini call (same contract as the single flow) — so we
   render a few at a time and stop early if the session hits its preview limit.
   Tapping a finished tile opens the full-screen before/after slider (/result). */

type TileStatus = 'pending' | 'uploading' | 'rendering' | 'done' | 'error' | 'limit';

interface Tile {
  id: string;
  localUri: string;
  status: TileStatus;
  renderId?: string;
  beforeUrl?: string;
  afterUrl?: string;
  calibration?: { paint: [number, number, number]; wallLum: number };
}

/* Render a few walls concurrently — enough to feel fast, few enough to stay
   gentle on the Gemini/Vercel headroom the single flow already relies on. */
const CONCURRENCY = 3;

function afterExt(url: string | undefined): 'jpg' | 'png' {
  const path = String(url ?? '').split('?')[0];
  return path.endsWith('.jpg') || path.endsWith('.jpeg') ? 'jpg' : 'png';
}

export default function RoomResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    shots?: string;
    colorId?: string;
    finish?: string;
    service?: string;
  }>();

  const colorId = params.colorId ?? '';
  const finish = params.finish ?? '';
  const service = (params.service as VisualizerService) || 'interior';
  const color = getColor(colorId);

  // Local JPEG uris captured on the AR screen — read once on mount.
  const shots = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(params.shots ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : [];
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture list is fixed for this screen
  }, []);

  const [tiles, setTiles] = useState<Tile[]>(() =>
    shots.map((uri, i) => ({ id: `tile-${i}`, localUri: uri, status: 'pending' })),
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Which server limit stopped the batch, if any — session (won't reset until
  // the app is reopened) vs daily/IP (resets tomorrow). Drives honest copy.
  const [limitKind, setLimitKind] = useState<'session' | 'ip' | null>(null);

  // localUri is fixed per tile (set once from the capture list), so a stable
  // id→uri map lets Retry re-render specific tiles without re-reading state.
  const localById = useMemo(() => {
    const m = new Map<string, string>();
    shots.forEach((uri, i) => m.set(`tile-${i}`, uri));
    return m;
  }, [shots]);

  // Renders take 10-20s each; if the user leaves mid-batch the resolving
  // promises must not setState on an unmounted screen.
  const alive = useRef(true);
  const started = useRef(false);
  // Guards against overlapping batches (the mount batch vs a Retry tap).
  const running = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // "My Rooms": once the batch settles, the finished walls are kept on the
  // device so the room survives past the server's ~24h signed-url TTL. One
  // stable id + timestamp per render session; persisted once, re-persisted only
  // if a Retry adds more finished walls.
  const roomIdRef = useRef<string | null>(null);
  const createdAtRef = useRef(0);
  const savingRef = useRef(false);
  const savedWallCount = useRef(0);
  // Set when a persist is asked for while one is already running; the in-flight
  // save re-runs itself once from fresh state, so a wall that finishes mid-save
  // is never dropped.
  const resaveRequested = useRef(false);
  // Latest committed tiles, mirrored so the async persist (and its coalesced
  // re-run) read the freshest set — a captured snapshot could miss a late wall.
  const tilesRef = useRef(tiles);
  const [savedState, setSavedState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function patchTile(id: string, patch: Partial<Tile>) {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  // Render a specific set of tiles — all of them on mount, or only the failed
  // ones on Retry. A 'done' tile is never in `ids`, so a successful render is
  // never re-spent. Concurrency-capped, and stops starting new renders once the
  // session/day budget is hit.
  async function renderTiles(ids: string[]) {
    const targets = ids.filter((id) => localById.has(id));
    if (running.current || !targets.length) return;
    running.current = true;
    setLimitKind(null);
    setTiles((prev) => prev.map((t) => (targets.includes(t.id) ? { ...t, status: 'pending' } : t)));

    const session = getSessionId();
    let limitHit = false;
    let cursor = 0;

    async function worker() {
      while (alive.current && !limitHit) {
        const id = targets[cursor++];
        if (id === undefined) return;
        const localUri = localById.get(id);
        if (!localUri) continue;
        try {
          patchTile(id, { status: 'uploading' });
          const sourcePath = await uploadPhoto(session, localUri);
          if (!alive.current) return;
          patchTile(id, { status: 'rendering' });
          const result = await requestRender({ sessionId: session, sourcePath, service, colorId, finish });
          if (!alive.current) return;
          patchTile(id, {
            status: 'done',
            renderId: result.renderId,
            beforeUrl: result.beforeUrl,
            afterUrl: result.afterUrl,
            calibration: result.calibration,
          });
        } catch (error) {
          if (!alive.current) return;
          const message = error instanceof Error ? error.message : '';
          if (message === 'limit_reached_session') {
            // Out of budget — stop starting new renders; in-flight ones finish.
            limitHit = true;
            setLimitKind('session');
            patchTile(id, { status: 'limit' });
          } else if (message === 'limit_reached_ip' || message === 'limit_reached') {
            limitHit = true;
            setLimitKind('ip');
            patchTile(id, { status: 'limit' });
          } else {
            patchTile(id, { status: 'error' });
          }
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));
    // Tiles that never started because the budget ran out — mark them limited.
    if (alive.current && limitHit) {
      setTiles((prev) =>
        prev.map((t) => (targets.includes(t.id) && t.status === 'pending' ? { ...t, status: 'limit' } : t)),
      );
    }
    running.current = false;
  }

  useEffect(() => {
    // Defer the initial batch out of the effect body so the setState inside
    // renderTiles isn't synchronous within this effect (react-compiler
    // set-state-in-effect) — same discipline as the settle effect below. The
    // started-ref guard lives inside the timer so a double-invoked mount still
    // starts the batch exactly once, and the cleanup cancels it if we unmount
    // before it fires.
    const timer = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      void renderTiles(shots.map((_, i) => `tile-${i}`));
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run the batch once on mount
  }, []);

  // Keep the finished walls in My Rooms. Async + ref-guarded, safe to call
  // repeatedly: it reads the freshest tiles (tilesRef), persists only walls not
  // already kept, and never setStates after unmount (the disk writes still
  // finish). If asked to run while a save is in flight it coalesces into a
  // single re-run rather than dropping the request — so a wall that finishes
  // mid-save is never lost.
  async function persistRoom() {
    if (Platform.OS === 'web') return;
    if (savingRef.current) {
      resaveRequested.current = true;
      return;
    }
    const ready = tilesRef.current.filter((t) => t.status === 'done' && t.afterUrl && t.renderId);
    if (ready.length <= savedWallCount.current) return;
    savingRef.current = true;
    setSavedState('saving');
    try {
      if (!roomIdRef.current) {
        roomIdRef.current = newRoomId();
        createdAtRef.current = Date.now();
      }
      const room = await saveRoom({
        id: roomIdRef.current,
        createdAt: createdAtRef.current,
        colorId,
        finish,
        service,
        walls: ready.map((t) => ({
          renderId: String(t.renderId),
          localBeforeUri: t.localUri,
          beforeUrl: t.beforeUrl,
          afterUrl: String(t.afterUrl),
          afterExt: afterExt(t.afterUrl),
          calibration: t.calibration,
        })),
      });
      savedWallCount.current = room.walls.length;
      if (alive.current) setSavedState('saved');
    } catch {
      // Once at least one wall is kept the room is genuinely saved and viewable,
      // so a failed incremental re-save must not erase the "kept" state.
      if (alive.current) setSavedState(savedWallCount.current > 0 ? 'saved' : 'error');
    } finally {
      savingRef.current = false;
      // Walls arrived while we were saving — persist again from fresh state.
      if (resaveRequested.current) {
        resaveRequested.current = false;
        void persistRoom();
      }
    }
  }

  // Mirror the latest committed tiles for persistRoom (and its re-run) to read.
  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);

  // Persist the moment the batch settles (>=1 wall done, none still running);
  // re-fires after a Retry that produces more done walls. Deferred into a timer
  // so the setState inside persistRoom isn't synchronous within this effect
  // (react-compiler set-state-in-effect); the cleanup cancels a pending persist
  // if the tiles change again first.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const stillGoing = tiles.some(
      (t) => t.status === 'pending' || t.status === 'uploading' || t.status === 'rendering',
    );
    if (stillGoing) return;
    const anyDone = tiles.some((t) => t.status === 'done' && t.afterUrl && t.renderId);
    if (!anyDone) return;
    const timer = setTimeout(() => {
      void persistRoom();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist on settle; ref-guarded
  }, [tiles]);

  function openTile(t: Tile) {
    if (t.status !== 'done' || !t.renderId) return;
    router.push({
      pathname: '/result',
      params: {
        renderId: t.renderId,
        beforeUrl: t.beforeUrl ?? '',
        afterUrl: t.afterUrl ?? '',
        colorId,
        finish,
        ...(t.calibration
          ? {
              calPaint: t.calibration.paint.join(','),
              calWallLum: String(t.calibration.wallLum),
            }
          : {}),
      },
    });
  }

  /* Save every finished render — download each to cache first, then hand the
     local file to the media library (same approach as /result). */
  async function handleSaveAll() {
    const done = tiles.filter((t) => t.status === 'done' && t.afterUrl);
    if (!done.length || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const MediaLibrary = await import('expo-media-library');
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        setNotice('Allow photo access in Settings to save your renders.');
        return;
      }
      const { Directory, File, Paths } = await import('expo-file-system');
      let saved = 0;
      for (const t of done) {
        try {
          const target = new File(
            new Directory(Paths.cache),
            `brushly-render-${t.renderId}.${afterExt(t.afterUrl)}`,
          );
          if (!target.exists) {
            await File.downloadFileAsync(String(t.afterUrl), target);
          }
          // Same guard as My Rooms: a signed url can answer 2xx with an error
          // body that downloads as if it were the render. Never hand a corrupt
          // file to the camera roll — verify (covers a stale reused cache file
          // too), and drop a bad one so a later attempt re-downloads it.
          if (!(await isValidImageFile(target))) {
            try {
              if (target.exists) target.delete();
            } catch {
              // best effort
            }
            continue;
          }
          await MediaLibrary.Asset.create(target.uri);
          saved += 1;
        } catch {
          // Skip a single failure; the aggregate count is reported below.
        }
      }
      if (!alive.current) return;
      setNotice(
        saved === done.length
          ? `Saved ${saved} to your photos.`
          : `Saved ${saved} of ${done.length}.`,
      );
    } catch {
      if (alive.current) setNotice('Could not save. Please try again.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  // Re-render only the walls that failed or hit the limit — never the ones
  // already done, so a retry can't re-spend on a wall that's already painted.
  function handleRetry() {
    const retryIds = tiles
      .filter((t) => t.status === 'error' || t.status === 'limit')
      .map((t) => t.id);
    void renderTiles(retryIds);
  }

  const total = tiles.length;
  const doneCount = tiles.filter((t) => t.status === 'done').length;
  const failedCount = tiles.filter((t) => t.status === 'error' || t.status === 'limit').length;
  const inProgress = tiles.some(
    (t) => t.status === 'pending' || t.status === 'uploading' || t.status === 'rendering',
  );
  const roomWord = total === 1 ? 'wall' : 'room';
  // Room-level progress: live while painting, a quiet tally once settled.
  const progressLine = inProgress
    ? `Painting your ${roomWord} · ${doneCount} of ${total} done`
    : `${doneCount} of ${total} done`;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{total === 1 ? 'Your wall' : 'Your room'}</Text>
        {color ? (
          <Text style={styles.subtitle}>
            {color.label} · {color.brand} · {finish}
          </Text>
        ) : null}
        <Text style={[styles.progressLine, inProgress && styles.progressLineActive]}>
          {progressLine}
        </Text>
      </View>

      {inProgress && <PaintWaitStrip color={color} finish={finish} />}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
        {tiles.map((t) => {
          const isDone = t.status === 'done';
          const showAfter = isDone && !!t.afterUrl;
          // Screen-reader label must track the visible state — a failed or
          // limited tile shouldn't announce "rendering".
          const a11yLabel = isDone
            ? 'Open before and after'
            : t.status === 'error'
              ? 'This wall couldn’t be rendered'
              : t.status === 'limit'
                ? 'Preview limit reached'
                : 'Painting your wall';
          return (
            <Pressable
              key={t.id}
              accessibilityRole={isDone ? 'button' : 'image'}
              accessibilityLabel={a11yLabel}
              accessibilityState={{ disabled: !isDone }}
              disabled={!isDone}
              onPress={() => openTile(t)}
              style={[styles.tile, total === 1 && styles.tileSingle]}
            >
              <Image
                source={{ uri: showAfter ? String(t.afterUrl) : t.localUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
              {t.status === 'error' ? (
                <View style={styles.tileScrim}>
                  <Text style={styles.tileStatusText}>Couldn’t render this one</Text>
                </View>
              ) : t.status === 'limit' ? (
                <View style={styles.tileScrim}>
                  <Text style={styles.tileStatusText}>Preview limit reached</Text>
                </View>
              ) : t.status !== 'done' ? (
                <TileShimmer status={t.status} />
              ) : null}
              {isDone && (
                <View style={styles.tileBadge}>
                  <Text style={styles.tileBadgeText}>After · tap to compare</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {notice && <Text style={styles.notice}>{notice}</Text>}
      {limitKind === 'session' && (
        <Text style={styles.limitNote}>
          You’ve hit the preview limit for this session. Reopen Brushly to start a
          fresh session, then render the rest.
        </Text>
      )}
      {limitKind === 'ip' && (
        <Text style={styles.limitNote}>
          You’ve reached today’s preview limit — try the rest again tomorrow.
        </Text>
      )}
      {savedState === 'saved' && (
        <Text style={styles.savedNote}>Kept in My Rooms — reopen it anytime.</Text>
      )}

      <View style={styles.actions}>
        {!inProgress && failedCount > 0 && (
          <GoldButton
            label={`Retry ${failedCount} wall${failedCount === 1 ? '' : 's'}`}
            onPress={handleRetry}
          />
        )}
        <GoldButton
          label={busy ? 'Saving…' : doneCount > 1 ? `Save all ${doneCount} to Photos` : 'Save to Photos'}
          onPress={handleSaveAll}
          variant={!inProgress && failedCount > 0 ? 'ghost' : 'solid'}
          disabled={busy || doneCount === 0}
        />
        {savedState === 'saved' && (
          <GoldButton
            label="View My Rooms"
            variant="ghost"
            onPress={() => router.push('/my-rooms')}
          />
        )}
        <GoldButton label="Back to camera" variant="ghost" onPress={() => router.back()} />
        <Text style={styles.footnote}>
          Kept on this device in My Rooms. The server copy is deleted after 30 days.
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
  progressLine: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.creamFaint,
  },
  progressLineActive: {
    color: Colors.goldLight,
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
  tileScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(21, 21, 21, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  tileStatusText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.cream,
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
  limitNote: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.creamFaint,
    textAlign: 'center',
    paddingTop: Spacing.xs,
  },
  savedNote: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.goldLight,
    textAlign: 'center',
    paddingTop: Spacing.xs,
  },
  actions: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  footnote: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.creamFaint,
    textAlign: 'center',
  },
});
