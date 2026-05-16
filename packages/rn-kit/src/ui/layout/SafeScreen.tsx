import React from 'react';
import { View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOptionalTheme } from '@/theme';
import { cn } from '@/utils';
import { KeyboardDismissPressable } from '../primitives/KeyboardDismissPressable';
import { resolveNamedColor, resolveSurfaceColor } from '../utils/theme-color';
import {
  type CommonLayoutProps,
  type LayoutSurface,
  resolveLayoutStyle,
  resolveRoundedStyle,
  resolveSizingStyle,
  resolveSpacingStyle,
} from '../utils/layout-shortcuts';

export interface SafeScreenProps extends ViewProps, CommonLayoutProps {
  /** 是否包含顶部安全区域 */
  top?: boolean;
  /** 是否包含底部安全区域 */
  bottom?: boolean;
  /** 是否包含左侧安全区域 */
  left?: boolean;
  /** 是否包含右侧安全区域 */
  right?: boolean;
  /** 背景颜色 */
  bg?: string;
  /** 语义化背景 */
  surface?: LayoutSurface;
  /** 点击非输入区域时是否收起键盘 */
  dismissKeyboardOnPressOutside?: boolean;
  /** 自定义样式类 */
  className?: string;
  /** 子元素 */
  children: React.ReactNode;
}

export interface AppScreenProps extends SafeScreenProps {}

/**
 * 安全屏幕组件 - 自动适配刘海屏/全面屏的安全区域
 *
 * @example
 * ```tsx
 * <SafeScreen flex bg="white">
 *   <AppText>内容在安全区域内</AppText>
 * </SafeScreen>
 * ```
 */
export function SafeScreen({
  top = true,
  bottom = true,
  left = false,
  right = false,
  bg,
  surface,
  flex = true,
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
  dismissKeyboardOnPressOutside = false,
  className,
  children,
  style,
  ...props
}: SafeScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useOptionalTheme();
  const resolvedBgColor =
    resolveSurfaceColor(surface, theme, isDark) ?? resolveNamedColor(bg, theme, isDark);
  const shouldUseClassBg = !!bg && !resolvedBgColor;

  const content = (
    <View
      className={cn(shouldUseClassBg && `bg-${bg}`, className)}
      style={[
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
        {
          paddingTop: (pt ?? py ?? p ?? 0) + (top ? insets.top : 0),
          paddingBottom: (pb ?? py ?? p ?? 0) + (bottom ? insets.bottom : 0),
          paddingLeft: (pl ?? px ?? p ?? 0) + (left ? insets.left : 0),
          paddingRight: (pr ?? px ?? p ?? 0) + (right ? insets.right : 0),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );

  if (!dismissKeyboardOnPressOutside) {
    return content;
  }

  return <KeyboardDismissPressable>{content}</KeyboardDismissPressable>;
}

/**
 * 页面容器组件 - 面向常规业务页面的语义容器
 *
 * 默认假设顶部安全区由 `AppHeader` 之类的页面头部组件负责，
 * 因此默认 `top=false`、`bottom=true`
 *
 * @example
 * ```tsx
 * <AppScreen>
 *   <AppHeader title="首页" />
 *   <AppView flex p={4}>
 *     <AppText>页面内容</AppText>
 *   </AppView>
 * </AppScreen>
 * ```
 */
export function AppScreen({
  children,
  className,
  top = false,
  bottom = true,
  left = false,
  right = false,
  surface = 'background',
  flex = true,
  ...props
}: AppScreenProps) {
  return (
    <SafeScreen
      top={top}
      bottom={bottom}
      left={left}
      right={right}
      flex={flex}
      surface={surface}
      {...props}
      className={className}
    >
      {children}
    </SafeScreen>
  );
}

/**
 * 底部安全区域组件 - 只在底部添加安全距离
 * 注意：此组件不会铺满全屏，只占据内容高度
 *
 * @example
 * ```tsx
 * <SafeBottom>
 *   <AppButton>底部按钮</AppButton>
 * </SafeBottom>
 * ```
 */
export function SafeBottom({
  children,
  className,
  ...props
}: Omit<SafeScreenProps, 'top' | 'bottom' | 'left' | 'right'>) {
  return (
    <SafeScreen bottom left right flex={false} {...props} className={className}>
      {children}
    </SafeScreen>
  );
}
