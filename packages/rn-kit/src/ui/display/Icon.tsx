import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useOptionalTheme } from '@/theme';
import { AppPressable, AppView } from '@/ui/primitives';
import { resolveNamedColor } from '../utils/theme-color';
import { type CommonLayoutProps, type LayoutSurface } from '../utils/layout-shortcuts';

/** 图标尺寸类型 */
export type IconSize = number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const NavigationIcons = {
  home: 'home',
  explore: 'explore',
  profile: 'person',
  settings: 'settings',
  back: 'arrow-back',
  forward: 'arrow-forward',
  close: 'close',
  menu: 'menu',
  more: 'more-vert',
} as const;

export const ActionIcons = {
  add: 'add',
  edit: 'edit',
  delete: 'delete',
  search: 'search',
  share: 'share',
  favorite: 'favorite',
  favoriteBorder: 'favorite-border',
  check: 'check',
  checkCircle: 'check-circle',
  close: 'close',
  closeCircle: 'cancel',
  copy: 'content-copy',
  download: 'download',
  upload: 'upload',
} as const;

export const StatusIcons = {
  info: 'info',
  success: 'check-circle',
  warning: 'warning',
  error: 'error',
  help: 'help',
  loading: 'refresh',
} as const;

export const FileIcons = {
  file: 'insert-drive-file',
  image: 'image',
  video: 'videocam',
  audio: 'audiotrack',
  folder: 'folder',
  folderOpen: 'folder-open',
  document: 'description',
  pdf: 'picture-as-pdf',
} as const;

export type IconName =
  | (typeof NavigationIcons)[keyof typeof NavigationIcons]
  | (typeof ActionIcons)[keyof typeof ActionIcons]
  | (typeof StatusIcons)[keyof typeof StatusIcons]
  | (typeof FileIcons)[keyof typeof FileIcons]
  | (string & {});

/**
 * Icon 组件属性接口
 */
export interface IconProps extends Pick<
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
  | 'rounded'
  | 'w'
  | 'h'
  | 'minW'
  | 'minH'
  | 'maxW'
  | 'maxH'
> {
  /** 图标名称，参考 MaterialIcons 图标库 */
  name: IconName;
  /** 图标尺寸：预设值 xs(16px)、sm(20px)、md(24px)、lg(32px)、xl(48px) 或直接指定数字 */
  size?: IconSize;
  /** 图标颜色，支持 Tailwind 颜色格式（如 'primary-500'、'gray-600'）或十六进制值 */
  color?: string;
  /** 自定义样式 */
  style?: StyleProp<TextStyle>;
  /** 点击回调，设置了此属性后图标将变为可点击 */
  onPress?: () => void;
  /** 背景颜色 */
  bg?: string;
  /** 语义化背景 */
  surface?: LayoutSurface;
  /** 自定义类名 */
  className?: string;
  /** 测试 ID */
  testID?: string;
}

/**
 * 预设尺寸映射表
 */
const sizeMap: Record<string, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

type MaterialIconComponent = React.ComponentType<{
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}>;

function isComponentLike(value: unknown): value is MaterialIconComponent {
  if (typeof value === 'function') return true;
  if (typeof value !== 'object' || value === null) return false;
  return '$$typeof' in (value as Record<string, unknown>);
}

const MaterialIconComponent = isComponentLike(MaterialIcons) ? MaterialIcons : undefined;
const warnedIconNames = new Set<string>();

function normalizeIconName(name: IconName) {
  const value = String(name);
  const normalized = value.includes('_') ? value.replace(/_/g, '-') : value;
  const isDev = typeof __DEV__ === 'undefined' ? true : __DEV__;

  if (isDev && normalized !== value && !warnedIconNames.has(value)) {
    warnedIconNames.add(value);
    console.warn(
      `[rn-kit/Icon] Icon name "${value}" was normalized to "${normalized}". Prefer MaterialIcons kebab-case names such as "check-circle".`
    );
  }

  return normalized;
}

/**
 * 解析图标尺寸
 * @param size - 图标尺寸
 * @returns 解析后的数字尺寸
 */
function resolveSize(size: IconSize = 'md'): number {
  if (typeof size === 'number') return size;
  return sizeMap[size] || 24;
}

/**
 * 解析图标颜色
 * @param color - 颜色值
 * @param theme - 主题对象
 * @returns 解析后的颜色值
 */
/**
 * Icon - 图标组件
 *
 * 基于 MaterialIcons 的图标组件，支持主题颜色、多种尺寸和点击交互
 * 提供了常用的图标常量集合，方便开发使用
 *
 * @example
 * ```tsx
 * // 基础使用
 * <Icon name="home" />
 *
 * // 指定尺寸
 * <Icon name="search" size="lg" />
 * <Icon name="settings" size={32} />
 *
 * // 指定颜色
 * <Icon name="check-circle" color="success-500" />
 * <Icon name="error" color="red-500" />
 *
 * // 可点击图标
 * <Icon name="close" onPress={() => setVisible(false)} />
 *
 * // 使用预设常量
 * <Icon name={NavigationIcons.home} />
 * <Icon name={ActionIcons.delete} color="danger-500" />
 * ```
 */
export function Icon({
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
  rounded,
  w,
  h,
  minW,
  minH,
  maxW,
  maxH,
  name,
  size = 'md',
  color = 'gray-600',
  style,
  onPress,
  bg,
  surface,
  className,
  testID,
}: IconProps) {
  const { theme, isDark } = useOptionalTheme();
  const resolvedSize = resolveSize(size);
  const resolvedColor = resolveNamedColor(color, theme, isDark) ?? color;
  const resolvedName = normalizeIconName(name);
  const shouldWrap =
    onPress !== undefined ||
    className !== undefined ||
    bg !== undefined ||
    surface !== undefined ||
    flex !== undefined ||
    p !== undefined ||
    px !== undefined ||
    py !== undefined ||
    pt !== undefined ||
    pb !== undefined ||
    pl !== undefined ||
    pr !== undefined ||
    m !== undefined ||
    mx !== undefined ||
    my !== undefined ||
    mt !== undefined ||
    mb !== undefined ||
    ml !== undefined ||
    mr !== undefined ||
    rounded !== undefined ||
    w !== undefined ||
    h !== undefined ||
    minW !== undefined ||
    minH !== undefined ||
    maxW !== undefined ||
    maxH !== undefined;
  const fallback = (
    <Text
      style={[
        {
          color: resolvedColor,
          fontSize: resolvedSize,
          lineHeight: resolvedSize,
        },
        style,
      ]}
      testID={testID}
    >
      □
    </Text>
  );
  const iconNode = !MaterialIconComponent ? (
    fallback
  ) : (
    <MaterialIconComponent
      name={resolvedName as any}
      size={resolvedSize}
      color={resolvedColor}
      style={style}
      testID={shouldWrap ? undefined : testID}
    />
  );

  if (!shouldWrap) {
    return iconNode;
  }

  const wrapperProps = {
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
    testID,
  };

  if (onPress) {
    return (
      <AppPressable {...wrapperProps} onPress={onPress}>
        {iconNode}
      </AppPressable>
    );
  }

  return <AppView {...wrapperProps}>{iconNode}</AppView>;
}
