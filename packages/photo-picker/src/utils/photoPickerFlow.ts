import type {
  PhotoAlbumCropOptions,
  PhotoAlbumItem,
  PhotoAlbumOpenOptions,
  PhotoAlbumOpenMediaType,
  PhotoAlbumUiConfig,
  PhotoAlbumUiTexts,
} from '../types';

const DEFAULT_TEXTS: Required<
  Pick<
    PhotoAlbumUiTexts,
    | 'albumTitle'
    | 'cropTitle'
    | 'cropConfirmButton'
    | 'cropSavingButton'
    | 'cropCircleHint'
    | 'cropRectHint'
    | 'cropMissingPhoto'
    | 'durationLimitAlertTitle'
    | 'durationLimitAlertMessage'
    | 'openAlbumError'
  >
> = {
  albumTitle: '选择媒体',
  cropTitle: '裁剪图片',
  cropConfirmButton: '完成',
  cropSavingButton: '保存中',
  cropCircleHint: '拖动和缩放图片，使主体位于圆形区域内',
  cropRectHint: '拖动和缩放图片，调整裁剪区域',
  cropMissingPhoto: '未找到可裁剪图片',
  durationLimitAlertTitle: '提示',
  durationLimitAlertMessage: '视频时长不能超过 {maxDuration} 秒',
  openAlbumError: '打开系统选择器失败',
};

export function normalizeOpenOptions(
  options?: PhotoAlbumOpenOptions
): Required<Pick<PhotoAlbumOpenOptions, 'maxSelection' | 'mediaType' | 'allowsMultipleSelection'>> &
  PhotoAlbumOpenOptions {
  const requestedMaxSelection = options?.maxSelection ?? 9;
  const maxSelection = Number.isFinite(requestedMaxSelection)
    ? Math.max(1, Math.floor(requestedMaxSelection))
    : 1;
  const crop = options?.crop;
  const allowsMultipleSelection = crop
    ? false
    : (options?.allowsMultipleSelection ?? maxSelection > 1);

  return {
    ...options,
    crop,
    maxSelection: crop ? 1 : allowsMultipleSelection ? maxSelection : 1,
    mediaType: crop ? 'photo' : (options?.mediaType ?? 'all'),
    allowsMultipleSelection,
  };
}

export function resolvePhotoPickerUiConfig(uiConfig?: PhotoAlbumUiConfig) {
  return {
    texts: {
      ...DEFAULT_TEXTS,
      ...uiConfig?.texts,
    },
  };
}

export function formatPhotoPickerText(
  template: string,
  variables: Record<string, string | number>
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(variables[key] ?? ''));
}

export function createCroppedPhotoAlbumItem(
  photo: PhotoAlbumItem,
  manipulated: { uri: string; width: number; height: number },
  crop?: PhotoAlbumCropOptions
): PhotoAlbumItem {
  const baseName = photo.filename ?? photo.fileName ?? 'photo';
  const croppedName = `${baseName.replace(/\.[^.]+$/, '')}-cropped.jpg`;
  return {
    ...photo,
    id: `${photo.id}-crop-${Date.now()}`,
    uri: manipulated.uri,
    localUri: manipulated.uri,
    filename: croppedName,
    fileName: croppedName,
    mimeType: 'image/jpeg',
    width: manipulated.width,
    height: manipulated.height,
    edited: true,
    crop: {
      ...crop,
      width: manipulated.width,
      height: manipulated.height,
    },
  };
}

export function normalizePickerMediaType(
  mediaType?: PhotoAlbumOpenMediaType
): PhotoAlbumOpenMediaType {
  return mediaType === 'photo' || mediaType === 'video' || mediaType === 'all' ? mediaType : 'all';
}
