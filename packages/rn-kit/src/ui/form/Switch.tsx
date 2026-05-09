import { useEffect, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppPressable, AppView } from '@/ui/primitives';
import { useThemeColors } from '@/theme';
import { cn } from '@/utils';
import { motionDurations } from '../motion/tokens';
import type { ToggleMotionProps } from '../motion';
import { useToggleMotion } from '../motion/hooks/useToggleMotion';
import { useReducedMotion } from '../motion/hooks/useReducedMotion';
import { resolveDuration } from '../motion/utils';
import { type CommonLayoutProps, resolveRoundedStyle } from '../utils/layout-shortcuts';

export interface SwitchProps
  extends
    Pick<CommonLayoutProps, 'flex' | 'm' | 'mx' | 'my' | 'mt' | 'mb' | 'ml' | 'mr' | 'rounded'>,
    ToggleMotionProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

interface SwitchThumbProps extends Pick<
  ToggleMotionProps,
  'motionDuration' | 'motionSpringPreset'
> {
  checked: boolean;
  config: { width: number; height: number; thumb: number; padding: number };
  thumbBackgroundColor: string;
}

function getSwitchThumbStyle(
  config: SwitchThumbProps['config'],
  thumbBackgroundColor: string
): ViewStyle {
  return {
    width: config.thumb,
    height: config.thumb,
    borderRadius: config.thumb / 2,
    backgroundColor: thumbBackgroundColor,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
  };
}

function PlainSwitchThumb({ checked, config, thumbBackgroundColor }: SwitchThumbProps) {
  const maxTranslateX = Math.max(0, config.width - config.thumb - config.padding * 2);

  return (
    <AppView
      style={[
        styles.thumb,
        getSwitchThumbStyle(config, thumbBackgroundColor),
        { transform: [{ translateX: checked ? maxTranslateX : 0 }] },
      ]}
    />
  );
}

function MotionSwitchThumb({
  checked,
  config,
  motionDuration,
  motionSpringPreset,
  thumbBackgroundColor,
}: SwitchThumbProps) {
  const toggleMotion = useToggleMotion({
    value: checked,
    preset: 'switch',
    duration: motionDuration,
    spring: motionSpringPreset,
    trackWidth: config.width,
    thumbSize: config.thumb,
    trackPadding: config.padding,
  });

  return (
    <Animated.View
      style={[
        styles.thumb,
        getSwitchThumbStyle(config, thumbBackgroundColor),
        toggleMotion.thumbStyle,
      ]}
    />
  );
}

export function Switch({
  flex,
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  rounded,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  size = 'md',
  className,
  testID,
  style,
  animated = true,
  motionDuration,
  motionSpringPreset,
  motionReduceMotion,
}: SwitchProps) {
  const colors = useThemeColors();
  const { reduceMotion: systemReduceMotion, durationScale } = useReducedMotion();
  const [internalChecked, setInternalChecked] = useState(defaultChecked || false);
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = motionReduceMotion ?? systemReduceMotion;
  const shouldAnimateToggle = animated && motionReduceMotion !== true;
  const interactionLockDuration = resolveDuration(
    motionDuration,
    motionSpringPreset ? motionDurations.medium : motionDurations.normal,
    !shouldAnimateToggle || reduceMotion,
    durationScale
  );

  const isChecked = checked !== undefined ? checked : internalChecked;

  const sizes = {
    sm: { width: 36, height: 20, thumb: 16, padding: 2 },
    md: { width: 48, height: 26, thumb: 22, padding: 2 },
    lg: { width: 60, height: 32, thumb: 28, padding: 2 },
  };

  const config = sizes[size];

  const clearUnlockTimer = () => {
    if (!unlockTimerRef.current) return;
    clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = null;
  };

  const scheduleUnlock = () => {
    clearUnlockTimer();
    if (interactionLockDuration <= 0) {
      setIsInteractionLocked(false);
      return;
    }
    unlockTimerRef.current = setTimeout(() => {
      unlockTimerRef.current = null;
      setIsInteractionLocked(false);
    }, interactionLockDuration);
  };

  useEffect(() => {
    return () => {
      clearUnlockTimer();
    };
  }, []);

  const toggle = () => {
    if (disabled || isInteractionLocked) return;

    const newChecked = !isChecked;

    if (interactionLockDuration > 0) {
      setIsInteractionLocked(true);
      scheduleUnlock();
    }

    if (checked === undefined) {
      setInternalChecked(newChecked);
    }

    onChange?.(newChecked);
  };

  const trackBackgroundColor = disabled
    ? isChecked
      ? colors.primarySurface
      : colors.divider
    : isChecked
      ? colors.primary
      : colors.divider;

  const trackBorderColor = disabled
    ? isChecked
      ? colors.primarySurface
      : colors.border
    : isChecked
      ? colors.primary
      : colors.border;

  const thumbBackgroundColor = disabled ? colors.card : colors.textInverse;

  return (
    <AppPressable
      flex={flex}
      m={m}
      mx={mx}
      my={my}
      mt={mt}
      mb={mb}
      ml={ml}
      mr={mr}
      onPress={toggle}
      disabled={disabled || isInteractionLocked}
      className={cn(className)}
      testID={testID}
    >
      <AppView
        className={cn(rounded === undefined && 'rounded-full')}
        style={[
          styles.track,
          resolveRoundedStyle(rounded ?? 'full'),
          {
            width: config.width,
            height: config.height,
            backgroundColor: trackBackgroundColor,
            borderColor: trackBorderColor,
          },
          style,
        ]}
      >
        {shouldAnimateToggle ? (
          <MotionSwitchThumb
            checked={isChecked}
            config={config}
            motionDuration={motionDuration}
            motionSpringPreset={motionSpringPreset}
            thumbBackgroundColor={thumbBackgroundColor}
          />
        ) : (
          <PlainSwitchThumb
            checked={isChecked}
            config={config}
            thumbBackgroundColor={thumbBackgroundColor}
          />
        )}
      </AppView>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  track: {
    justifyContent: 'center',
    padding: 2,
    borderWidth: 0.5,
  },
  thumb: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
});
