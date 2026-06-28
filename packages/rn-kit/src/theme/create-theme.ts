import { generateColorPalette, type ColorPalette } from '@/utils';
import type { ColorToken } from './types';
import type { Theme, ThemeConfig } from './types';

const defaultSpacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
};

const defaultBorderRadius = {
  none: 0,
  sm: 2,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

const defaultRadii = {
  ...defaultBorderRadius,
  lg: 16,
  xl: 24,
};

const defaultShadows = {
  level1: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
};

const defaultTypography = {
  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  headlineSm: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  headlineLgMobile: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
};

// 默认颜色，用于导航等组件
const defaultColors = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#1f2937',
  border: '#e5e7eb',
  outline: '#6b7280',
  outlineVariant: '#d1d5db',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f8fafc',
  primaryFixed: '#ffedd5',
  primaryFixedDim: '#fed7aa',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
};

function resolveColor(token: ColorToken): ColorPalette {
  return typeof token === 'string' ? generateColorPalette(token) : token;
}

export function createTheme(config: ThemeConfig): Theme {
  const colors: Record<string, ColorPalette> = {};

  // 先生成默认颜色
  for (const [name, value] of Object.entries(defaultColors)) {
    colors[name] = resolveColor(value);
  }

  // 用户配置覆盖默认颜色
  for (const [name, token] of Object.entries(config.colors)) {
    colors[name] = resolveColor(token);
  }

  return {
    colors,
    spacing: config.spacing ?? defaultSpacing,
    borderRadius: config.borderRadius ?? config.radii ?? defaultBorderRadius,
    radii: config.radii ?? config.borderRadius ?? defaultRadii,
    shadows: { ...defaultShadows, ...config.shadows },
    typography: { ...defaultTypography, ...config.typography },
  };
}
