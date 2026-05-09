import React, { createContext, useCallback, useContext, useState, useMemo } from 'react';
import type { Theme, ThemeConfig } from './types';
import { createTheme } from './create-theme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const fallbackTheme = createTheme({
  colors: {
    primary: '#f38b32',
    secondary: '#3b82f6',
    background: '#ffffff',
    card: '#ffffff',
    text: '#1f2937',
    border: '#e5e7eb',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  light: ThemeConfig;
  dark?: ThemeConfig;
  defaultDark?: boolean;
  /**
   * 受控暗色模式。
   * 传入后会以该值为准，不再依赖内部 state。
   */
  isDark?: boolean;
  /**
   * 主题切换回调。
   * 受控/非受控模式下都会在 toggleTheme 时触发。
   */
  onThemeChange?: (isDark: boolean) => void;
}

export function ThemeProvider({
  children,
  light,
  dark,
  defaultDark = false,
  isDark: controlledIsDark,
  onThemeChange,
}: ThemeProviderProps) {
  const [internalIsDark, setInternalIsDark] = useState(defaultDark);
  const isDark = controlledIsDark ?? internalIsDark;
  const theme = useMemo(() => {
    const config = isDark && dark ? dark : light;
    return createTheme(config);
  }, [isDark, light, dark]);

  const toggleTheme = useCallback(() => {
    const nextIsDark = !isDark;
    if (controlledIsDark === undefined) {
      setInternalIsDark(nextIsDark);
    }
    onThemeChange?.(nextIsDark);
  }, [controlledIsDark, isDark, onThemeChange]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({ theme, isDark, toggleTheme }),
    [isDark, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

export function useOptionalTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  return (
    context || {
      theme: fallbackTheme,
      isDark: false,
      toggleTheme: () => {},
    }
  );
}
