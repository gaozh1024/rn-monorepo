import { View, ViewProps } from 'react-native';
import { useThemeColors } from '@/theme';
import { useMotionConfig, type PressMotionProps } from '@/ui/motion';
import { cn } from '@/utils';
import { AppPressable } from '@/ui/primitives';
import {
  type CommonLayoutProps,
  type LayoutSurface,
  resolveLayoutStyle,
  resolveRoundedStyle,
  resolveSizingStyle,
  resolveSpacingStyle,
} from '../utils/layout-shortcuts';
import { useOptionalTheme } from '@/theme';
import { resolveNamedColor, resolveSurfaceColor } from '../utils/theme-color';

export type CardVariant = 'flat' | 'outlined' | 'elevated';

/**
 * Card 组件属性接口
 */
export interface CardProps extends ViewProps, CommonLayoutProps, PressMotionProps {
  /** 背景颜色 */
  bg?: string;
  /** 语义化背景 */
  surface?: LayoutSurface;
  /** Tailwind / NativeWind 类名 */
  className?: string;
  /** 视觉变体：flat 适合长列表/网格，outlined 适合轻边框卡片，elevated 保持默认阴影卡片 */
  variant?: CardVariant;
  /** 是否禁用阴影 */
  noShadow?: boolean;
  /** 是否禁用边框 */
  noBorder?: boolean;
  /** 是否禁用圆角 */
  noRadius?: boolean;
  /** 点击回调；传入后卡片将切换为可按压态 */
  onPress?: () => void;
  /** 是否禁用按压 */
  disabled?: boolean;
  /** 按压态类名 */
  pressedClassName?: string;
}

/**
 * Card - 卡片容器组件，支持浅色/深色主题
 */
export function Card({
  children,
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
  variant,
  style,
  noShadow = false,
  noBorder = false,
  noRadius = false,
  onPress,
  disabled,
  pressedClassName,
  motionPreset,
  motionDuration,
  motionReduceMotion,
  ...props
}: CardProps) {
  const motionConfig = useMotionConfig();
  const colors = useThemeColors();
  const { theme, isDark } = useOptionalTheme();
  const resolvedMotionPreset = motionPreset ?? motionConfig.defaultPressPreset ?? 'soft';
  const resolvedBgColor =
    resolveSurfaceColor(surface, theme, isDark) ?? resolveNamedColor(bg, theme, isDark);
  const shouldUseShadow = !noShadow && variant !== 'flat' && variant !== 'outlined';
  const shouldUseBorder = !noBorder && variant !== 'flat';
  const sharedClassName = cn(shouldUseShadow && 'shadow-sm', 'overflow-hidden', className);
  const sharedStyle = [
    {
      backgroundColor: resolvedBgColor ?? colors.card,
      ...(shouldUseBorder ? { borderWidth: 0.5, borderColor: colors.divider } : {}),
    },
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
    noRadius ? undefined : resolveRoundedStyle(rounded ?? 'lg'),
    style,
  ];

  if (onPress) {
    return (
      <AppPressable
        className={sharedClassName}
        style={sharedStyle}
        onPress={onPress}
        disabled={disabled}
        pressedClassName={pressedClassName}
        motionPreset={resolvedMotionPreset}
        motionDuration={motionDuration}
        motionReduceMotion={motionReduceMotion}
        {...props}
      >
        {children}
      </AppPressable>
    );
  }

  return (
    <View className={sharedClassName} style={sharedStyle} {...props}>
      {children}
    </View>
  );
}
