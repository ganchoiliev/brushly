import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ViroARSceneNavigator,
  isARSupportedOnDevice,
  requestRequiredPermissions,
} from '@reactvision/react-viro';

import { GoldButton } from '@/components/gold-button';
import { LooksRow } from '@/components/looks-row';
import { ServiceFinishBar } from '@/components/service-finish-bar';
import { SwatchRow } from '@/components/swatch-row';
import WallScene, { type WallSceneProps } from '@/components/wall-scene';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { toUploadJpeg } from '@/lib/capture';
import { sheenForFinish } from '@/lib/materials';
import { FINISHES, type VisualizerService } from '@/lib/palette';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* Each app session can render a bounded number of walls server-side
   (8/session), so cap a room at 6 — a full room renders in a single pass with a
   little slack. A second pass (e.g. re-rendering the room in another colour) can
   run into the per-session limit; the gallery surfaces that honestly rather than
   pretending there's budget for it. */
const MAX_SHOTS = 6;

type Phase = 'checking' | 'unsupported' | 'denied' | 'ready';
type PickerMode = 'colours' | 'looks';

/* Full-bleed AR wall painter: camera passthrough, vertical-plane detection,
   live colour quads, palette + service/finish/Looks controls.
   Native only — see wall-painter.web.tsx. */
export function WallPainter() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Set when re-entering AR from the result screen ("See it live on your wall"):
  // the render's ACHIEVED albedo drives the shader so the live wall matches the
  // photoreal render. Read once on mount.
  const params = useLocalSearchParams<{
    calPaint?: string;
    calWallLum?: string;
    calColorId?: string;
    calFinish?: string;
  }>();
  const initialCal = useMemo(() => {
    const colorId = params.calColorId || undefined;
    const finish = params.calFinish || undefined;
    // calPaint (the render's ACHIEVED albedo) is optional — it only exists once the
    // server calibration step is deployed. When absent, we still seed the chosen
    // colour/finish and let AR paint the raw swatch (no override).
    let paint: [number, number, number] | null = null;
    if (params.calPaint) {
      const parsed = params.calPaint.split(',').map(Number);
      if (parsed.length === 3 && !parsed.some((n) => Number.isNaN(n))) {
        paint = parsed as [number, number, number];
      }
    }
    if (!colorId && !finish && !paint) return null;
    return {
      paint,
      wallLum: Number(params.calWallLum) || 0.3,
      colorId,
      finish,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [phase, setPhase] = useState<Phase>('checking');
  const [service, setService] = useState<VisualizerService>('interior');
  const [finish, setFinish] = useState<string>(initialCal?.finish ?? FINISHES.interior[0]);
  // Mid-dark default so the first overlay reads clearly (web parity —
  // Sage Green at 0.6 alpha over a white wall barely registers).
  const [colorId, setColorId] = useState(initialCal?.colorId ?? 'green-smoke');
  // The render's achieved look, applied until the user picks a new colour/finish.
  // Only set when calibration actually rode along (initialCal.paint non-null).
  const [override, setOverride] = useState<{ paint: [number, number, number]; wallLum: number } | null>(
    initialCal?.paint ? { paint: initialCal.paint, wallLum: initialCal.wallLum } : null,
  );
  const [lookId, setLookId] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>('colours');
  const [trackingReady, setTrackingReady] = useState(false);
  const [wallCount, setWallCount] = useState(0);
  const [overlayHidden, setOverlayHidden] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  // Captured walls waiting to be rendered together as one room (JPEG file uris).
  const [shots, setShots] = useState<{ id: string; uri: string }[]>([]);

  const navigatorRef = useRef<ViroARSceneNavigator>(null);
  // In-flight guard must be a ref, not state — the shutter Pressable can
  // fire from a stale closure while a capture is already running.
  const captureInFlight = useRef(false);
  // Monotonic id for captured shots — stable keys through add/remove.
  const shotSeq = useRef(0);
  // The render takes 10-20s; if the user backs out (hardware back / close),
  // the finished promise must not setState or yank them onto /result.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // On Android, isARSupportedOnDevice REJECTS with Error('UNSUPPORTED' |
    // 'UNKNOWN' | 'TRANSIENT') instead of resolving { isARSupported: false }
    // (react-viro 2.57 ViroUtils.js) — so support has to be derived from the
    // rejection message, with one retry for the transient states.
    async function checkSupport(): Promise<boolean> {
      try {
        const support = await isARSupportedOnDevice();
        return support.isARSupported;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === 'UNSUPPORTED') return false;
        if (message === 'TRANSIENT' || message === 'UNKNOWN') {
          await delay(1500);
          try {
            return (await isARSupportedOnDevice()).isARSupported;
          } catch (retryError) {
            const retryMessage =
              retryError instanceof Error ? retryError.message : String(retryError);
            return retryMessage !== 'UNSUPPORTED';
          }
        }
        // Unrecognised pre-check failure: don't brick the screen — let the
        // AR session itself surface the problem.
        return true;
      }
    }
    (async () => {
      const supported = await checkSupport();
      if (cancelled) return;
      if (!supported) {
        setPhase('unsupported');
        return;
      }
      try {
        const granted = await requestRequiredPermissions(['camera']);
        if (cancelled) return;
        setPhase(granted.camera === false ? 'denied' : 'ready');
      } catch {
        if (!cancelled) setPhase('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const viroAppProps: WallSceneProps = useMemo(
    () => ({
      selectedColorId: colorId,
      sheen: sheenForFinish(finish),
      overlayHidden,
      paintOverride: override?.paint,
      wallLumOverride: override?.wallLum,
      onWallCountChanged: setWallCount,
      onTrackingReady: setTrackingReady,
    }),
    [colorId, finish, overlayHidden, override],
  );

  // Capture one wall into the filmstrip. Rendering happens later, once, for the
  // whole room (see /room-result) — so this only grabs a clean frame.
  async function handleCapture() {
    if (captureInFlight.current || shots.length >= MAX_SHOTS) return;
    captureInFlight.current = true;
    setCaptureError(null);
    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Drop the tint quads for a beat so the render gets the UNPAINTED wall —
      // Gemini repaints the original, not our overlay. 500ms: the clean frame
      // must actually reach the GL swapchain before the screenshot on slower
      // devices.
      setOverlayHidden(true);
      await delay(500);
      const shot = await navigatorRef.current?.arSceneNavigator.takeScreenshot(
        `brushly-${Date.now()}`,
        false,
      );
      setOverlayHidden(false);
      if (!shot?.success || !shot.url) {
        throw new Error('Could not capture the photo. Please try again.');
      }
      const localUri = String(shot.url).startsWith('file://')
        ? String(shot.url)
        : `file://${shot.url}`;
      const jpegUri = await toUploadJpeg(localUri);
      if (!alive.current) return;
      shotSeq.current += 1;
      setShots((prev) => [...prev, { id: `shot-${shotSeq.current}`, uri: jpegUri }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setOverlayHidden(false);
      if (!alive.current) return;
      const message = error instanceof Error ? error.message : '';
      setCaptureError(message || 'Something went wrong. Please try again.');
    } finally {
      captureInFlight.current = false;
      if (alive.current) setCapturing(false);
    }
  }

  // Hand the captured walls (+ the chosen colour) to the gallery, which uploads
  // and renders each on the server and shows a before/after grid.
  function handleRenderRoom() {
    if (!shots.length) return;
    router.push({
      pathname: '/room-result',
      params: {
        shots: JSON.stringify(shots.map((s) => s.uri)),
        colorId,
        finish,
        service,
      },
    });
  }

  function removeShot(id: string) {
    setShots((prev) => prev.filter((s) => s.id !== id));
  }

  if (phase === 'checking') {
    return (
      <View style={styles.messageScreen}>
        <Text style={styles.messageText}>Preparing your camera…</Text>
      </View>
    );
  }

  if (phase === 'unsupported' || phase === 'denied') {
    return (
      <View style={styles.messageScreen}>
        <Text style={styles.messageTitle}>
          {phase === 'unsupported'
            ? 'AR isn’t supported here'
            : 'Camera access needed'}
        </Text>
        <Text style={styles.messageText}>
          {phase === 'unsupported'
            ? 'This device doesn’t support augmented reality. You can still get a photoreal preview at brushly.uk/visualizer.'
            : 'Allow camera access in Settings to paint your walls in AR.'}
        </Text>
        <GoldButton label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const hint = !trackingReady
    ? 'Move your phone slowly'
    : wallCount === 0
      ? 'Point at the wall you want to paint'
      : null;

  return (
    <View style={styles.screen}>
      <ViroARSceneNavigator
        ref={navigatorRef}
        autofocus
        initialScene={{ scene: WallScene }}
        viroAppProps={viroAppProps}
        // Occlusion (hide paint behind furniture) TEMPORARILY DISABLED for the
        // stable-baseline build — "depthBased" is unverified on this device and a
        // candidate crash cause. Re-enable (gated via
        // arSceneNavigator.isDepthOcclusionSupported()) once the base app is
        // confirmed working on-device.
        occlusionMode="disabled"
        style={StyleSheet.absoluteFill}
      />

      {/* Overlay UI */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close AR"
        onPress={() => router.back()}
        style={[styles.close, { top: insets.top + Spacing.sm }]}
        hitSlop={12}
      >
        <Text style={styles.closeGlyph}>✕</Text>
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.md }]}>
        {hint && (
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>{hint}</Text>
          </View>
        )}
        {captureError && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
            onPress={() => setCaptureError(null)}
            style={styles.errorPill}
          >
            <Text style={styles.errorText}>{captureError}</Text>
          </Pressable>
        )}

        {shots.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filmstripContent}
            style={styles.filmstrip}
          >
            {shots.map((shot, i) => (
              <View key={shot.id} style={styles.thumbWrap}>
                <Image source={{ uri: shot.uri }} style={styles.thumb} contentFit="cover" />
                <Text style={styles.thumbIndex}>{i + 1}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${i + 1}`}
                  onPress={() => removeShot(shot.id)}
                  style={styles.thumbRemove}
                  hitSlop={8}
                >
                  <Text style={styles.thumbRemoveGlyph}>✕</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.shutterRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shots.length > 0 ? 'Capture another wall' : 'Capture this wall'}
            disabled={capturing || shots.length >= MAX_SHOTS}
            onPress={handleCapture}
            style={({ pressed }) => [
              styles.shutter,
              pressed && styles.shutterPressed,
              (capturing || shots.length >= MAX_SHOTS) && styles.shutterDisabled,
            ]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
        </View>

        {shots.length >= MAX_SHOTS && (
          <Text style={styles.capacityNote}>Room full — up to {MAX_SHOTS} photos.</Text>
        )}

        {shots.length > 0 && (
          <GoldButton label={`Render room (${shots.length})`} onPress={handleRenderRoom} />
        )}

        <ServiceFinishBar
          service={service}
          finish={finish}
          onServiceChange={(next) => {
            setService(next);
            setFinish(FINISHES[next][0]);
            setLookId(null);
            setOverride(null);
          }}
          onFinishChange={(next) => {
            setFinish(next);
            setLookId(null);
            setOverride(null);
          }}
        />

        <View style={styles.modeRow}>
          {(['colours', 'looks'] as PickerMode[]).map((mode) => {
            const active = pickerMode === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setPickerMode(mode)}
                style={[styles.modeTab, active && styles.modeTabActive]}
              >
                <Text style={[styles.modeText, active && styles.modeTextActive]}>
                  {mode === 'colours' ? 'Colours' : 'Looks'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {pickerMode === 'colours' ? (
          <SwatchRow
            selectedId={colorId}
            onSelect={(color) => {
              setColorId(color.id);
              setLookId(null);
              setOverride(null);
            }}
          />
        ) : (
          <LooksRow
            selectedLookId={lookId}
            onSelect={(look) => {
              // Looks are curated interior schemes — colour + finish together.
              setService('interior');
              setColorId(look.colorId);
              setFinish(look.finish);
              setLookId(look.id);
              setOverride(null);
            }}
          />
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  messageScreen: {
    flex: 1,
    backgroundColor: Colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  messageTitle: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.cream,
    textAlign: 'center',
  },
  messageText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.creamFaint,
    textAlign: 'center',
    maxWidth: 300,
  },
  close: {
    position: 'absolute',
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    // Sits above the bottom control scrim so Close stays tappable.
    zIndex: 30,
  },
  closeGlyph: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.cream,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.scrim,
  },
  hintPill: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  hintText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.cream,
  },
  errorPill: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(176, 106, 80, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(176, 106, 80, 0.6)',
    maxWidth: 320,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.cream,
    textAlign: 'center',
  },
  shutterRow: {
    alignItems: 'center',
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    borderWidth: 3,
    borderColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: Radius.pill,
    backgroundColor: Colors.gold,
  },
  filmstrip: {
    alignSelf: 'stretch',
    flexGrow: 0,
  },
  filmstripContent: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.black,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbIndex: {
    position: 'absolute',
    left: 4,
    bottom: 2,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.cream,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowRadius: 3,
  },
  thumbRemove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.scrim,
    borderBottomLeftRadius: Radius.sm,
  },
  thumbRemoveGlyph: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.cream,
  },
  capacityNote: {
    alignSelf: 'center',
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.creamFaint,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  modeTab: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  modeTabActive: {
    borderBottomColor: Colors.gold,
  },
  modeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.5,
    color: Colors.creamFaint,
  },
  modeTextActive: {
    color: Colors.cream,
  },
});
