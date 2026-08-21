import type { PhotoAlbumItem } from '../types';

type PhotoPickerCompleteCallback = (photos: PhotoAlbumItem[]) => void;

const callbackRegistry = new Map<string, PhotoPickerCompleteCallback>();

export function registerPhotoAlbumCompleteCallback(callback: PhotoPickerCompleteCallback): string {
  const callbackId = `photo-picker-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  callbackRegistry.set(callbackId, callback);
  return callbackId;
}

export function getPhotoAlbumCompleteCallback(callbackId?: string | null) {
  return callbackId ? callbackRegistry.get(callbackId) : undefined;
}

export function clearPhotoAlbumCompleteCallback(callbackId?: string | null) {
  if (callbackId) callbackRegistry.delete(callbackId);
}
