import { describe, expect, it } from 'vitest';
import type { PickerBackend, PhotoPickerNativeErrorCode, PhotoPickerResult } from '../types';
import { createCroppedPhotoAlbumItem, normalizeOpenOptions } from './photoPickerFlow';

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
    ];

    expect(errorCodes).toEqual([
      'PICKER_BUSY',
      'PICKER_LAUNCH_FAILED',
      'PICKER_SELECTION_LIMIT_UNSUPPORTED',
    ]);
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
