import type React from 'react';

export type PhotoAlbumMediaType = 'photo' | 'video';
export type PhotoAlbumOpenMediaType = PhotoAlbumMediaType | 'all';

/**
 * Backend that actually handled a picker request.
 *
 * - `android-photo-picker`: platform `MediaStore.ACTION_PICK_IMAGES`.
 * - `android-system-fallback`: OEM system app implementing the AndroidX
 *   fallback picker action.
 * - `android-vendor-gallery`: a verified vendor gallery adapter (Huawei only).
 * - `android-open-document`: the document picker fallback.
 * - `ios-phpicker`: the iOS `PHPickerViewController` backend (iOS 14+,
 *   permissionless like the Android Photo Picker).
 */
export type PickerSource =
  | 'android-photo-picker'
  | 'android-system-fallback'
  | 'android-vendor-gallery'
  | 'android-open-document'
  | 'ios-phpicker';

export interface PickerBackend {
  source: PickerSource;
  action: string;
}

export type PhotoPickerNativeErrorCode =
  | 'PICKER_BUSY'
  | 'PICKER_LAUNCH_FAILED'
  | 'PICKER_SELECTION_LIMIT_UNSUPPORTED'
  | 'PICKER_INVALID_OPTIONS'
  | 'PICKER_UNAVAILABLE'
  | 'PICKER_SELECTION_LIMIT_EXCEEDED'
  | 'PICKER_UNSUPPORTED_MEDIA'
  | 'PICKER_READ_FAILED'
  | 'PICKER_CACHE_FAILED'
  | 'PICKER_INTERRUPTED';

export interface PhotoPickerNativeError extends Error {
  code: PhotoPickerNativeErrorCode;
}

export interface PhotoAlbumCropOptions {
  aspect?: [number, number];
  shape?: 'rect' | 'circle';
  quality?: number;
}

/**
 * Android-only picker strategy options.
 */
export interface PhotoPickerAndroidOptions {
  /**
   * Backend candidate order:
   * - `auto` (default): standard photo picker -> verified vendor gallery -> document picker.
   * - `system`: AndroidX standard chain only (never vendor adapters).
   * - `gallery`: verified vendor gallery -> standard photo picker -> document picker.
   */
  preference?: 'auto' | 'system' | 'gallery';
  /** When false, the document picker never serves the request (PICKER_UNAVAILABLE instead). */
  allowDocumentFallback?: boolean;
}

/**
 * Native picker UI hints. Only forwarded to backends that accept them; the
 * result reports what was applied and what was ignored. The system picker's
 * internal layout, thumbnails, and buttons are never customizable.
 */
export interface PhotoPickerNativeUiOptions {
  /** `#RRGGBB`. Rejected when malformed; dropped when luminance < 0.5 (recorded as ignored). */
  accentColor?: string;
  /** Initial tab on backends that support it. */
  defaultTab?: 'photos' | 'albums';
  /** Request ordered selection; the result reports whether the order is guaranteed. */
  orderedSelection?: boolean;
}

/** Capability snapshot of one picker backend at probe time. */
export interface PickerBackendCapability {
  source: PickerSource;
  mediaTypes: PhotoAlbumOpenMediaType[];
  multiple: 'supported' | 'unsupported' | 'unknown';
  selectionLimit: 'native' | 'post-validation';
  /** null means "not known", never "unlimited". */
  maxSelection: number | null;
  orderedSelection: 'supported' | 'unsupported' | 'unknown';
  nativeUi: { accentColor: boolean; defaultTab: boolean };
}

/** Result of getCapabilities: a point-in-time probe, not a launch guarantee. */
export interface PickerCapabilities {
  available: boolean;
  candidates: PickerBackendCapability[];
  requestedMaxSelection: number;
  effectiveMaxSelection: number;
}

/** Observability payload describing the backend that handled a pick. */
export interface PickerBackendInfo {
  source: PickerSource;
  action?: string;
  vendorAdapterId?: string;
  selectionLimit: 'native' | 'post-validation';
  requestedMaxSelection: number;
  effectiveMaxSelection: number;
  orderedSelectionGuaranteed: boolean;
  appliedUiOptions: string[];
  ignoredUiOptions: string[];
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
  /** Android backend strategy; forwarded to the native picker. */
  android?: PhotoPickerAndroidOptions;
  /** Native picker UI hints; applied only by backends that support them. */
  nativeUi?: PhotoPickerNativeUiOptions;
}

export interface PhotoPickerOptions {
  mediaType?: PhotoAlbumOpenMediaType;
  maxSelection?: number;
  allowsMultipleSelection?: boolean;
  cacheMode?: 'copy';
  /** Android backend strategy; ignored on other platforms. */
  android?: PhotoPickerAndroidOptions;
  /** Native picker UI hints; applied only by backends that support them. */
  nativeUi?: PhotoPickerNativeUiOptions;
}

export interface PhotoPickerResult {
  cancelled: boolean;
  assets: PhotoAlbumItem[];
  source?: PickerSource;
  action?: string;
  /** Observability info about the backend that handled the request (including cancellations). */
  backend?: PickerBackendInfo;
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
