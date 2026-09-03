// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaTypeValue } from 'expo-media-library';

const mediaLibrary = vi.hoisted(() => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  presentPermissionsPickerAsync: vi.fn(),
  getAssetsAsync: vi.fn(),
  getAssetInfoAsync: vi.fn(),
}));

vi.mock('expo-media-library', () => ({
  ...mediaLibrary,
  PermissionStatus: {
    DENIED: 'denied',
    GRANTED: 'granted',
    UNDETERMINED: 'undetermined',
  },
}));

import { usePhotoAlbum } from './usePhotoAlbum';

const grantedLimitedPermission = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
  accessPrivileges: 'limited',
};

const deniedPermission = {
  status: 'denied',
  granted: false,
  canAskAgain: true,
  accessPrivileges: 'none',
};

const photoAsset = {
  id: 'photo-1',
  filename: 'photo.jpg',
  uri: 'file:///photo.jpg',
  mediaType: 'photo',
  width: 1200,
  height: 900,
  creationTime: 1,
  modificationTime: 2,
  duration: 0,
};

const videoAsset = {
  ...photoAsset,
  id: 'video-1',
  filename: 'video.mp4',
  uri: 'file:///video.mp4',
  mediaType: 'video',
  duration: 12,
};
const VIDEO_MEDIA_TYPES: MediaTypeValue[] = ['video'];

function assetPage(assets = [photoAsset]) {
  return {
    assets,
    endCursor: assets[assets.length - 1]?.id,
    hasNextPage: false,
    totalCount: assets.length,
  };
}

describe('usePhotoAlbum media access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mediaLibrary.getPermissionsAsync.mockResolvedValue(grantedLimitedPermission);
    mediaLibrary.getAssetsAsync.mockResolvedValue(assetPage());
    mediaLibrary.getAssetInfoAsync.mockResolvedValue({});
    mediaLibrary.requestPermissionsAsync.mockResolvedValue(grantedLimitedPermission);
    mediaLibrary.presentPermissionsPickerAsync.mockResolvedValue(undefined);
  });

  it('loads the system-approved media set for limited access', async () => {
    const { result } = renderHook(() => usePhotoAlbum({ initialLoadCount: 1 }));

    await waitFor(() => expect(result.current.photos).toEqual([photoAsset]));

    expect(result.current.accessPrivileges).toBe('limited');
    expect(mediaLibrary.getPermissionsAsync).toHaveBeenCalledWith(false, ['photo', 'video']);
    expect(mediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(1);
  });

  it('does not query assets when permission is denied', async () => {
    mediaLibrary.getPermissionsAsync.mockResolvedValue(deniedPermission);

    const { result } = renderHook(() => usePhotoAlbum());

    await waitFor(() => expect(result.current.permissionStatus).toBe('denied'));

    expect(result.current.accessPrivileges).toBe('none');
    expect(mediaLibrary.getAssetsAsync).not.toHaveBeenCalled();
  });

  it('uses only photo and video granular permissions when requesting access', async () => {
    mediaLibrary.getPermissionsAsync.mockResolvedValue(deniedPermission);

    const { result } = renderHook(() => usePhotoAlbum());

    await waitFor(() => expect(result.current.permissionStatus).toBe('denied'));
    await act(async () => {
      await result.current.requestPermission();
    });

    expect(mediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(false, ['photo', 'video']);
  });

  it('rechecks permission and refreshes after managing limited access', async () => {
    const { result } = renderHook(() => usePhotoAlbum({ initialLoadCount: 1 }));

    await waitFor(() => expect(result.current.photos).toEqual([photoAsset]));
    await act(async () => {
      await result.current.manageLimitedAccess();
    });

    expect(mediaLibrary.presentPermissionsPickerAsync).toHaveBeenCalledWith(['photo', 'video']);
    expect(mediaLibrary.getPermissionsAsync).toHaveBeenCalledTimes(2);
    expect(mediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(2);
  });

  it('keeps a recoverable error state when managing limited access fails', async () => {
    mediaLibrary.presentPermissionsPickerAsync.mockRejectedValue(new Error('picker unavailable'));

    const { result } = renderHook(() => usePhotoAlbum({ initialLoadCount: 1 }));

    await waitFor(() => expect(result.current.photos).toEqual([photoAsset]));
    await act(async () => {
      await result.current.manageLimitedAccess();
    });

    expect(result.current.error?.message).toBe('无法管理照片访问范围，请稍后重试');
    expect(mediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps the video item when its detail lookup fails', async () => {
    mediaLibrary.getAssetsAsync.mockResolvedValue(assetPage([videoAsset]));
    mediaLibrary.getAssetInfoAsync.mockRejectedValue(new Error('SecurityException'));

    const { result } = renderHook(() =>
      usePhotoAlbum({ initialLoadCount: 1, mediaType: VIDEO_MEDIA_TYPES })
    );

    await waitFor(() => expect(mediaLibrary.getAssetInfoAsync).toHaveBeenCalledWith('video-1'));
    expect(result.current.error).toBeNull();
    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0]).toEqual(videoAsset);

    expect(mediaLibrary.getAssetInfoAsync).toHaveBeenCalledWith('video-1');
    expect(result.current.error).toBeNull();
  });

  it('keeps the hook in a recoverable error state when permission inspection fails', async () => {
    mediaLibrary.getPermissionsAsync.mockRejectedValue(new Error('permission inspection failed'));

    const { result } = renderHook(() => usePhotoAlbum());

    await waitFor(() => expect(result.current.error?.message).toBe('permission inspection failed'));

    expect(mediaLibrary.getAssetsAsync).not.toHaveBeenCalled();
  });

  it('keeps the hook in a recoverable error state when media loading fails', async () => {
    mediaLibrary.getAssetsAsync.mockRejectedValue(new Error('SecurityException'));

    const { result } = renderHook(() => usePhotoAlbum());

    await waitFor(() => expect(result.current.error?.message).toBe('SecurityException'));

    expect(result.current.photos).toEqual([]);
  });
});
