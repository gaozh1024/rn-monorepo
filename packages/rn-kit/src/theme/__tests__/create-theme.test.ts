import { describe, it, expect } from 'vitest';
import { createTheme } from '../create-theme';
import type { ColorPalette } from '../types';

describe('createTheme', () => {
  it('应该从hex字符串生成主题', () => {
    const theme = createTheme({
      colors: {
        primary: '#f38b32',
      },
    });
    expect(theme.colors.primary).toBeDefined();
    expect(theme.colors.primary[500]).toBe('#f38b32');
  });

  it('应该从hex字符串生成有效hex色阶', () => {
    const theme = createTheme({
      colors: {
        primary: '#2a3442',
      },
    });

    expect(Object.values(theme.colors.primary).every(color => /^#[0-9a-f]{6}$/.test(color))).toBe(
      true
    );
    expect(theme.colors.primary[600]).not.toContain('.');
  });

  it('应该接受完整色阶配置', () => {
    const customPalette: ColorPalette = {
      0: '#fff',
      50: '#f0f0f0',
      100: '#e0e0e0',
      200: '#c0c0c0',
      300: '#a0a0a0',
      400: '#808080',
      500: '#606060',
      600: '#404040',
      700: '#303030',
      800: '#202020',
      900: '#101010',
      950: '#000',
    };
    const theme = createTheme({
      colors: {
        custom: customPalette,
      },
    });
    expect(theme.colors.custom).toEqual(customPalette);
  });

  it('应该使用默认间距', () => {
    const theme = createTheme({ colors: {} });
    expect(theme.spacing[0]).toBe(0);
    expect(theme.spacing[4]).toBe(16);
  });

  it('应该使用自定义间距', () => {
    const theme = createTheme({
      colors: {},
      spacing: { sm: 8, md: 16, lg: 24 },
    });
    expect(theme.spacing.sm).toBe(8);
    expect(theme.spacing.md).toBe(16);
  });

  it('应该使用默认圆角', () => {
    const theme = createTheme({ colors: {} });
    expect(theme.borderRadius.none).toBe(0);
    expect(theme.borderRadius.full).toBe(9999);
  });

  it('应该支持多颜色', () => {
    const theme = createTheme({
      colors: {
        primary: '#f38b32',
        secondary: '#4A5568',
        success: '#52C41A',
      },
    });
    expect(theme.colors.primary[500]).toBe('#f38b32');
    expect(theme.colors.secondary[500]).toBe('#4a5568');
    expect(theme.colors.success[500]).toBe('#52c41a');
  });

  it('应该生成不同亮度的色阶', () => {
    const theme = createTheme({
      colors: { primary: '#808080' },
    });
    const palette = theme.colors.primary;

    // 0应该最亮
    const brightness0 = parseInt(palette[0].slice(1, 3), 16);
    // 950应该最暗
    const brightness950 = parseInt(palette[950].slice(1, 3), 16);

    expect(brightness0).toBeGreaterThan(brightness950);
  });
});
