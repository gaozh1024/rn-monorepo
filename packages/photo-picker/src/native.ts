import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import type {
  PhotoPickerNativeError,
  PhotoPickerNativeErrorCode,
  PhotoPickerOptions,
  PickerCapabilities,
  PhotoPickerResult,
} from './types';
import { validatePickerOptions } from './utils/pickerOptionsValidation';

export type { PhotoPickerNativeError, PhotoPickerNativeErrorCode } from './types';

const NATIVE_ERROR_CODES: PhotoPickerNativeErrorCode[] = [
  'PICKER_BUSY',
  'PICKER_LAUNCH_FAILED',
  'PICKER_SELECTION_LIMIT_UNSUPPORTED',
  'PICKER_INVALID_OPTIONS',
  'PICKER_UNAVAILABLE',
  'PICKER_SELECTION_LIMIT_EXCEEDED',
  'PICKER_UNSUPPORTED_MEDIA',
  'PICKER_READ_FAILED',
  'PICKER_CACHE_FAILED',
  'PICKER_INTERRUPTED',
];

type PhotoPickerNativeModule = {
  pickMedia(options: object): Promise<PhotoPickerResult>;
  getCapabilities(options: object): Promise<PickerCapabilities>;
  releaseMedia(uris: string[]): Promise<void>;
  clearPickerCache(): Promise<void>;
};

function getNativeModule(): PhotoPickerNativeModule {
  if (Platform.OS !== 'android') {
    throw new Error(
      '@gaozh1024/photo-picker currently provides the native system picker on Android only.'
    );
  }

  try {
    return requireNativeModule<PhotoPickerNativeModule>('PhotoPickerModule');
  } catch {
    throw new Error(
      'PhotoPickerModule is unavailable. Rebuild the Android app after installing @gaozh1024/photo-picker.'
    );
  }
}

/**
 * Opens a media picker. Options are validated on the JS side first; malformed
 * input rejects with `code: 'PICKER_INVALID_OPTIONS'` before any native call.
 */
export function pickMedia(options: PhotoPickerOptions = {}): Promise<PhotoPickerResult> {
  const { nativeOptions, jsIgnoredUiOptions } = validatePickerOptions(options);
  return getNativeModule()
    .pickMedia(nativeOptions)
    .then(result => {
      if (result.backend && jsIgnoredUiOptions.length > 0) {
        return {
          ...result,
          backend: {
            ...result.backend,
            ignoredUiOptions: [...result.backend.ignoredUiOptions, ...jsIgnoredUiOptions],
          },
        };
      }
      return result;
    });
}

/**
 * Point-in-time capability probe. Never opens UI, never reads media, and never
 * requests permissions. The snapshot cannot guarantee that the next launch
 * will succeed; handle launch errors as usual.
 */
export async function getCapabilities(
  options: PhotoPickerOptions = {}
): Promise<PickerCapabilities> {
  const { nativeOptions } = validatePickerOptions(options);
  if (Platform.OS !== 'android') {
    // No backend is implemented on this platform yet; report that honestly
    // instead of throwing so callers can branch on `available`.
    return {
      available: false,
      candidates: [],
      requestedMaxSelection: nativeOptions.maxSelection,
      effectiveMaxSelection: nativeOptions.maxSelection,
    };
  }
  return getNativeModule().getCapabilities(nativeOptions);
}

export function isPhotoPickerNativeError(
  error: unknown,
  code?: PhotoPickerNativeErrorCode
): error is PhotoPickerNativeError {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  const errorCode = (error as { code?: unknown }).code;
  return (
    NATIVE_ERROR_CODES.includes(errorCode as PhotoPickerNativeErrorCode) &&
    (code === undefined || errorCode === code)
  );
}

export function releaseMedia(uris: string[]) {
  return getNativeModule().releaseMedia(uris);
}

export function clearPickerCache() {
  return getNativeModule().clearPickerCache();
}
