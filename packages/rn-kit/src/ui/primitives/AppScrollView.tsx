import { ScrollView, type ScrollViewProps } from 'react-native';
import { useOptionalTheme } from '@/theme';
import { cn } from '@/utils';
import { KeyboardDismissPressable } from './KeyboardDismissPressable';
import { resolveNamedColor, resolveSurfaceColor } from '../utils/theme-color';
import {
  type CommonLayoutProps,
  type LayoutSurface,
  resolveLayoutStyle,
  resolveRoundedStyle,
  resolveSizingStyle,
  resolveSpacingStyle,
} from '../utils/layout-shortcuts';

export interface AppScrollViewProps extends ScrollViewProps, CommonLayoutProps {
  /** 背景颜色 */
  bg?: string;
  /** 语义化背景 */
  surface?: LayoutSurface;
  /** 自定义类名 */
  className?: string;
  /** 点击非输入区域时是否收起键盘 */
  dismissKeyboardOnPressOutside?: boolean;
}

/**
 * AppScrollView - 带 Tailwind/快捷布局能力的滚动容器
 */
export function AppScrollView({
  flex,
  row,
  wrap,
  center,
  between,
  items,
  justify,
  bg,
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
  surface,
  rounded,
  w,
  h,
  minW,
  minH,
  maxW,
  maxH,
  className,
  dismissKeyboardOnPressOutside = false,
  children,
  style,
  contentContainerStyle,
  ...props
}: AppScrollViewProps) {
  const { theme, isDark } = useOptionalTheme();
  const resolvedBgColor =
    resolveSurfaceColor(surface, theme, isDark) ?? resolveNamedColor(bg, theme, isDark);
  const shouldUseClassBg = !!bg && !resolvedBgColor;

  const content = (
    <ScrollView
      className={cn(shouldUseClassBg && `bg-${bg}`, className)}
      {...props}
      style={[
        resolvedBgColor ? { backgroundColor: resolvedBgColor } : undefined,
        resolveLayoutStyle({ flex }),
        resolveSpacingStyle({ m, mx, my, mt, mb, ml, mr }),
        resolveSizingStyle({ w, h, minW, minH, maxW, maxH }),
        resolveRoundedStyle(rounded),
        style,
      ]}
      contentContainerStyle={[
        resolveLayoutStyle({
          row,
          wrap,
          center,
          between,
          items,
          justify,
          gap,
        }),
        resolveSpacingStyle({ p, px, py, pt, pb, pl, pr }),
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps={
        dismissKeyboardOnPressOutside
          ? (props.keyboardShouldPersistTaps ?? 'handled')
          : props.keyboardShouldPersistTaps
      }
    >
      {children}
    </ScrollView>
  );

  if (!dismissKeyboardOnPressOutside) {
    return content;
  }

  return <KeyboardDismissPressable>{content}</KeyboardDismissPressable>;
}
