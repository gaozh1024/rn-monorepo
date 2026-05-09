/**
 * RGB 颜色对象
 */
export interface RgbObject {
  /** 红色通道值 (0-255) */
  r: number;
  /** 绿色通道值 (0-255) */
  g: number;
  /** 蓝色通道值 (0-255) */
  b: number;
}

/**
 * 调色板对象，包含从 0 到 950 的色阶
 * 兼容 Record<string, string> 类型
 */
export interface ColorPalette {
  /** 最亮色 */
  0: string;
  /** 50 色阶 */
  50: string;
  /** 100 色阶 */
  100: string;
  /** 200 色阶 */
  200: string;
  /** 300 色阶 */
  300: string;
  /** 400 色阶 */
  400: string;
  /** 500 色阶（基准色） */
  500: string;
  /** 600 色阶 */
  600: string;
  /** 700 色阶 */
  700: string;
  /** 800 色阶 */
  800: string;
  /** 900 色阶 */
  900: string;
  /** 最暗色 */
  950: string;
  /** 索引签名，兼容 Record<string, string> */
  [key: string]: string;
}

/**
 * 将十六进制颜色转换为 RGB 对象
 *
 * @param hex - 十六进制颜色字符串（如 '#FF5733' 或 'FF5733'）
 * @returns RGB 颜色对象
 * @example
 * ```ts
 * hexToRgb('#FF5733')
 * // => { r: 255, g: 87, b: 51 }
 * ```
 */
export function hexToRgb(hex: string): RgbObject {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/**
 * 将 RGB 对象转换为十六进制颜色字符串
 *
 * @param rgb - RGB 颜色对象
 * @returns 十六进制颜色字符串（如 '#FF5733'）
 * @example
 * ```ts
 * rgbToHex({ r: 255, g: 87, b: 51 })
 * // => '#ff5733'
 * ```
 */
export function rgbToHex(rgb: RgbObject): string {
  const normalizeChannel = (channel: number) => Math.round(Math.max(0, Math.min(255, channel)));
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map(channel => normalizeChannel(channel).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * 调整 RGB 颜色的亮度
 *
 * @param rgb - RGB 颜色对象
 * @param factor - 亮度调整因子，正数变亮，负数变暗，范围建议在 -1 到 1 之间
 * @returns 调整后的 RGB 颜色对象
 * @example
 * ```ts
 * adjustBrightness({ r: 128, g: 128, b: 128 }, 0.5)
 * // => { r: 191, g: 191, b: 191 }
 *
 * adjustBrightness({ r: 128, g: 128, b: 128 }, -0.5)
 * // => { r: 64, g: 64, b: 64 }
 * ```
 */
export function adjustBrightness(rgb: RgbObject, factor: number): RgbObject {
  const adjust = (c: number) =>
    Math.max(0, Math.min(255, c + (factor > 0 ? (255 - c) * factor : c * factor)));
  return { r: adjust(rgb.r), g: adjust(rgb.g), b: adjust(rgb.b) };
}

/**
 * 基于基准色生成完整的调色板
 *
 * 生成包含 12 个色阶（0-950）的调色板，其中 500 为基准色
 *
 * @param baseHex - 基准十六进制颜色字符串
 * @returns 完整的调色板对象
 * @example
 * ```ts
 * generateColorPalette('#3B82F6')
 * // => {
 * //   0: '#e6f0fe',
 * //   50: '#dbeafe',
 * //   100: '#bfdbfe',
 * //   ...
 * //   500: '#3b82f6',
 * //   ...
 * //   950: '#172554'
 * // }
 * ```
 */
export function generateColorPalette(baseHex: string): ColorPalette {
  const rgb = hexToRgb(baseHex);
  const factors: Record<number, number> = {
    0: 0.95,
    50: 0.9,
    100: 0.75,
    200: 0.5,
    300: 0.3,
    400: 0.1,
    500: 0,
    600: -0.1,
    700: -0.25,
    800: -0.4,
    900: -0.55,
    950: -0.7,
  };
  const result = {} as ColorPalette;
  for (const [level, factor] of Object.entries(factors)) {
    result[parseInt(level) as keyof ColorPalette] = rgbToHex(adjustBrightness(rgb, factor));
  }
  return result;
}
