import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import type {
  PhotoPickerNativeError,
  PhotoPickerNativeErrorCode,
  PhotoPickerOptions,
  PhotoPickerResult,
} from './types';

export type { PhotoPickerNativeError, PhotoPickerNativeErrorCode } from './types';

type PhotoPickerNativeModule = {
  pickMedia(options: PhotoPickerOptions): Promise<PhotoPickerResult>;
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

export function pickMedia(options: PhotoPickerOptions = {}): Promise<PhotoPickerResult> {
  return getNativeModule().pickMedia(options);
}

export function isPhotoPickerNativeError(
  error: unknown,
  code?: PhotoPickerNativeErrorCode
): error is PhotoPickerNativeError {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  const errorCode = (error as { code?: unknown }).code;
  return (
    (errorCode === 'PICKER_BUSY' ||
      errorCode === 'PICKER_LAUNCH_FAILED' ||
      errorCode === 'PICKER_SELECTION_LIMIT_UNSUPPORTED') &&
    (code === undefined || errorCode === code)
  );
}

export function releaseMedia(uris: string[]) {
  return getNativeModule().releaseMedia(uris);
}

export function clearPickerCache() {
  return getNativeModule().clearPickerCache();
}
