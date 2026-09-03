import type { GranularPermission, PermissionResponse } from 'expo-media-library';

export type PhotoAlbumAccessPrivileges = NonNullable<PermissionResponse['accessPrivileges']>;

type MediaAccessPermissionResponse = Pick<PermissionResponse, 'accessPrivileges' | 'granted'>;

export const MEDIA_PERMISSION_TYPES: GranularPermission[] = ['photo', 'video'];

export function resolveMediaAccessPrivileges(
  response: MediaAccessPermissionResponse
): PhotoAlbumAccessPrivileges {
  if (!response.granted) return 'none';
  return response.accessPrivileges ?? 'all';
}

export function hasMediaAccess(response: MediaAccessPermissionResponse): boolean {
  return resolveMediaAccessPrivileges(response) !== 'none';
}
