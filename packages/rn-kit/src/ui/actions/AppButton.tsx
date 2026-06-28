import { useCallback, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useOptionalTheme } from '@/theme';
import { useMotionConfig, type PressMotionProps } from '@/ui/motion';
import { AppPressable, AppText, AppView } from '@/ui/primitives';
import { cn } from '@/utils';
import type { CommonLayoutProps } from '../utils/layout-shortcuts';

/**
 * AppButton 组件属性接口
 */
export type AppButtonColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'
  | 'danger'
  | 'muted';

export interface AppButtonProps
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
      | 'w'
      | 'h'
      | 'minW'
      | 'minH'
      | 'maxW'
      | 'maxH'
      | 'rounded'
    >,
    PressMotionProps {
  /** 按钮样式变体：solid(实心)、outline(描边)、ghost(透明)、surface(卡片面)、soft(浅色底) */
  variant?: 'solid' | 'outline' | 'ghost' | 'surface' | 'soft';
  /** 按钮尺寸：sm(小)、md(中)、lg(大) */
  size?: 'sm' | 'md' | 'lg';
  /** 按钮颜色主题 */
  color?: AppButtonColor;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击回调 */
  onPress?: () => void;
  /** 点击前是否先收起键盘 */
  dismissKeyboardOnPress?: boolean;
  /** 按钮内容 */
  children?: ReactNode;
  /** 左侧图标 */
  leftIcon?: ReactNode;
  /** 右侧图标 */
  rightIcon?: ReactNode;
  /** 图标与内容间距 */
  iconGap?: number;
  /** 自定义内容渲染，设置后会覆盖 children/leftIcon/rightIcon 的默认排版 */
  renderContent?: () => ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 按钮外层样式 */
  style?: StyleProp<ViewStyle>;
  /** 按钮内容容器样式 */
  contentStyle?: StyleProp<ViewStyle>;
  /** 默认文本样式 */
  textStyle?: StyleProp<TextStyle>;
  /** 按下状态样式 */
  pressedStyle?: StyleProp<ViewStyle>;
  /** 禁用状态样式 */
  disabledStyle?: StyleProp<ViewStyle>;
}

/**
 * AppButton - 按钮组件
 *
 * 功能完善的按钮组件，支持多种样式变体、尺寸和颜色主题
 * 内置加载状态和禁用状态处理，提供统一的用户交互体验
 *
 * @example
 * ```tsx
 * // 基础使用
 * <AppButton onPress={handlePress}>确定</AppButton>
 *
 * // 不同变体
 * <AppButton variant="solid">实心按钮</AppButton>
 * <AppButton variant="outline">描边按钮</AppButton>
 * <AppButton variant="ghost">透明按钮</AppButton>
 *
 * // 不同尺寸
 * <AppButton size="sm">小按钮</AppButton>
 * <AppButton size="md">中按钮</AppButton>
 * <AppButton size="lg">大按钮</AppButton>
 *
 * // 不同颜色
 * <AppButton color="primary">主题色</AppButton>
 * <AppButton color="secondary">次要色</AppButton>
 * <AppButton color="success">成功操作</AppButton>
 * <AppButton color="warning">警告操作</AppButton>
 * <AppButton color="info">提示操作</AppButton>
 * <AppButton color="danger">危险操作</AppButton>
 *
 * // 加载状态
 * <AppButton loading>加载中</AppButton>
 *
 * // 禁用状态
 * <AppButton disabled>不可用</AppButton>
 *
 * // 组合使用
 * <AppButton
 *   variant="outline"
 *   color="danger"
 *   size="lg"
 *   onPress={handleDelete}
 * >
 *   删除账号
 * </AppButton>
 * ```
 */
export function AppButton({
  flex,
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  w,
  h,
  minW,
  minH,
  maxW,
  maxH,
  rounded,
  variant = 'solid',
  size = 'md',
  color = 'primary',
  loading,
  disabled,
  onPress,
  dismissKeyboardOnPress = true,
  children,
  leftIcon,
  rightIcon,
  iconGap = 8,
  renderContent,
  className,
  style,
  contentStyle,
  textStyle,
  pressedStyle,
  disabledStyle,
  motionPreset,
  motionDuration,
  motionReduceMotion,
}: AppButtonProps) {
  const motionConfig = useMotionConfig();
  const { theme, isDark } = useOptionalTheme();
  const isDisabled = disabled || loading;
  const resolvedMotionPreset = motionPreset ?? motionConfig.defaultPressPreset ?? 'soft';

  const sizeClasses = { sm: 'px-3 py-2', md: 'px-4 py-3', lg: 'px-6 py-4' };
  const sizeSpacing = {
    sm: { px: 12, py: 8 },
    md: { px: 16, py: 12 },
    lg: { px: 24, py: 16 },
  } satisfies Record<NonNullable<AppButtonProps['size']>, { px: number; py: number }>;
  const buttonColors: Record<AppButtonColor, string> = {
    primary: theme.colors.primary?.[500] || '#f38b32',
    secondary: theme.colors.secondary?.[500] || '#3b82f6',
    success: theme.colors.success?.[500] || '#22c55e',
    warning: theme.colors.warning?.[500] || '#f59e0b',
    info: theme.colors.info?.[500] || theme.colors.secondary?.[500] || '#3b82f6',
    error: theme.colors.error?.[500] || '#ef4444',
    danger: theme.colors.error?.[500] || '#ef4444',
    muted: isDark ? '#6b7280' : '#9ca3af',
  };
  const ghostTextColor = isDark ? '#ffffff' : theme.colors.text?.[500] || '#1f2937';
  const ghostBackgroundColor = isDark ? 'rgba(255,255,255,0.04)' : 'transparent';

  const softBackgroundColor = isDark
    ? theme.colors[color]?.[900] || 'rgba(255,255,255,0.08)'
    : theme.colors[color]?.[50] || 'rgba(243,139,50,0.12)';
  const surfaceBackgroundColor =
    theme.colors.surfaceContainerLowest?.[500] ||
    theme.colors.card?.[500] ||
    (isDark ? '#1f2937' : '#ffffff');
  const surfaceTextColor = theme.colors.text?.[500] || (isDark ? '#ffffff' : '#1f2937');
  const surfaceShadow: ViewStyle = isDark
    ? {}
    : {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
      };

  const loadingColor = variant === 'solid' ? 'white' : buttonColors[color];
  const textColor =
    variant === 'solid'
      ? '#ffffff'
      : variant === 'ghost'
        ? ghostTextColor
        : variant === 'surface'
          ? surfaceTextColor
          : buttonColors[color];

  const handlePress = useCallback(() => {
    if (dismissKeyboardOnPress) {
      Keyboard.dismiss();
    }

    onPress?.();
  }, [dismissKeyboardOnPress, onPress]);

  const buttonStyle: ViewStyle =
    variant === 'solid'
      ? { backgroundColor: buttonColors[color] }
      : variant === 'outline'
        ? { borderWidth: 0.5, borderColor: buttonColors[color], backgroundColor: 'transparent' }
        : variant === 'surface'
          ? {
              backgroundColor: surfaceBackgroundColor,
              borderWidth: 0,
              ...surfaceShadow,
            }
          : variant === 'soft'
            ? { backgroundColor: softBackgroundColor }
            : { backgroundColor: ghostBackgroundColor };

  const content = loading ? (
    <ActivityIndicator size="small" color={loadingColor} />
  ) : (
    (renderContent?.() ?? (
      <AppView row items="center" justify="center" gap={iconGap} style={contentStyle}>
        {leftIcon}
        {typeof children === 'string' || typeof children === 'number' ? (
          <AppText weight="semibold" style={[{ color: textColor }, textStyle]}>
            {children}
          </AppText>
        ) : (
          children
        )}
        {rightIcon}
      </AppView>
    ))
  );
  const hasStateStyle = style !== undefined || isDisabled || disabledStyle !== undefined;
  const pressableStyle = pressedStyle
    ? ({ pressed }: { pressed: boolean }) => [
        buttonStyle,
        style,
        isDisabled ? styles.disabled : undefined,
        isDisabled ? disabledStyle : undefined,
        pressed && !isDisabled ? pressedStyle : undefined,
      ]
    : hasStateStyle
      ? [
          buttonStyle,
          style,
          isDisabled ? styles.disabled : undefined,
          isDisabled ? disabledStyle : undefined,
        ]
      : buttonStyle;

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
      w={w}
      h={h}
      minW={minW}
      minH={minH}
      maxW={maxW}
      maxH={maxH}
      rounded={rounded ?? 'lg'}
      row
      items="center"
      justify="center"
      px={sizeSpacing[size].px}
      py={sizeSpacing[size].py}
      onPress={onPress ? handlePress : undefined}
      disabled={isDisabled}
      motionPreset={resolvedMotionPreset}
      motionDuration={motionDuration}
      motionReduceMotion={motionReduceMotion}
      className={cn(
        'flex-row items-center justify-center',
        sizeClasses[size],
        isDisabled && 'opacity-50',
        className
      )}
      style={pressableStyle}
    >
      {content}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
