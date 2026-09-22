import type {
  PhotoAlbumOpenMediaType,
  PhotoPickerNativeError,
  PhotoPickerNativeErrorCode,
  PhotoPickerOptions,
} from '../types';

/**
 * JS-side option validation and normalization. Pure functions so the contracts
 * are unit-testable without a React Native runtime.
 */

export function createPickerError(
  code: PhotoPickerNativeErrorCode,
  message: string
): PhotoPickerNativeError {
  const error = new Error(message) as PhotoPickerNativeError;
  error.code = code;
  return error;
}

const MEDIA_TYPES: PhotoAlbumOpenMediaType[] = ['photo', 'video', 'all'];
const PREFERENCES = ['auto', 'system', 'gallery'] as const;
const DEFAULT_TABS = ['photos', 'albums'] as const;

export interface NormalizedNativeOptions {
  mediaType: PhotoAlbumOpenMediaType;
  maxSelection: number;
  allowsMultipleSelection: boolean;
  cacheMode: 'copy';
  android: { preference: 'auto' | 'system' | 'gallery'; allowDocumentFallback: boolean };
  nativeUi: {
    /** Accent color as an int (0xRRGGBB); omitted when dropped or absent. */
    accentColor?: number;
    defaultTab?: 'photos' | 'albums';
    orderedSelection?: boolean;
  };
}

export interface NormalizedPickerOptions {
  nativeOptions: NormalizedNativeOptions;
  /** nativeUi fields dropped by JS before reaching native (e.g. too-dark accent color). */
  jsIgnoredUiOptions: string[];
}

/**
 * WCAG relative luminance of an sRGB color; the platform picker requires
 * accent colors with luminance >= 0.5.
 */
export function accentColorLuminance(hex: string): number {
  const channels = [1, 3, 5].map(offset => {
    const raw = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return raw <= 0.03928 ? raw / 12.92 : Math.pow((raw + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function parseAccentColor(value?: string): { color?: number; ignored: boolean } {
  if (value === undefined) return { ignored: false };
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw createPickerError(
      'PICKER_INVALID_OPTIONS',
      `nativeUi.accentColor must be a "#RRGGBB" string, received: ${String(value)}`
    );
  }
  if (accentColorLuminance(value) < 0.5) {
    // Malformed input is a caller bug; a dark color is a supported request the
    // platform would reject, so drop it and record it as ignored instead.
    return { ignored: true };
  }
  return { color: parseInt(value.slice(1), 16), ignored: false };
}

/**
 * Validates and normalizes pickMedia / getCapabilities options. Throws
 * PICKER_INVALID_OPTIONS for malformed input before anything reaches native.
 */
export function validatePickerOptions(options: PhotoPickerOptions = {}): NormalizedPickerOptions {
  const { mediaType, maxSelection, allowsMultipleSelection, cacheMode } = options;

  if (mediaType !== undefined && !MEDIA_TYPES.includes(mediaType)) {
    throw createPickerError(
      'PICKER_INVALID_OPTIONS',
      `Unsupported mediaType: ${String(mediaType)}`
    );
  }
  if (maxSelection !== undefined) {
    if (!Number.isSafeInteger(maxSelection) || maxSelection < 1) {
      throw createPickerError(
        'PICKER_INVALID_OPTIONS',
        `maxSelection must be a positive safe integer, received: ${String(maxSelection)}`
      );
    }
  }
  if (cacheMode !== undefined && cacheMode !== 'copy') {
    throw createPickerError(
      'PICKER_INVALID_OPTIONS',
      `Unsupported cacheMode: ${String(cacheMode)}`
    );
  }

  const android = options.android ?? {};
  if (android.preference !== undefined && !PREFERENCES.includes(android.preference)) {
    throw createPickerError(
      'PICKER_INVALID_OPTIONS',
      `Unsupported android.preference: ${String(android.preference)}`
    );
  }

  const nativeUi = options.nativeUi ?? {};
  if (nativeUi.defaultTab !== undefined && !DEFAULT_TABS.includes(nativeUi.defaultTab)) {
    throw createPickerError(
      'PICKER_INVALID_OPTIONS',
      `Unsupported nativeUi.defaultTab: ${String(nativeUi.defaultTab)}`
    );
  }

  const jsIgnoredUiOptions: string[] = [];
  const accent = parseAccentColor(nativeUi.accentColor);
  if (accent.ignored) jsIgnoredUiOptions.push('accentColor');

  const nativeOptions: NormalizedNativeOptions = {
    mediaType: mediaType ?? 'all',
    maxSelection: maxSelection ?? 1,
    allowsMultipleSelection:
      allowsMultipleSelection ?? (maxSelection === undefined ? false : maxSelection > 1),
    cacheMode: cacheMode ?? 'copy',
    android: {
      preference: android.preference ?? 'auto',
      allowDocumentFallback: android.allowDocumentFallback ?? true,
    },
    nativeUi: {
      ...(accent.color !== undefined ? { accentColor: accent.color } : {}),
      ...(nativeUi.defaultTab !== undefined ? { defaultTab: nativeUi.defaultTab } : {}),
      ...(nativeUi.orderedSelection ? { orderedSelection: true } : {}),
    },
  };

  return { nativeOptions, jsIgnoredUiOptions };
}
