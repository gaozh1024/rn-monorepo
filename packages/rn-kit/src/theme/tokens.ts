import { useMemo } from 'react';
import { useOptionalTheme } from './provider';
import type { Theme } from './types';

export interface ThemeColorTokens {
  primary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  muted: string;
  primarySurface: string;
  background: string;
  card: string;
  cardElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  outline: string;
  outlineVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  primaryFixed: string;
  primaryFixedDim: string;
  divider: string;
  iconMuted: string;
}

export function getThemeColors(theme: Theme, isDark: boolean): ThemeColorTokens {
  return {
    primary: theme.colors.primary?.[500] || '#f38b32',
    success: theme.colors.success?.[500] || '#22c55e',
    warning: theme.colors.warning?.[500] || '#f59e0b',
    error: theme.colors.error?.[500] || '#ef4444',
    info: theme.colors.info?.[500] || theme.colors.secondary?.[500] || '#3b82f6',
    muted: isDark ? '#9ca3af' : '#6b7280',
    primarySurface: isDark
      ? theme.colors.primary?.[900] || '#7c2d12'
      : theme.colors.primary?.[50] || '#fff7ed',
    background: theme.colors.background?.[500] || (isDark ? '#0a0a0a' : '#ffffff'),
    card: theme.colors.card?.[500] || (isDark ? '#1f2937' : '#ffffff'),
    cardElevated:
      (isDark ? theme.colors.card?.[800] || theme.colors.card?.[700] : theme.colors.card?.[500]) ||
      (isDark ? '#1f2937' : '#ffffff'),
    text: theme.colors.text?.[500] || (isDark ? '#ffffff' : '#1f2937'),
    textSecondary: isDark ? '#d1d5db' : '#374151',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    textInverse: '#ffffff',
    border: isDark
      ? theme.colors.border?.[600] || theme.colors.border?.[500] || '#4b5563'
      : theme.colors.border?.[500] || '#d1d5db',
    outline: theme.colors.outline?.[500] || (isDark ? '#9ca3af' : '#6b7280'),
    outlineVariant: theme.colors.outlineVariant?.[500] || (isDark ? '#4b5563' : '#d1d5db'),
    surfaceContainerLowest:
      theme.colors.surfaceContainerLowest?.[500] || (isDark ? '#111827' : '#ffffff'),
    surfaceContainerLow:
      theme.colors.surfaceContainerLow?.[500] || (isDark ? '#1f2937' : '#f8fafc'),
    primaryFixed: theme.colors.primaryFixed?.[500] || (isDark ? '#7c2d12' : '#ffedd5'),
    primaryFixedDim: theme.colors.primaryFixedDim?.[500] || (isDark ? '#9a3412' : '#fed7aa'),
    divider: isDark
      ? theme.colors.border?.[700] || theme.colors.border?.[500] || '#374151'
      : theme.colors.border?.[500] || '#e5e7eb',
    iconMuted: isDark ? '#9ca3af' : '#6b7280',
  };
}

export function useThemeColors(): ThemeColorTokens {
  const { theme, isDark } = useOptionalTheme();

  return useMemo(() => getThemeColors(theme, isDark), [theme, isDark]);
}
