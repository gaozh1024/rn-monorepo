import { describe, expect, it } from 'vitest';
import { createTheme } from '../create-theme';
import { getThemeColors } from '../tokens';

describe('getThemeColors', () => {
  it('应该返回亮色主题语义色值', () => {
    const theme = createTheme({
      colors: {
        primary: '#f38b32',
        background: '#ffffff',
        card: '#ffffff',
        text: '#171717',
        border: '#e5e7eb',
      },
    });

    const colors = getThemeColors(theme, false);

    expect(colors.primary).toBe(theme.colors.primary?.[500]);
    expect(colors.success).toBe('#22c55e');
    expect(colors.warning).toBe('#f59e0b');
    expect(colors.error).toBe('#ef4444');
    expect(colors.info).toBe('#3b82f6');
    expect(colors.muted).toBe('#6b7280');
    expect(colors.background).toBe(theme.colors.background?.[500]);
    expect(colors.card).toBe(theme.colors.card?.[500]);
    expect(colors.text).toBe(theme.colors.text?.[500]);
    expect(colors.outline).toBe(theme.colors.outline?.[500]);
    expect(colors.outlineVariant).toBe(theme.colors.outlineVariant?.[500]);
    expect(colors.surfaceContainerLowest).toBe(theme.colors.surfaceContainerLowest?.[500]);
    expect(colors.surfaceContainerLow).toBe(theme.colors.surfaceContainerLow?.[500]);
    expect(colors.primaryFixed).toBe(theme.colors.primaryFixed?.[500]);
    expect(colors.primaryFixedDim).toBe(theme.colors.primaryFixedDim?.[500]);
    expect(colors.divider).toBe(theme.colors.border?.[500]);
  });

  it('应该返回暗色主题语义色值', () => {
    const theme = createTheme({
      colors: {
        primary: '#f38b32',
        background: '#0a0a0a',
        card: '#1f2937',
        text: '#ffffff',
        border: '#404040',
      },
    });

    const colors = getThemeColors(theme, true);

    expect(colors.text).toBe(theme.colors.text?.[500]);
    expect(colors.card).toBe(theme.colors.card?.[500]);
    expect(colors.success).toBe('#22c55e');
    expect(colors.warning).toBe('#f59e0b');
    expect(colors.error).toBe('#ef4444');
    expect(colors.info).toBe('#3b82f6');
    expect(colors.muted).toBe('#9ca3af');
    expect(colors.primarySurface).toBe(theme.colors.primary?.[900]);
    expect(colors.divider).toBe(theme.colors.border?.[700] || theme.colors.border?.[500]);
  });
});
