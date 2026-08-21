import { describe, expect, it } from 'vitest';
import { createCroppedPhotoAlbumItem, normalizeOpenOptions } from './photoPickerFlow';

describe('photo picker options', () => {
  it('defaults to mixed media multi-select with a maximum of nine items', () => {
    expect(normalizeOpenOptions()).toMatchObject({
      maxSelection: 9,
      mediaType: 'all',
      allowsMultipleSelection: true,
    });
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

  it('clamps native picker selection limits to its supported range', () => {
    expect(normalizeOpenOptions({ maxSelection: 1000 }).maxSelection).toBe(100);
    expect(normalizeOpenOptions({ maxSelection: 0 }).maxSelection).toBe(1);
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
