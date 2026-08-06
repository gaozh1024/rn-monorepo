import { describe, expect, it, vi } from 'vitest';
import { commitPreviewSelection } from './commitPreviewSelection';
import type { PhotoAlbumItem } from '../types';

function createPhoto(overrides: Partial<PhotoAlbumItem> = {}): PhotoAlbumItem {
  return {
    id: 'photo-1',
    filename: 'photo.jpg',
    uri: 'file:///photo.jpg',
    mediaType: 'photo',
    width: 1200,
    height: 900,
    creationTime: 1,
    modificationTime: 2,
    duration: 0,
    ...overrides,
  };
}

describe('commitPreviewSelection', () => {
  it('clears preview before scheduling completion', () => {
    const setPreviewIndex = vi.fn();
    const onComplete = vi.fn();
    const schedule = vi.fn((callback: () => void) => callback());
    const photos = [createPhoto()];

    commitPreviewSelection(setPreviewIndex, onComplete, photos, schedule);

    expect(setPreviewIndex).toHaveBeenCalledWith(null);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(photos);
  });

  it('supports deferred completion scheduling', () => {
    const setPreviewIndex = vi.fn();
    const onComplete = vi.fn();
    let queuedCallback: (() => void) | undefined;

    const schedule = vi.fn((callback: () => void) => {
      queuedCallback = callback;
    });
    const photos = [createPhoto({ id: 'photo-2' })];

    commitPreviewSelection(setPreviewIndex, onComplete, photos, schedule);

    expect(onComplete).not.toHaveBeenCalled();
    expect(queuedCallback).toBeTypeOf('function');

    queuedCallback?.();

    expect(onComplete).toHaveBeenCalledWith(photos);
  });
});
