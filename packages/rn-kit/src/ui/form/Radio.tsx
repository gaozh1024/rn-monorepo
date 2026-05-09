import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppView, AppText, AppPressable } from '@/ui/primitives';
import { useThemeColors } from '@/theme';
import { cn } from '@/utils';
import type { ToggleMotionProps } from '../motion';
import { useToggleMotion } from '../motion/hooks/useToggleMotion';
import { type CommonLayoutProps, type LayoutSurface } from '../utils/layout-shortcuts';

export interface RadioProps
  extends
    Pick<
      CommonLayoutProps,
      | 'flex'
      | 'p'
      | 'px'
      | 'py'
      | 'pt'
      | 'pb'
      | 'pl'
      | 'pr'
      | 'm'
      | 'mx'
      | 'my'
      | 'mt'
      | 'mb'
      | 'ml'
      | 'mr'
      | 'gap'
      | 'rounded'
      | 'w'
      | 'h'
      | 'minW'
      | 'minH'
      | 'maxW'
      | 'maxH'
    >,
    ToggleMotionProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  bg?: string;
  surface?: LayoutSurface;
  testID?: string;
}

interface RadioIndicatorProps extends Pick<
  ToggleMotionProps,
  'motionDuration' | 'motionSpringPreset'
> {
  checked: boolean;
  color: string;
}

function PlainRadioIndicator({ checked, color }: RadioIndicatorProps) {
  if (!checked) return null;

  return <AppView className="rounded-full" style={[styles.inner, { backgroundColor: color }]} />;
}

function MotionRadioIndicator({
  checked,
  color,
  motionDuration,
  motionSpringPreset,
}: RadioIndicatorProps) {
  const toggleMotion = useToggleMotion({
    value: checked,
    preset: 'radio',
    duration: motionDuration,
    spring: motionSpringPreset,
  });

  if (!checked) return null;

  return (
    <Animated.View
      className="rounded-full"
      style={[styles.inner, { backgroundColor: color }, toggleMotion.indicatorStyle]}
    />
  );
}

export function Radio({
  flex,
  p,
  px,
  py,
  pt,
  pb,
  pl,
  pr,
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  gap,
  rounded,
  w,
  h,
  minW,
  minH,
  maxW,
  maxH,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  children,
  className,
  bg,
  surface,
  testID,
  animated = true,
  motionDuration,
  motionSpringPreset,
  motionReduceMotion,
}: RadioProps) {
  const colors = useThemeColors();
  const [internalChecked, setInternalChecked] = useState(defaultChecked || false);
  const isChecked = checked !== undefined ? checked : internalChecked;
  const shouldAnimateToggle = animated && motionReduceMotion !== true;

  const toggle = () => {
    if (disabled) return;
    const newChecked = !isChecked;
    if (checked === undefined) {
      setInternalChecked(newChecked);
    }
    onChange?.(newChecked);
  };

  const disabledOpacity = 0.4;

  return (
    <AppPressable
      flex={flex}
      row
      items="center"
      p={p}
      px={px}
      py={py}
      pt={pt}
      pb={pb}
      pl={pl}
      pr={pr}
      m={m}
      mx={mx}
      my={my}
      mt={mt}
      mb={mb}
      ml={ml}
      mr={mr}
      gap={gap ?? 8}
      rounded={rounded}
      w={w}
      h={h}
      minW={minW}
      minH={minH}
      maxW={maxW}
      maxH={maxH}
      bg={bg}
      surface={surface}
      onPress={toggle}
      disabled={disabled}
      className={cn(className)}
      style={disabled ? { opacity: disabledOpacity } : undefined}
      testID={testID}
    >
      <AppView
        className={cn('w-5 h-5 rounded-full items-center justify-center', isChecked && 'border-2')}
        style={[
          styles.radio,
          {
            backgroundColor: colors.card,
            borderColor: isChecked ? colors.primary : colors.border,
            borderWidth: isChecked ? 0.5 : 0.5,
          },
        ]}
      >
        {shouldAnimateToggle ? (
          <MotionRadioIndicator
            checked={isChecked}
            color={colors.primary}
            motionDuration={motionDuration}
            motionSpringPreset={motionSpringPreset}
          />
        ) : (
          <PlainRadioIndicator checked={isChecked} color={colors.primary} />
        )}
      </AppView>
      {children && (
        <AppText size="sm" style={{ color: colors.text }}>
          {children}
        </AppText>
      )}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  radio: {
    borderWidth: 0.5,
  },
  inner: {
    width: 10,
    height: 10,
  },
});
