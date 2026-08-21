import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import type { PhotoPickerOptions, PhotoPickerResult } from './types';

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

export function releaseMedia(uris: string[]) {
  return getNativeModule().releaseMedia(uris);
}

export function clearPickerCache() {
  return getNativeModule().clearPickerCache();
}
