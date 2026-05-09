import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, adjustBrightness, generateColorPalette } from '../color';

describe('hexToRgb', () => {
  it('应该将hex转为RGB对象', () => {
    expect(hexToRgb('#FF5733')).toEqual({ r: 255, g: 87, b: 51 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe('rgbToHex', () => {
  it('应该将RGB对象转为hex', () => {
    expect(rgbToHex({ r: 255, g: 87, b: 51 })).toBe('#ff5733');
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
  });

  it('应该将小数通道规范化为有效hex', () => {
    expect(rgbToHex({ r: 37.8, g: 46.8, b: 59.4 })).toBe('#262f3b');
  });

  it('应该将越界通道限制到有效范围', () => {
    expect(rgbToHex({ r: -1, g: 300, b: 0 })).toBe('#00ff00');
  });
});

describe('adjustBrightness', () => {
  it('应该增加亮度', () => {
    const result = adjustBrightness({ r: 100, g: 100, b: 100 }, 0.5);
    expect(result.r).toBeGreaterThan(100);
    expect(result.g).toBeGreaterThan(100);
    expect(result.b).toBeGreaterThan(100);
  });

  it('应该降低亮度', () => {
    const result = adjustBrightness({ r: 100, g: 100, b: 100 }, -0.5);
    expect(result.r).toBeLessThan(100);
    expect(result.g).toBeLessThan(100);
    expect(result.b).toBeLessThan(100);
  });

  it('不应该超过255', () => {
    const result = adjustBrightness({ r: 255, g: 255, b: 255 }, 0.5);
    expect(result.r).toBe(255);
  });

  it('不应该低于0', () => {
    const result = adjustBrightness({ r: 0, g: 0, b: 0 }, -0.5);
    expect(result.r).toBe(0);
  });
});

describe('generateColorPalette', () => {
  it('应该生成完整的色阶', () => {
    const palette = generateColorPalette('#f38b32');
    expect(palette).toHaveProperty('0');
    expect(palette).toHaveProperty('50');
    expect(palette).toHaveProperty('100');
    expect(palette).toHaveProperty('200');
    expect(palette).toHaveProperty('300');
    expect(palette).toHaveProperty('400');
    expect(palette).toHaveProperty('500');
    expect(palette).toHaveProperty('600');
    expect(palette).toHaveProperty('700');
    expect(palette).toHaveProperty('800');
    expect(palette).toHaveProperty('900');
    expect(palette).toHaveProperty('950');
  });

  it('应该为小数亮度结果生成有效hex色阶', () => {
    const palette = generateColorPalette('#2a3442');

    expect(Object.values(palette).every(color => /^#[0-9a-f]{6}$/.test(color))).toBe(true);
    expect(palette[600]).not.toContain('.');
  });

  it('500应该是原色', () => {
    const palette = generateColorPalette('#f38b32');
    expect(palette[500]).toBe('#f38b32');
  });

  it('0应该比500亮', () => {
    const palette = generateColorPalette('#f38b32');
    const light = parseInt(palette[0].slice(1, 3), 16);
    const base = parseInt(palette[500].slice(1, 3), 16);
    expect(light).toBeGreaterThan(base);
  });

  it('950应该比500暗', () => {
    const palette = generateColorPalette('#f38b32');
    const dark = parseInt(palette[950].slice(1, 3), 16);
    const base = parseInt(palette[500].slice(1, 3), 16);
    expect(dark).toBeLessThan(base);
  });
});
