import { describe, expect, it } from 'vitest';
import type {
  PickerBackend,
  PickerSource,
  PhotoPickerNativeErrorCode,
  PhotoPickerResult,
} from '../types';
import { createCroppedPhotoAlbumItem, normalizeOpenOptions } from './photoPickerFlow';
import {
  accentColorLuminance,
  parseAccentColor,
  validatePickerOptions,
} from './pickerOptionsValidation';

describe('photo picker options', () => {
  it('defaults to mixed media multi-select with a maximum of nine items', () => {
    expect(normalizeOpenOptions()).toMatchObject({
      maxSelection: 9,
      mediaType: 'all',
      allowsMultipleSelection: true,
    });
  });

  it('keeps a positive integer selection limit without applying a package cap', () => {
    expect(normalizeOpenOptions({ maxSelection: 1000 }).maxSelection).toBe(1000);
    expect(normalizeOpenOptions({ maxSelection: 3.9 }).maxSelection).toBe(3);
    expect(normalizeOpenOptions({ maxSelection: 0 }).maxSelection).toBe(1);
    expect(normalizeOpenOptions({ maxSelection: -2 }).maxSelection).toBe(1);
  });

  it('forces crop flows to a single image', () => {
    expect(
      normalizeOpenOptions({
        mediaType: 'all',
        maxSelection: 9,
        allowsMultipleSelection: true,
        crop: { aspect: [1, 1] },
      })
    ).toMatchObject({
      maxSelection: 1,
      mediaType: 'photo',
      allowsMultipleSelection: false,
    });
  });

  it('forces explicitly single-select flows to one item', () => {
    expect(
      normalizeOpenOptions({
        mediaType: 'video',
        maxSelection: 9,
        allowsMultipleSelection: false,
      })
    ).toMatchObject({
      maxSelection: 1,
      mediaType: 'video',
      allowsMultipleSelection: false,
    });
  });

  it('passes split photo and video entries through the route normalization unchanged', () => {
    // Photo entry with one remaining slot: single-select, gallery preference.
    expect(
      normalizeOpenOptions({
        mediaType: 'photo',
        maxSelection: 1,
        allowsMultipleSelection: false,
        android: { preference: 'gallery', allowDocumentFallback: true },
      } as never)
    ).toMatchObject({
      mediaType: 'photo',
      maxSelection: 1,
      allowsMultipleSelection: false,
      android: { preference: 'gallery', allowDocumentFallback: true },
    });

    // Video entry with multiple remaining slots: multi-select request.
    expect(
      normalizeOpenOptions({
        mediaType: 'video',
        maxSelection: 3,
        allowsMultipleSelection: true,
        android: { preference: 'gallery' },
      } as never)
    ).toMatchObject({
      mediaType: 'video',
      maxSelection: 3,
      allowsMultipleSelection: true,
      android: { preference: 'gallery' },
    });
  });
});

describe('picker result contract', () => {
  it('represents cancellation with the backend that handled the request', () => {
    const backend: PickerBackend = {
      source: 'android-photo-picker',
      action: 'android.provider.action.PICK_IMAGES',
    };
    const result: PhotoPickerResult = {
      cancelled: true,
      assets: [],
      ...backend,
    };

    expect(result).toEqual({
      cancelled: true,
      assets: [],
      source: 'android-photo-picker',
      action: 'android.provider.action.PICK_IMAGES',
    });
  });

  it('keeps fallback diagnostics distinct from Photo Picker diagnostics', () => {
    const result: PhotoPickerResult = {
      cancelled: false,
      assets: [],
      source: 'android-open-document',
      action: 'android.intent.action.OPEN_DOCUMENT',
    };

    expect(result.source).toBe('android-open-document');
    expect(result.action).toBe('android.intent.action.OPEN_DOCUMENT');
  });

  it('keeps the documented native error codes as a closed TypeScript contract', () => {
    const errorCodes: PhotoPickerNativeErrorCode[] = [
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

    expect(errorCodes).toHaveLength(10);
  });
});

describe('picker option validation', () => {
  it('rejects non-integer, zero, and negative maxSelection before reaching native', () => {
    for (const maxSelection of [3.9, 0, -2, Number.NaN]) {
      expect(() => validatePickerOptions({ maxSelection })).toThrowError(/maxSelection/);
      try {
        validatePickerOptions({ maxSelection });
      } catch (error) {
        expect((error as { code?: string }).code).toBe('PICKER_INVALID_OPTIONS');
      }
    }
  });

  it('normalizes defaults for a plain pickMedia call', () => {
    const { nativeOptions, jsIgnoredUiOptions } = validatePickerOptions();
    expect(nativeOptions).toMatchObject({
      mediaType: 'all',
      maxSelection: 1,
      allowsMultipleSelection: false,
      cacheMode: 'copy',
      android: { preference: 'auto', allowDocumentFallback: true },
    });
    expect(nativeOptions.nativeUi.accentColor).toBeUndefined();
    expect(jsIgnoredUiOptions).toEqual([]);
  });

  it('rejects malformed accent colors and drops too-dark ones as ignored', () => {
    expect(() => parseAccentColor('red')).toThrowError(/accentColor/);
    expect(() => parseAccentColor('#12345')).toThrowError(/accentColor/);
    // Maroon (#800000) has luminance ~0.046, far below the 0.5 platform floor.
    expect(accentColorLuminance('#800000')).toBeLessThan(0.5);
    expect(parseAccentColor('#800000')).toEqual({ ignored: true });
    // Gold (#FFD700) passes the luminance floor.
    expect(accentColorLuminance('#FFD700')).toBeGreaterThanOrEqual(0.5);
    expect(parseAccentColor('#FFD700')).toEqual({ color: 0xffd700, ignored: false });
  });

  it('drops a dark accent color at the options level and records it as ignored', () => {
    const { nativeOptions, jsIgnoredUiOptions } = validatePickerOptions({
      nativeUi: { accentColor: '#800000', defaultTab: 'albums', orderedSelection: true },
    });
    expect(nativeOptions.nativeUi.accentColor).toBeUndefined();
    expect(nativeOptions.nativeUi.defaultTab).toBe('albums');
    expect(nativeOptions.nativeUi.orderedSelection).toBe(true);
    expect(jsIgnoredUiOptions).toEqual(['accentColor']);
  });

  it('rejects unknown preference, mediaType, cacheMode, and defaultTab values', () => {
    expect(() => validatePickerOptions({ android: { preference: 'kimi' as 'auto' } })).toThrowError(
      /preference/
    );
    expect(() => validatePickerOptions({ mediaType: 'file' as 'all' })).toThrowError(/mediaType/);
    expect(() => validatePickerOptions({ cacheMode: 'reference' as 'copy' })).toThrowError(
      /cacheMode/
    );
    expect(() => validatePickerOptions({ nativeUi: { defaultTab: 'albums' } })).not.toThrow();
    expect(() =>
      validatePickerOptions({ nativeUi: { defaultTab: 'grid' as 'photos' } })
    ).toThrowError(/defaultTab/);
  });

  it('keeps the new backend sources part of the PickerSource union', () => {
    const sources: PickerSource[] = [
      'android-photo-picker',
      'android-system-fallback',
      'android-vendor-gallery',
      'android-open-document',
      'ios-phpicker',
    ];
    expect(new Set(sources).size).toBe(5);
  });
});

describe('cropped media descriptors', () => {
  it('keeps upload metadata while replacing the file URI', () => {
    const result = createCroppedPhotoAlbumItem(
      {
        id: 'source',
        uri: 'file:///tmp/source.png',
        filename: 'source.png',
        mediaType: 'photo',
        mimeType: 'image/png',
        fileSize: 20,
        width: 100,
        height: 100,
      },
      {
        uri: 'file:///tmp/cropped.jpg',
        width: 80,
        height: 80,
      },
      { aspect: [1, 1] }
    );

    expect(result).toMatchObject({
      uri: 'file:///tmp/cropped.jpg',
      filename: 'source-cropped.jpg',
      mimeType: 'image/jpeg',
      width: 80,
      height: 80,
      edited: true,
    });
  });
});
