import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppView, type AppViewProps } from '@/ui/primitives';
import { createReanimatedView } from './ReanimatedView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { motionDurations } from '../tokens';
import type { MotionAnimatedViewStyle, MotionSpringPreset } from '../types';
import { resolveDuration, resolveSpringConfig } from '../utils';

export interface CollapseViewProps extends Omit<AppViewProps, 'testID' | 'onLayout'> {
  visible: boolean;
  testID?: string;
  contentTestID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  motionDuration?: number;
  motionSpringPreset?: MotionSpringPreset;
  motionReduceMotion?: boolean;
  collapsedHeight?: number;
  unmountOnExit?: boolean;
  onExpandEnd?: () => void;
  onCollapseEnd?: () => void;
}

export function CollapseView({
  visible,
  testID,
  contentTestID,
  onLayout,
  motionDuration,
  motionSpringPreset,
  motionReduceMotion,
  collapsedHeight = 0,
  unmountOnExit = false,
  onExpandEnd,
  onCollapseEnd,
  children,
  ...rest
}: CollapseViewProps) {
  const { reduceMotion: systemReduceMotion, durationScale } = useReducedMotion();
  const reduceMotion = motionReduceMotion ?? systemReduceMotion;
  const resolvedDuration = resolveDuration(
    motionDuration,
    motionDurations.medium,
    reduceMotion,
    durationScale
  );
  const springConfig =
    motionSpringPreset && !reduceMotion ? resolveSpringConfig(motionSpringPreset) : undefined;
  const [mounted, setMounted] = useState(visible || !unmountOnExit);
  const [measuredHeight, setMeasuredHeight] = useState(collapsedHeight);
  const animatedHeight = useSharedValue(visible ? measuredHeight : collapsedHeight);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;

    const expandedHeight = Math.max(measuredHeight, collapsedHeight);

    if (visible && expandedHeight <= collapsedHeight && !reduceMotion) {
      return;
    }

    const nextHeight = visible ? expandedHeight : collapsedHeight;

    if (animatedHeight.value === nextHeight) {
      return;
    }

    if (reduceMotion) {
      animatedHeight.value = nextHeight;

      if (visible) {
        onExpandEnd?.();
      } else {
        if (unmountOnExit) {
          setMounted(false);
        }
        onCollapseEnd?.();
      }
      return;
    }

    const handleAnimationFinished = (finished?: boolean) => {
      if (!finished) return;

      if (visible) {
        if (onExpandEnd) {
          runOnJS(onExpandEnd)();
        }
        return;
      }

      if (unmountOnExit) {
        runOnJS(setMounted)(false);
      }

      if (onCollapseEnd) {
        runOnJS(onCollapseEnd)();
      }
    };

    if (springConfig) {
      animatedHeight.value = withSpring(nextHeight, springConfig, handleAnimationFinished);
      return;
    }

    animatedHeight.value = withTiming(
      nextHeight,
      { duration: resolvedDuration },
      handleAnimationFinished
    );
  }, [
    animatedHeight,
    collapsedHeight,
    measuredHeight,
    mounted,
    onCollapseEnd,
    onExpandEnd,
    reduceMotion,
    resolvedDuration,
    springConfig,
    unmountOnExit,
    visible,
  ]);

  const handleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onLayout?.(event);

      const nextHeight = Math.max(collapsedHeight, event.nativeEvent.layout.height);
      setMeasuredHeight(previousHeight =>
        previousHeight === nextHeight ? previousHeight : nextHeight
      );
    },
    [collapsedHeight, onLayout]
  );

  const animatedStyle = useAnimatedStyle(
    () => ({
      height: animatedHeight.value,
    }),
    []
  ) satisfies MotionAnimatedViewStyle;

  if (!mounted) return null;

  return createReanimatedView(
    { testID, style: [styles.container, animatedStyle] },
    <AppView {...rest} testID={contentTestID} onLayout={handleContentLayout}>
      {children}
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
