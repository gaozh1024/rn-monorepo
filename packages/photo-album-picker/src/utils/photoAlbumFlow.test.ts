import { describe, expect, it, vi } from 'vitest';
import {
  createCroppedPhotoAlbumItem,
  DEFAULT_PHOTO_ALBUM_MEDIA_TYPES,
  DEFAULT_PHOTO_ALBUM_OPEN_OPTIONS,
  DEFAULT_PHOTO_ALBUM_PERMISSION_CONFIG,
  DEFAULT_PHOTO_ALBUM_UI_TEXTS,
  DEFAULT_PHOTO_ALBUM_UI_THEME,
  formatPhotoAlbumText,
  normalizeOpenOptions,
  resolvePhotoAlbumUiConfig,
  resolveMediaTypes,
} from './photoAlbumFlow';
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

describe('photoAlbumFlow', () => {
  describe('resolveMediaTypes', () => {
    it('keeps each resolved media type array stable across renders', () => {
      expect(resolveMediaTypes('photo')).toBe(resolveMediaTypes('photo'));
      expect(resolveMediaTypes('video')).toBe(resolveMediaTypes('video'));
      expect(resolveMediaTypes('all')).toBe(resolveMediaTypes('all'));
    });

    it('returns photo-only media type', () => {
      expect(resolveMediaTypes('photo')).toEqual(['photo']);
    });

    it('returns video-only media type', () => {
      expect(resolveMediaTypes('video')).toEqual(['video']);
    });

    it('returns default media types for all', () => {
      expect(resolveMediaTypes('all')).toEqual(DEFAULT_PHOTO_ALBUM_MEDIA_TYPES);
    });
  });

  describe('normalizeOpenOptions', () => {
    it('uses package defaults when no options are provided', () => {
      expect(normalizeOpenOptions()).toEqual({
        ...DEFAULT_PHOTO_ALBUM_OPEN_OPTIONS,
        allowsMultipleSelection: true,
      });
    });

    it('merges legacy options when new options are absent', () => {
      expect(
        normalizeOpenOptions(undefined, {
          maxSelection: 3,
          allowsMultipleSelection: true,
          mediaTypes: ['video'],
        })
      ).toEqual({
        maxSelection: 3,
        allowsMultipleSelection: true,
        mediaType: 'video',
      });
    });

    it('prefers new options over legacy fields', () => {
      expect(
        normalizeOpenOptions(
          {
            maxSelection: 2,
            mediaType: 'photo',
            allowsMultipleSelection: false,
          },
          {
            maxSelection: 9,
            allowsMultipleSelection: true,
            mediaTypes: ['photo', 'video'],
          }
        )
      ).toEqual({
        maxSelection: 2,
        mediaType: 'photo',
        allowsMultipleSelection: false,
      });
    });

    it('forces single photo selection when crop is enabled', () => {
      expect(
        normalizeOpenOptions({
          maxSelection: 9,
          mediaType: 'all',
          allowsMultipleSelection: true,
          crop: {
            aspect: [1, 1],
            shape: 'circle',
            quality: 0.8,
          },
        })
      ).toEqual({
        maxSelection: 1,
        mediaType: 'photo',
        allowsMultipleSelection: false,
        crop: {
          aspect: [1, 1],
          shape: 'circle',
          quality: 0.8,
        },
      });
    });

    it('derives allowsMultipleSelection from maxSelection when omitted', () => {
      expect(normalizeOpenOptions({ maxSelection: 1 })).toEqual({
        maxSelection: 1,
        mediaType: 'all',
        allowsMultipleSelection: false,
      });

      expect(normalizeOpenOptions({ maxSelection: 5 })).toEqual({
        maxSelection: 5,
        mediaType: 'all',
        allowsMultipleSelection: true,
      });
    });

    it('keeps uiConfig on normalized options', () => {
      expect(
        normalizeOpenOptions({
          uiConfig: {
            texts: {
              albumTitle: 'Album',
            },
            theme: {
              permissionButtonBackgroundColor: '#ff4d4f',
              permissionSettingsButtonBackgroundColor: '#2563eb',
            },
            permission: {
              openSettingsMode: 'direct',
            },
          },
        })
      ).toEqual({
        maxSelection: 9,
        mediaType: 'all',
        allowsMultipleSelection: true,
        uiConfig: {
          texts: {
            albumTitle: 'Album',
          },
          theme: {
            permissionButtonBackgroundColor: '#ff4d4f',
            permissionSettingsButtonBackgroundColor: '#2563eb',
          },
          permission: {
            openSettingsMode: 'direct',
          },
        },
      });
    });
  });

  describe('resolvePhotoAlbumUiConfig', () => {
    it('returns Chinese defaults when no config is provided', () => {
      expect(resolvePhotoAlbumUiConfig()).toEqual({
        texts: DEFAULT_PHOTO_ALBUM_UI_TEXTS,
        theme: DEFAULT_PHOTO_ALBUM_UI_THEME,
        permission: DEFAULT_PHOTO_ALBUM_PERMISSION_CONFIG,
      });
    });

    it('merges custom texts, theme and permission config over defaults', () => {
      expect(
        resolvePhotoAlbumUiConfig({
          texts: {
            albumTitle: 'Album',
            completeButton: 'Done',
            permissionOpenSettingsButton: 'Open Settings',
          },
          theme: {
            permissionButtonBackgroundColor: '#1677ff',
            permissionSettingsButtonBackgroundColor: '#f97316',
            completeButtonBackgroundColor: '#111827',
            completeButtonTextColor: '#fef3c7',
          },
          permission: {
            openSettingsMode: 'disabled',
          },
        })
      ).toEqual({
        texts: {
          ...DEFAULT_PHOTO_ALBUM_UI_TEXTS,
          albumTitle: 'Album',
          completeButton: 'Done',
          permissionOpenSettingsButton: 'Open Settings',
        },
        theme: {
          ...DEFAULT_PHOTO_ALBUM_UI_THEME,
          permissionButtonBackgroundColor: '#1677ff',
          permissionSettingsButtonBackgroundColor: '#f97316',
          completeButtonBackgroundColor: '#111827',
          completeButtonTextColor: '#fef3c7',
        },
        permission: {
          ...DEFAULT_PHOTO_ALBUM_PERMISSION_CONFIG,
          openSettingsMode: 'disabled',
        },
      });
    });
  });

  describe('formatPhotoAlbumText', () => {
    it('replaces placeholders with runtime values', () => {
      expect(
        formatPhotoAlbumText('Selected {count} / {total}', {
          count: 2,
          total: 9,
        })
      ).toBe('Selected 2 / 9');
    });

    it('falls back to empty string for missing placeholders', () => {
      expect(formatPhotoAlbumText('Video {duration}', {})).toBe('Video ');
    });
  });

  describe('createCroppedPhotoAlbumItem', () => {
    it('marks the photo as edited and updates crop metadata', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(123456789);

      try {
        const original = createPhoto({
          id: 'photo-2',
          width: 1920,
          height: 1080,
          modificationTime: 10,
        });

        const cropped = createCroppedPhotoAlbumItem(
          original,
          {
            uri: 'file:///cropped.jpg',
            width: 800,
            height: 800,
          },
          {
            aspect: [1, 1],
            shape: 'rect',
            quality: 1,
          }
        );

        expect(cropped).toEqual({
          ...original,
          uri: 'file:///cropped.jpg',
          width: 800,
          height: 800,
          modificationTime: 123456789,
          edited: true,
          crop: {
            aspect: [1, 1],
            shape: 'rect',
            quality: 1,
            width: 800,
            height: 800,
          },
        });
      } finally {
        nowSpy.mockRestore();
      }
    });

    it('keeps crop undefined when crop options are absent', () => {
      const original = createPhoto();
      const cropped = createCroppedPhotoAlbumItem(original, {
        uri: 'file:///cropped.jpg',
        width: 600,
        height: 400,
      });

      expect(cropped.crop).toBeUndefined();
      expect(cropped.edited).toBe(true);
      expect(cropped.uri).toBe('file:///cropped.jpg');
    });
  });
});
