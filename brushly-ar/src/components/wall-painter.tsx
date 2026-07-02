import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ViroARSceneNavigator,
  isARSupportedOnDevice,
  requestRequiredPermissions,
} from '@reactvision/react-viro';

import { GoldButton } from '@/components/gold-button';
import { LooksRow } from '@/components/looks-row';
import { RenderProgress } from '@/components/render-progress';
import { ServiceFinishBar } from '@/components/service-finish-bar';
import { SwatchRow } from '@/components/swatch-row';
import WallScene, { type WallSceneProps } from '@/components/wall-scene';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { toUploadJpeg } from '@/lib/capture';
import { sheenForFinish } from '@/lib/materials';
import { FINISHES, getColor, type VisualizerService } from '@/lib/palette';
import { getSessionId, requestRender, uploadPhoto } from '@/lib/visualizer-api';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Phase = 'checking' | 'unsupported' | 'denied' | 'ready';
type PickerMode = 'colours' | 'looks';

/* Full-bleed AR wall painter: camera passthrough, vertical-plane detection,
   live colour quads, palette + service/finish/Looks controls.
   Native only — see wall-painter.web.tsx. */
export function WallPainter() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>('checking');
  const [service, setService] = useState<VisualizerService>('interior');
  const [finish, setFinish] = useState<string>(FINISHES.interior[0]);
  // Mid-dark default so the first overlay reads clearly (web parity —
  // Sage Green at 0.6 alpha over a white wall barely registers).
  const [colorId, setColorId] = useState('green-smoke');
  const [lookId, setLookId] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>('colours');
  const [trackingReady, setTrackingReady] = useState(false);
  const [wallCount, setWallCount] = useState(0);
  const [overlayHidden, setOverlayHidden] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const navigatorRef = useRef<ViroARSceneNavigator>(null);
  // In-flight guard must be a ref, not state — the shutter Pressable can
  // fire from a stale closure while a render is already running.
  const captureInFlight = useRef(false);
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
      onWallCountChanged: setWallCount,
      onTrackingReady: setTrackingReady,
    }),
    [colorId, finish, overlayHidden],
  );

  async function handleShutter() {
    if (captureInFlight.current) return;
    captureInFlight.current = true;
    setRenderError(null);
    setRendering(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Drop the tint quads for a beat so the API gets the unpainted wall —
      // Gemini must repaint the original, not our overlay. 500ms: the clean
      // frame must actually reach the GL swapchain before the screenshot on
      // slower devices; the RenderProgress overlay masks the pause anyway.
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
      const session = getSessionId();
      const sourcePath = await uploadPhoto(session, jpegUri);
      const result = await requestRender({
        sessionId: session,
        sourcePath,
        service,
        colorId,
        finish,
      });

      if (!alive.current) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/result',
        params: {
          renderId: result.renderId,
          beforeUrl: result.beforeUrl,
          afterUrl: result.afterUrl,
          colorId,
          finish,
        },
      });
    } catch (error) {
      if (!alive.current) return;
      const message = error instanceof Error ? error.message : '';
      setRenderError(
        message === 'limit_reached_session'
          ? 'That’s the preview limit for this session — try again in a little while.'
          : message === 'limit_reached' || message === 'limit_reached_ip'
            ? 'You’ve reached today’s preview limit — try again tomorrow.'
            : message || 'Something went wrong. Please try again.',
      );
    } finally {
      captureInFlight.current = false;
      if (alive.current) {
        setOverlayHidden(false);
        setRendering(false);
      }
    }
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
        {renderError && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
            onPress={() => setRenderError(null)}
            style={styles.errorPill}
          >
            <Text style={styles.errorText}>{renderError}</Text>
          </Pressable>
        )}

        <View style={styles.shutterRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture and render this wall"
            disabled={rendering}
            onPress={handleShutter}
            style={({ pressed }) => [
              styles.shutter,
              pressed && styles.shutterPressed,
              rendering && styles.shutterDisabled,
            ]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
        </View>

        <ServiceFinishBar
          service={service}
          finish={finish}
          onServiceChange={(next) => {
            setService(next);
            setFinish(FINISHES[next][0]);
            setLookId(null);
          }}
          onFinishChange={(next) => {
            setFinish(next);
            setLookId(null);
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
            }}
          />
        )}
      </View>

      {rendering && (
        <RenderProgress colorLabel={getColor(colorId)?.label ?? 'Your colour'} />
      )}
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
    // Above the RenderProgress overlay (zIndex 20) — closing mid-render is
    // the only cancel affordance, especially on iOS with no hardware back.
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
