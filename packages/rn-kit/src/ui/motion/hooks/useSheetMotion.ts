import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { MotionAnimatedViewStyle, MotionSharedValue, SheetPlacement } from '../types';
import { motionDurations } from '../tokens';
import { resolveDuration } from '../utils';
import { useReducedMotion } from './useReducedMotion';

export interface UseSheetMotionOptions {
  visible: boolean;
  placement?: SheetPlacement;
  duration?: number;
  openDuration?: number;
  closeDuration?: number;
  distance?: number;
  overlayOpacity?: number;
  closeOnSwipe?: boolean;
  swipeThreshold?: number;
  velocityThreshold?: number;
  reduceMotion?: boolean;
  onRequestClose?: () => void;
  onOpened?: () => void;
  onClosed?: () => void;
}

export interface UseSheetMotionReturn {
  mounted: boolean;
  progress: MotionSharedValue<number>;
  overlayStyle: MotionAnimatedViewStyle;
  sheetStyle: MotionAnimatedViewStyle;
  gesture: ReturnType<typeof Gesture.Pan>;
  panHandlers?: {
    onPanResponderGrant?: () => void;
    onPanResponderMove?: (_event: unknown, gestureState: any) => void;
    onPanResponderRelease?: (_event: unknown, gestureState: any) => void;
    onPanResponderTerminate?: () => void;
  };
  open: () => void;
  close: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function useSheetMotion({
  visible,
  placement = 'bottom',
  duration,
  openDuration: openDurationOverride,
  closeDuration: closeDurationOverride,
  distance = 240,
  overlayOpacity = 0.45,
  closeOnSwipe = true,
  swipeThreshold = 72,
  velocityThreshold = 1,
  reduceMotion: reduceMotionOverride,
  onRequestClose,
  onOpened,
  onClosed,
}: UseSheetMotionOptions): UseSheetMotionReturn {
  const { reduceMotion: systemReduceMotion, durationScale } = useReducedMotion();
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const sheetTranslate = useSharedValue(visible ? 0 : distance);

  const openDuration = resolveDuration(
    openDurationOverride ?? duration,
    motionDurations.medium,
    reduceMotion,
    durationScale
  );
  const closeDuration = resolveDuration(
    closeDurationOverride ?? duration,
    motionDurations.normal,
    reduceMotion,
    durationScale
  );

  const syncDragProgress = useCallback(
    (translate: number) => {
      const safeDistance = Math.max(distance, 1);
      const nextProgress = reduceMotion ? (translate === 0 ? 1 : 0) : 1 - translate / safeDistance;
      progress.value = clamp(nextProgress, 0, 1);
      sheetTranslate.value = translate;
    },
    [distance, progress, reduceMotion, sheetTranslate]
  );

  const animateOpen = useCallback(() => {
    setMounted(true);

    if (reduceMotion) {
      progress.value = 1;
      sheetTranslate.value = 0;
      onOpened?.();
      return;
    }

    progress.value = 0;
    sheetTranslate.value = distance;
    progress.value = withTiming(1, { duration: openDuration });
    sheetTranslate.value = withTiming(0, { duration: openDuration }, finished => {
      if (finished && onOpened) {
        runOnJS(onOpened)();
      }
    });
  }, [distance, onOpened, openDuration, progress, reduceMotion, sheetTranslate]);

  const animateClose = useCallback(() => {
    if (reduceMotion) {
      progress.value = 0;
      sheetTranslate.value = distance;
      setMounted(false);
      onClosed?.();
      return;
    }

    progress.value = withTiming(0, { duration: closeDuration });
    sheetTranslate.value = withTiming(distance, { duration: closeDuration }, finished => {
      if (!finished) return;
      runOnJS(setMounted)(false);
      if (onClosed) {
        runOnJS(onClosed)();
      }
    });
  }, [closeDuration, distance, onClosed, progress, reduceMotion, sheetTranslate]);

  useEffect(() => {
    if (visible) {
      animateOpen();
      return;
    }

    if (!mounted) return;
    animateClose();
  }, [animateClose, animateOpen, mounted, visible]);

  const animateBackToOpen = useCallback(() => {
    if (reduceMotion) {
      syncDragProgress(0);
      return;
    }

    progress.value = withTiming(1, { duration: openDuration });
    sheetTranslate.value = withTiming(0, { duration: openDuration });
  }, [openDuration, progress, reduceMotion, sheetTranslate, syncDragProgress]);

  const handleGestureUpdate = useCallback(
    (translationX: number, translationY: number) => {
      if (!visible || !closeOnSwipe) return;

      if (placement === 'bottom') {
        syncDragProgress(clamp(translationY, 0, distance));
        return;
      }

      if (placement === 'left') {
        syncDragProgress(clamp(-translationX, 0, distance));
        return;
      }

      syncDragProgress(clamp(translationX, 0, distance));
    },
    [closeOnSwipe, distance, placement, syncDragProgress, visible]
  );

  const handleGestureRelease = useCallback(
    (translationX: number, translationY: number, velocityX: number, velocityY: number) => {
      if (!visible || !closeOnSwipe) return;

      const shouldClose =
        placement === 'bottom'
          ? translationY >= swipeThreshold || velocityY >= velocityThreshold
          : Math.abs(translationX) >= swipeThreshold || Math.abs(velocityX) >= velocityThreshold;

      if (shouldClose) {
        onRequestClose?.();
        return;
      }

      animateBackToOpen();
    },
    [
      animateBackToOpen,
      closeOnSwipe,
      onRequestClose,
      placement,
      swipeThreshold,
      velocityThreshold,
      visible,
    ]
  );

  const gesture = useMemo(() => {
    // .runOnJS(true)：tsup/esbuild 打包会剥掉函数体内的 'worklet' 指令（下方回调里
    // 写了也不会生效），回调实际跑在 JS 线程。显式声明既消除 RNGH 的 DEV 警告
    // （PageDrawer / BottomSheetModal 每次挂载各一条），也把运行线程固定下来，
    // 避免未来构建链路变化导致线程漂移。
    const pan = Gesture.Pan()
      .enabled(visible && closeOnSwipe)
      .runOnJS(true);

    if (placement === 'bottom') {
      pan.activeOffsetY([6, Number.MAX_SAFE_INTEGER]);
    } else if (placement === 'left') {
      pan.activeOffsetX([Number.MIN_SAFE_INTEGER, -6]);
    } else {
      pan.activeOffsetX([6, Number.MAX_SAFE_INTEGER]);
    }

    pan
      .onUpdate(event => {
        'worklet';

        if (!visible || !closeOnSwipe) return;

        if (placement === 'bottom') {
          const nextTranslate = Math.max(0, Math.min(distance, event.translationY));
          const safeDistance = Math.max(distance, 1);
          const nextProgress = reduceMotion
            ? nextTranslate === 0
              ? 1
              : 0
            : 1 - nextTranslate / safeDistance;
          progress.value = clamp(nextProgress, 0, 1);
          sheetTranslate.value = nextTranslate;
          return;
        }

        if (placement === 'left') {
          const nextTranslate = Math.max(0, Math.min(distance, -event.translationX));
          const safeDistance = Math.max(distance, 1);
          const nextProgress = reduceMotion
            ? nextTranslate === 0
              ? 1
              : 0
            : 1 - nextTranslate / safeDistance;
          progress.value = clamp(nextProgress, 0, 1);
          sheetTranslate.value = nextTranslate;
          return;
        }

        const nextTranslate = Math.max(0, Math.min(distance, event.translationX));
        const safeDistance = Math.max(distance, 1);
        const nextProgress = reduceMotion
          ? nextTranslate === 0
            ? 1
            : 0
          : 1 - nextTranslate / safeDistance;
        progress.value = clamp(nextProgress, 0, 1);
        sheetTranslate.value = nextTranslate;
      })
      .onEnd(event => {
        'worklet';

        if (!visible || !closeOnSwipe) return;

        const shouldClose =
          placement === 'bottom'
            ? event.translationY >= swipeThreshold || event.velocityY >= velocityThreshold
            : Math.abs(event.translationX) >= swipeThreshold ||
              Math.abs(event.velocityX) >= velocityThreshold;

        if (shouldClose) {
          if (onRequestClose) {
            runOnJS(onRequestClose)();
          }
          return;
        }

        if (reduceMotion) {
          progress.value = 1;
          sheetTranslate.value = 0;
          return;
        }

        progress.value = withTiming(1, { duration: openDuration });
        sheetTranslate.value = withTiming(0, { duration: openDuration });
      })
      .onFinalize(() => {
        'worklet';

        if (!visible || !closeOnSwipe) return;
      });

    return pan;
  }, [
    closeOnSwipe,
    distance,
    onRequestClose,
    openDuration,
    placement,
    progress,
    reduceMotion,
    sheetTranslate,
    swipeThreshold,
    velocityThreshold,
    visible,
  ]);

  const panHandlers = useMemo(
    () =>
      closeOnSwipe
        ? {
            onPanResponderGrant: () => {},
            onPanResponderMove: (_event: unknown, gestureState: any) => {
              handleGestureUpdate(gestureState.dx ?? 0, gestureState.dy ?? 0);
            },
            onPanResponderRelease: (_event: unknown, gestureState: any) => {
              handleGestureRelease(
                gestureState.dx ?? 0,
                gestureState.dy ?? 0,
                gestureState.vx ?? 0,
                gestureState.vy ?? 0
              );
            },
            onPanResponderTerminate: () => {
              animateBackToOpen();
            },
          }
        : undefined,
    [animateBackToOpen, closeOnSwipe, handleGestureRelease, handleGestureUpdate]
  );

  const sheetStyle = useAnimatedStyle(() => {
    if (placement === 'left') {
      return {
        transform: [
          {
            translateX: interpolate(sheetTranslate.value, [0, distance], [0, -distance]),
          },
        ],
      };
    }

    if (placement === 'right') {
      return {
        transform: [
          {
            translateX: sheetTranslate.value,
          },
        ],
      };
    }

    return {
      transform: [
        {
          translateY: sheetTranslate.value,
        },
      ],
    };
  }, [distance, placement]) satisfies MotionAnimatedViewStyle;

  const overlayStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(progress.value, [0, 1], [0, overlayOpacity]),
    }),
    [overlayOpacity]
  ) satisfies MotionAnimatedViewStyle;

  return {
    mounted,
    progress,
    overlayStyle,
    sheetStyle,
    gesture,
    panHandlers,
    open: animateOpen,
    close: animateClose,
  };
}
