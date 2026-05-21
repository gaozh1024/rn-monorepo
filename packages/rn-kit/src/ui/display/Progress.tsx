import Animated from 'react-native-reanimated';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { AppView } from '@/ui/primitives';
import { useTheme } from '@/theme';
import { cn } from '@/utils';
import type { ProgressMotionProps } from '../motion';
import { useProgressMotion } from '../motion/hooks/useProgressMotion';
import { useReducedMotion } from '../motion/hooks/useReducedMotion';
import { motionDurations } from '../motion/tokens';
import { resolveDuration } from '../motion/utils';
import {
  type CommonLayoutProps,
  type LayoutSurface,
  resolveLayoutStyle,
  resolveRoundedStyle,
  resolveSizingStyle,
  resolveSpacingStyle,
} from '../utils/layout-shortcuts';
import { resolveNamedColor, resolveSurfaceColor } from '../utils/theme-color';

/**
 * Progress 组件属性接口
 */
export interface ProgressProps
  extends
    Pick<
      CommonLayoutProps,
      | 'flex'
      | 'm'
      | 'mx'
      | 'my'
      | 'mt'
      | 'mb'
      | 'ml'
      | 'mr'
      | 'rounded'
      | 'w'
      | 'h'
      | 'minW'
      | 'minH'
      | 'maxW'
      | 'maxH'
    >,
    ProgressMotionProps {
  /** 当前进度值 */
  value: number;
  /** 最大值，默认为 100 */
  max?: number;
  /** 进度条高度：xs(4px)、sm(6px)、md(8px)、lg(12px)、xl(16px) */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 进度条颜色 */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** 测试 ID */
  testID?: string;
  /** 自定义容器样式 */
  className?: string;
  /** 自定义进度条样式 */
  barClassName?: string;
  /** 自定义轨道背景色 */
  bg?: string;
  /** 语义化轨道背景 */
  surface?: LayoutSurface;
  /** 是否启用进度动画 */
  animated?: boolean;
}

/** 尺寸映射表 */
const sizeMap = { xs: 'h-1', sm: 'h-1.5', md: 'h-2', lg: 'h-3', xl: 'h-4' };

/** 颜色映射表 */
const colorMap = {
  primary: 'bg-primary-500',
  secondary: 'bg-secondary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
};

interface ProgressBarProps extends Pick<
  ProgressProps,
  'barClassName' | 'color' | 'max' | 'motionDuration' | 'motionReduceMotion' | 'motionSpringPreset'
> {
  percentage: number;
  resolvedRounded: ReturnType<typeof resolveRoundedStyle>;
  roundedClassName?: string;
  size: NonNullable<ProgressProps['size']>;
  value: number;
  transitionStyle?: StyleProp<ViewStyle>;
}

function PlainProgressBar({
  barClassName,
  color = 'primary',
  percentage,
  resolvedRounded,
  roundedClassName,
  size,
  transitionStyle,
}: ProgressBarProps) {
  return (
    <AppView
      className={cn(roundedClassName, sizeMap[size], colorMap[color], barClassName)}
      style={[resolvedRounded, { width: `${percentage}%` }, transitionStyle]}
    />
  );
}

function MotionProgressBar({
  barClassName,
  color = 'primary',
  max = 100,
  motionDuration,
  motionReduceMotion,
  motionSpringPreset,
  resolvedRounded,
  roundedClassName,
  size,
  value,
}: ProgressBarProps) {
  const progressMotion = useProgressMotion({
    value,
    min: 0,
    max,
    duration: motionDuration,
    spring: motionSpringPreset,
    reduceMotion: motionReduceMotion,
  });

  return (
    <Animated.View
      className={cn(roundedClassName, sizeMap[size], colorMap[color], barClassName)}
      style={[resolvedRounded, progressMotion.barStyle]}
    />
  );
}

export function Progress({
  flex,
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  rounded,
  w,
  h,
  minW,
  minH,
  maxW,
  maxH,
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  testID,
  className,
  barClassName,
  bg,
  surface,
  animated = true,
  motionDuration,
  motionSpringPreset,
  motionReduceMotion,
}: ProgressProps) {
  const { theme, isDark } = useTheme();
  const { reduceMotion: systemReduceMotion, durationScale } = useReducedMotion();
  const reduceMotion = motionReduceMotion ?? systemReduceMotion;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const shouldUseWebAnimatedBar = Platform.OS === 'web' && animated;
  const webDuration = resolveDuration(
    motionDuration,
    motionDurations.medium,
    reduceMotion,
    durationScale
  );
  const webTransitionStyle: StyleProp<ViewStyle> = shouldUseWebAnimatedBar
    ? ({
        transitionProperty: 'width',
        transitionDuration: `${Math.max(0, webDuration)}ms`,
        transitionTimingFunction: motionSpringPreset ? 'cubic-bezier(0.22, 1, 0.36, 1)' : 'ease',
        willChange: 'width',
      } as unknown as ViewStyle)
    : undefined;

  const trackBgColor =
    resolveSurfaceColor(surface, theme, isDark) ??
    resolveNamedColor(bg, theme, isDark) ??
    (isDark ? theme.colors.border?.[700] || '#374151' : '#e5e7eb');
  const resolvedRounded = resolveRoundedStyle(rounded ?? 'full');

  return (
    <AppView
      className={cn('w-full', rounded === undefined && 'rounded-full', sizeMap[size], className)}
      style={[
        resolveLayoutStyle({ flex }),
        resolveSpacingStyle({ m, mx, my, mt, mb, ml, mr }),
        resolveSizingStyle({ w, h, minW, minH, maxW, maxH }),
        resolvedRounded,
        { backgroundColor: trackBgColor },
      ]}
      testID={testID}
    >
      {shouldUseWebAnimatedBar ? (
        <PlainProgressBar
          barClassName={barClassName}
          color={color}
          max={max}
          motionDuration={motionDuration}
          motionReduceMotion={motionReduceMotion}
          motionSpringPreset={motionSpringPreset}
          percentage={percentage}
          resolvedRounded={resolvedRounded}
          roundedClassName={rounded === undefined ? 'rounded-full' : undefined}
          size={size}
          transitionStyle={webTransitionStyle}
          value={value}
        />
      ) : animated ? (
        <MotionProgressBar
          barClassName={barClassName}
          color={color}
          max={max}
          motionDuration={motionDuration}
          motionReduceMotion={motionReduceMotion}
          motionSpringPreset={motionSpringPreset}
          percentage={percentage}
          resolvedRounded={resolvedRounded}
          roundedClassName={rounded === undefined ? 'rounded-full' : undefined}
          size={size}
          transitionStyle={undefined}
          value={value}
        />
      ) : (
        <PlainProgressBar
          barClassName={barClassName}
          color={color}
          max={max}
          motionDuration={motionDuration}
          motionReduceMotion={motionReduceMotion}
          motionSpringPreset={motionSpringPreset}
          percentage={percentage}
          resolvedRounded={resolvedRounded}
          roundedClassName={rounded === undefined ? 'rounded-full' : undefined}
          size={size}
          transitionStyle={undefined}
          value={value}
        />
      )}
    </AppView>
  );
}
