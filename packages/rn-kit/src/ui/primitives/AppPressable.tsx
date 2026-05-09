import * as React from 'react';
import Animated from 'react-native-reanimated';
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useOptionalTheme } from '@/theme';
import { cn } from '@/utils';
import type { MotionAnimatedViewStyle, PressMotionPreset, PressMotionProps } from '../motion';
import { useMotionConfig } from '../motion/context';
import { usePressMotion } from '../motion/hooks/usePressMotion';
import { resolveNamedColor, resolveSurfaceColor } from '../utils/theme-color';
import {
  type CommonLayoutProps,
  type LayoutSurface,
  resolveLayoutStyle,
  resolveRoundedStyle,
  resolveSizingStyle,
  resolveSpacingStyle,
} from '../utils/layout-shortcuts';

export interface AppPressableProps extends PressableProps, CommonLayoutProps, PressMotionProps {
  bg?: string;
  surface?: LayoutSurface;
  className?: string;
  pressedClassName?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AppPressableResolvedStyleItem = StyleProp<ViewStyle> | MotionAnimatedViewStyle | undefined;
type AppPressableResolvedStyle = AppPressableResolvedStyleItem[];

type ResolvedAppPressableProps = AppPressableProps & {
  resolvedMotionPreset: PressMotionPreset;
};

type ResolvedAppPressableStyleOptions = Pick<
  AppPressableProps,
  | 'between'
  | 'bg'
  | 'center'
  | 'className'
  | 'flex'
  | 'gap'
  | 'h'
  | 'items'
  | 'justify'
  | 'm'
  | 'maxH'
  | 'maxW'
  | 'mb'
  | 'minH'
  | 'minW'
  | 'ml'
  | 'mr'
  | 'mt'
  | 'mx'
  | 'my'
  | 'p'
  | 'pb'
  | 'pl'
  | 'pr'
  | 'pressedClassName'
  | 'pt'
  | 'px'
  | 'py'
  | 'rounded'
  | 'row'
  | 'style'
  | 'surface'
  | 'w'
  | 'wrap'
> & {
  isPressed: boolean;
  motionAnimatedStyle?: MotionAnimatedViewStyle;
};

function useResolvedAppPressableStyle({
  flex,
  row,
  wrap,
  center,
  between,
  items,
  justify,
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
  bg,
  surface,
  className,
  pressedClassName,
  isPressed,
  style,
  motionAnimatedStyle,
}: ResolvedAppPressableStyleOptions) {
  const { theme, isDark } = useOptionalTheme();
  const resolvedBgColor =
    resolveSurfaceColor(surface, theme, isDark) ?? resolveNamedColor(bg, theme, isDark);
  const shouldUseClassBg = !!bg && !resolvedBgColor;
  const resolvedClassName = cn(
    shouldUseClassBg && `bg-${bg}`,
    className,
    isPressed && pressedClassName
  );

  const baseStyle = React.useMemo<AppPressableResolvedStyle>(
    () => [
      resolvedBgColor ? { backgroundColor: resolvedBgColor } : undefined,
      resolveLayoutStyle({
        flex,
        row,
        wrap,
        center,
        between,
        items,
        justify,
        gap,
      }),
      resolveSpacingStyle({
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
      }),
      resolveSizingStyle({
        w,
        h,
        minW,
        minH,
        maxW,
        maxH,
      }),
      resolveRoundedStyle(rounded),
      motionAnimatedStyle,
    ],
    [
      between,
      center,
      flex,
      gap,
      h,
      items,
      justify,
      m,
      maxH,
      maxW,
      mb,
      minH,
      minW,
      ml,
      mr,
      motionAnimatedStyle,
      mt,
      mx,
      my,
      p,
      pb,
      pl,
      pr,
      pt,
      px,
      py,
      resolvedBgColor,
      rounded,
      row,
      w,
      wrap,
    ]
  );

  const resolvedStyle =
    typeof style === 'function'
      ? React.useCallback(
          (state: PressableStateCallbackType): AppPressableResolvedStyle => [
            ...(baseStyle as any[]),
            style(state),
          ],
          [baseStyle, style]
        )
      : ([...(baseStyle as any[]), style] as AppPressableResolvedStyle);

  return { className: resolvedClassName, style: resolvedStyle };
}

type AppPressableParts = {
  styleOptions: Omit<ResolvedAppPressableStyleOptions, 'isPressed' | 'motionAnimatedStyle'>;
  motionDuration?: number;
  motionReduceMotion?: boolean;
  resolvedMotionPreset: PressMotionPreset;
  children: PressableProps['children'];
  onPressIn: PressableProps['onPressIn'];
  onPressOut: PressableProps['onPressOut'];
  pressableProps: PressableProps;
};

function splitAppPressableProps({
  flex,
  row,
  wrap,
  center,
  between,
  items,
  justify,
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
  bg,
  surface,
  className,
  pressedClassName,
  motionPreset: _motionPreset,
  motionDuration,
  motionReduceMotion,
  resolvedMotionPreset,
  children,
  style,
  onPressIn,
  onPressOut,
  ...pressableProps
}: ResolvedAppPressableProps): AppPressableParts {
  return {
    styleOptions: {
      flex,
      row,
      wrap,
      center,
      between,
      items,
      justify,
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
      bg,
      surface,
      className,
      pressedClassName,
      style,
    },
    motionDuration,
    motionReduceMotion,
    resolvedMotionPreset,
    children,
    onPressIn,
    onPressOut,
    pressableProps,
  };
}

function PlainAppPressable(props: ResolvedAppPressableProps) {
  const [isPressed, setIsPressed] = React.useState(false);
  const { styleOptions, children, onPressIn, onPressOut, pressableProps } =
    splitAppPressableProps(props);
  const resolved = useResolvedAppPressableStyle({
    ...styleOptions,
    isPressed,
  });

  return (
    <Pressable
      className={resolved.className}
      style={resolved.style as PressableProps['style']}
      onPressIn={e => {
        setIsPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={e => {
        setIsPressed(false);
        onPressOut?.(e);
      }}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
}

function MotionAppPressable(props: ResolvedAppPressableProps) {
  const [isPressed, setIsPressed] = React.useState(false);
  const {
    styleOptions,
    motionDuration,
    motionReduceMotion,
    resolvedMotionPreset,
    children,
    onPressIn,
    onPressOut,
    pressableProps,
  } = splitAppPressableProps(props);
  const pressMotion = usePressMotion({
    preset: resolvedMotionPreset,
    duration: motionDuration,
    disabled: pressableProps.disabled === true,
    reduceMotion: motionReduceMotion,
  });
  const resolved = useResolvedAppPressableStyle({
    ...styleOptions,
    isPressed,
    motionAnimatedStyle: pressMotion.animatedStyle,
  });

  return (
    <AnimatedPressable
      className={resolved.className}
      style={resolved.style}
      onPressIn={e => {
        setIsPressed(true);
        pressMotion.onPressIn();
        onPressIn?.(e);
      }}
      onPressOut={e => {
        setIsPressed(false);
        pressMotion.onPressOut();
        onPressOut?.(e);
      }}
      {...pressableProps}
    >
      {children}
    </AnimatedPressable>
  );
}

export function AppPressable(props: AppPressableProps) {
  const motionConfig = useMotionConfig();
  const resolvedMotionPreset = props.motionPreset ?? motionConfig.defaultPressPreset ?? 'none';
  const resolvedProps = { ...props, resolvedMotionPreset };

  if (resolvedMotionPreset === 'none') {
    return <PlainAppPressable {...resolvedProps} />;
  }

  return <MotionAppPressable {...resolvedProps} />;
}
