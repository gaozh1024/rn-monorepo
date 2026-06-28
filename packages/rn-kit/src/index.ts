// Utils
export * from '@/utils';

// Theme - 重命名冲突的类型
export type {
  Theme,
  ThemeConfig,
  ColorPalette as ThemeColorPalette,
  ColorToken,
  ShadowToken,
  TypographyToken,
  ThemeColorTokens,
} from '@/theme';
export { createTheme, ThemeProvider, useTheme, useThemeColors, getThemeColors } from '@/theme';

// Core
export * from '@/core';

// UI
export * from '@/ui';

// Navigation
export * from '@/navigation';

// Overlay (AppProvider + Global UI)
export * from '@/overlay';

// External Providers - 方便用户自定义包裹
export { SafeAreaProvider } from 'react-native-safe-area-context';
