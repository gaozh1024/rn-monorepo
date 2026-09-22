import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Platform } from 'react-native';
import { nativeModuleRegistry } from './test/expoModulesCoreTestAlias';
import {
  clearPickerCache,
  getCapabilities,
  isPhotoPickerNativeError,
  pickMedia,
  releaseMedia,
} from './native';
import type { PickerCapabilities, PhotoPickerResult } from './types';

const nativeModule = {
  pickMedia: vi.fn(),
  getCapabilities: vi.fn(),
  releaseMedia: vi.fn(),
  clearPickerCache: vi.fn(),
};

const iosCapabilities: PickerCapabilities = {
  available: true,
  candidates: [
    {
      source: 'ios-phpicker',
      mediaTypes: ['photo', 'video', 'all'],
      multiple: 'supported',
      selectionLimit: 'native',
      maxSelection: null,
      orderedSelection: 'supported',
      nativeUi: { accentColor: false, defaultTab: false },
    },
  ],
  requestedMaxSelection: 3,
  effectiveMaxSelection: 3,
};

const iosCancelledResult: PhotoPickerResult = {
  cancelled: true,
  assets: [],
  source: 'ios-phpicker',
  action: 'PHPickerViewController',
  backend: {
    source: 'ios-phpicker',
    action: 'PHPickerViewController',
    selectionLimit: 'native',
    requestedMaxSelection: 1,
    effectiveMaxSelection: 1,
    orderedSelectionGuaranteed: false,
    appliedUiOptions: [],
    ignoredUiOptions: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  Platform.OS = 'android';
  nativeModuleRegistry.factory = () => nativeModule;
  nativeModule.releaseMedia.mockResolvedValue(undefined);
  nativeModule.clearPickerCache.mockResolvedValue(undefined);
});

describe('native module resolution', () => {
  it.each(['android', 'ios'] as const)('requires PhotoPickerModule on %s', platform => {
    Platform.OS = platform;

    void clearPickerCache();

    expect(nativeModule.clearPickerCache).toHaveBeenCalledTimes(1);
  });

  it('throws a platform-specific error on unsupported platforms', () => {
    Platform.OS = 'web';

    expect(() => pickMedia()).toThrowError(/Android and iOS/);
    expect(() => pickMedia()).toThrowError(/"web"/);
  });

  it('asks for an app rebuild when the native module is not linked', () => {
    nativeModuleRegistry.factory = () => {
      throw new Error('Cannot find native module');
    };

    expect(() => pickMedia()).toThrowError(/Rebuild the app after installing/);
  });
});

describe('pickMedia on iOS', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
  });

  it('forwards validated options to the native module', async () => {
    nativeModule.pickMedia.mockResolvedValue(iosCancelledResult);

    const result = await pickMedia({
      mediaType: 'video',
      maxSelection: 3,
      allowsMultipleSelection: true,
      nativeUi: { orderedSelection: true },
    });

    expect(nativeModule.pickMedia).toHaveBeenCalledWith({
      mediaType: 'video',
      maxSelection: 3,
      allowsMultipleSelection: true,
      cacheMode: 'copy',
      android: { preference: 'auto', allowDocumentFallback: true },
      nativeUi: { orderedSelection: true },
    });
    expect(result).toEqual(iosCancelledResult);
    expect(result.backend?.source).toBe('ios-phpicker');
  });

  it('merges JS-ignored UI options into the backend diagnostics', async () => {
    nativeModule.pickMedia.mockResolvedValue(iosCancelledResult);

    // #800000 is below the accent-color luminance floor, so JS drops it and
    // records it as ignored even before the native backend reports.
    const result = await pickMedia({ nativeUi: { accentColor: '#800000' } });

    expect(result.backend?.ignoredUiOptions).toEqual(['accentColor']);
  });

  it('rejects malformed options before any native call', () => {
    for (const maxSelection of [0, -1, 2.5, Number.NaN]) {
      expect(() => pickMedia({ maxSelection })).toThrowError(/maxSelection/);
    }
    expect(nativeModule.pickMedia).not.toHaveBeenCalled();
    try {
      pickMedia({ maxSelection: 0 });
    } catch (error) {
      expect(isPhotoPickerNativeError(error, 'PICKER_INVALID_OPTIONS')).toBe(true);
    }
  });
});

describe('getCapabilities', () => {
  it('returns the native capability snapshot on iOS', async () => {
    Platform.OS = 'ios';
    nativeModule.getCapabilities.mockResolvedValue(iosCapabilities);

    const capabilities = await getCapabilities({ mediaType: 'all', maxSelection: 3 });

    expect(nativeModule.getCapabilities).toHaveBeenCalledTimes(1);
    expect(capabilities.available).toBe(true);
    expect(capabilities.candidates.map(candidate => candidate.source)).toEqual(['ios-phpicker']);
    expect(capabilities.effectiveMaxSelection).toBe(3);
  });

  it('reports an honest unavailable snapshot on unsupported platforms', async () => {
    Platform.OS = 'windows';

    const capabilities = await getCapabilities({ maxSelection: 5 });

    expect(capabilities).toEqual({
      available: false,
      candidates: [],
      requestedMaxSelection: 5,
      effectiveMaxSelection: 5,
    });
    expect(nativeModule.getCapabilities).not.toHaveBeenCalled();
  });
});

describe('cache management', () => {
  it('forwards releaseMedia and clearPickerCache on iOS', async () => {
    Platform.OS = 'ios';
    const uris = ['file:///tmp/photo-picker/a/photo.jpg'];

    await releaseMedia(uris);
    await clearPickerCache();

    expect(nativeModule.releaseMedia).toHaveBeenCalledWith(uris);
    expect(nativeModule.clearPickerCache).toHaveBeenCalledTimes(1);
  });

  it('still forwards cache calls on Android', async () => {
    await releaseMedia(['file:///cache/photo-picker/b/video.mp4']);
    expect(nativeModule.releaseMedia).toHaveBeenCalledTimes(1);
  });
});

describe('isPhotoPickerNativeError', () => {
  it('discriminates native picker errors by code', () => {
    const busy = Object.assign(new Error('busy'), { code: 'PICKER_BUSY' });
    expect(isPhotoPickerNativeError(busy)).toBe(true);
    expect(isPhotoPickerNativeError(busy, 'PICKER_BUSY')).toBe(true);
    expect(isPhotoPickerNativeError(busy, 'PICKER_READ_FAILED')).toBe(false);
    expect(isPhotoPickerNativeError(new Error('plain'))).toBe(false);
    expect(isPhotoPickerNativeError({ code: 'SOME_OTHER_ERROR' })).toBe(false);
  });
});

describe('selection limit bounds', () => {
  it.each(['ios', 'android'] as const)(
    'rejects unsafe limits before native calls on %s',
    async platform => {
      Platform.OS = platform;
      for (const maxSelection of [1e20, Number.MAX_SAFE_INTEGER + 1, Infinity, -Infinity]) {
        expect(() => pickMedia({ maxSelection })).toThrowError(
          expect.objectContaining({ code: 'PICKER_INVALID_OPTIONS' })
        );
        await expect(getCapabilities({ maxSelection })).rejects.toMatchObject({
          code: 'PICKER_INVALID_OPTIONS',
        });
      }
      expect(nativeModule.pickMedia).not.toHaveBeenCalled();
      expect(nativeModule.getCapabilities).not.toHaveBeenCalled();
    }
  );
});
