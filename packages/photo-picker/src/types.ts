import type React from 'react';

export type PhotoAlbumMediaType = 'photo' | 'video';
export type PhotoAlbumOpenMediaType = PhotoAlbumMediaType | 'all';
export type PickerSource = 'android-photo-picker' | 'android-open-document';

export interface PickerBackend {
  source: PickerSource;
  action: string;
}

export type PhotoPickerNativeErrorCode =
  | 'PICKER_BUSY'
  | 'PICKER_LAUNCH_FAILED'
  | 'PICKER_SELECTION_LIMIT_UNSUPPORTED';

export interface PhotoPickerNativeError extends Error {
  code: PhotoPickerNativeErrorCode;
}

export interface PhotoAlbumCropOptions {
  aspect?: [number, number];
  shape?: 'rect' | 'circle';
  quality?: number;
}

export interface PickerMetadata {
  capturedAt?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  cameraMake?: string;
  cameraModel?: string;
  exifOrientation?: number;
}

/**
 * A media descriptor owned by this package. It deliberately does not extend
 * expo-media-library Asset so callers never need broad media-library access.
 */
export interface PhotoAlbumItem {
  id: string;
  uri: string;
  originalUri?: string;
  localUri?: string;
  filename?: string;
  fileName?: string;
  mediaType: PhotoAlbumMediaType;
  mimeType?: string | null;
  fileSize?: number;
  width: number;
  height: number;
  /** Seconds, retained for compatibility with the old package. */
  duration?: number;
  /** Milliseconds, preferred by new code. */
  durationMs?: number;
  source?: PickerSource;
  metadata?: PickerMetadata;
  selected?: boolean;
  selectedIndex?: number;
  edited?: boolean;
  crop?: PhotoAlbumCropOptions & { width: number; height: number };
}

export interface PhotoAlbumOpenOptions {
  maxSelection?: number;
  mediaType?: PhotoAlbumOpenMediaType;
  allowsMultipleSelection?: boolean;
  maxVideoDuration?: number;
  quality?: number;
  crop?: PhotoAlbumCropOptions;
  uiConfig?: PhotoAlbumUiConfig;
}

export interface PhotoPickerOptions {
  mediaType?: PhotoAlbumOpenMediaType;
  maxSelection?: number;
  allowsMultipleSelection?: boolean;
  cacheMode?: 'copy';
}

export interface PhotoPickerResult {
  cancelled: boolean;
  assets: PhotoAlbumItem[];
  source?: PickerSource;
  action?: string;
}

export interface PhotoAlbumUiTexts {
  albumTitle?: string;
  cropTitle?: string;
  cropConfirmButton?: string;
  cropSavingButton?: string;
  cropCircleHint?: string;
  cropRectHint?: string;
  cropMissingPhoto?: string;
  durationLimitAlertTitle?: string;
  durationLimitAlertMessage?: string;
  openAlbumError?: string;
  permissionAllowButton?: string;
  permissionOpenSettingsButton?: string;
  permissionSettingsAlertTitle?: string;
  permissionSettingsAlertMessage?: string;
  permissionSettingsAlertCancelButton?: string;
  permissionSettingsAlertConfirmButton?: string;
}

export interface PhotoAlbumUiTheme {
  permissionButtonBackgroundColor?: string;
  permissionButtonTextColor?: string;
  permissionSettingsButtonBackgroundColor?: string;
  permissionSettingsButtonTextColor?: string;
}

export interface PhotoAlbumUiConfig {
  texts?: PhotoAlbumUiTexts;
  theme?: PhotoAlbumUiTheme;
  /** Retained as a no-op compatibility shape. The system picker requests no media permission. */
  permission?: { openSettingsMode?: 'confirm' | 'direct' | 'disabled' };
}

export interface MediaPickerRouteNames {
  photoAlbum: string;
  photoCrop: string;
}

export interface PhotoAlbumRouteParams {
  callbackId?: string;
  options?: PhotoAlbumOpenOptions;
  maxSelection?: number;
  allowsMultipleSelection?: boolean;
  mediaTypes?: PhotoAlbumMediaType[];
  routeNames?: Partial<MediaPickerRouteNames>;
  uiConfig?: PhotoAlbumUiConfig;
}

export interface PhotoCropRouteParams {
  photo?: PhotoAlbumItem;
  crop?: PhotoAlbumCropOptions;
  quality?: number;
  callbackId?: string;
  routeNames?: Partial<MediaPickerRouteNames>;
  uiConfig?: PhotoAlbumUiConfig;
}

export interface PhotoAlbumScreenProps {
  route?: { params?: PhotoAlbumRouteParams };
  navigation?: {
    goBack: () => void;
    navigate?: (name: string, params?: Record<string, unknown>) => void;
    pop?: (count?: number) => void;
  };
}

export interface PhotoCropScreenProps {
  route?: { params?: PhotoCropRouteParams };
  navigation?: {
    goBack: () => void;
    pop?: (count?: number) => void;
  };
}

export interface PhotoPickerButtonProps {
  options?: PhotoAlbumOpenOptions;
  onPhotosSelected: (photos: PhotoAlbumItem[]) => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}
