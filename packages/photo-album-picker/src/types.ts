import type React from 'react';
import type { Asset } from 'expo-media-library';

export interface MediaPickerRouteNames {
  photoAlbum: string;
  photoCrop: string;
}

export type PhotoAlbumMediaType = 'photo' | 'video';
export type PhotoAlbumOpenMediaType = 'photo' | 'video' | 'all';
export type PhotoAlbumPermissionOpenSettingsMode = 'confirm' | 'direct' | 'disabled';

export interface PhotoAlbumCropOptions {
  /** 裁剪比例，例如 [1, 1] / [4, 3] */
  aspect?: [number, number];
  /** 裁剪形状 */
  shape?: 'rect' | 'circle';
  /** 裁剪输出质量 */
  quality?: number;
}

export interface PhotoAlbumUiTexts {
  /** 相册按钮默认文案 */
  buttonText?: string;
  /** 相册页标题 */
  albumTitle?: string;
  /** 权限标题 */
  permissionTitle?: string;
  /** 权限说明 */
  permissionDescription?: string;
  /** 权限按钮文案 */
  permissionAllowButton?: string;
  /** 权限不可再次询问时的按钮文案 */
  permissionOpenSettingsButton?: string;
  /** 跳转系统设置确认框标题 */
  permissionSettingsAlertTitle?: string;
  /** 跳转系统设置确认框内容 */
  permissionSettingsAlertMessage?: string;
  /** 跳转系统设置确认框取消按钮文案 */
  permissionSettingsAlertCancelButton?: string;
  /** 跳转系统设置确认框确认按钮文案 */
  permissionSettingsAlertConfirmButton?: string;
  /** 重试按钮文案 */
  retryButton?: string;
  /** 取消按钮文案 */
  cancelButton?: string;
  /** 预览按钮文案 */
  previewButton?: string;
  /** 完成按钮文案 */
  completeButton?: string;
  /** 已选数量文案模板 */
  selectedCountText?: string;
  /** 预览页已选数量文案模板 */
  previewSelectedCountText?: string;
  /** 预览页索引文案模板 */
  previewIndexText?: string;
  /** 预览页视频标识文案模板 */
  previewVideoBadgeText?: string;
  /** 返回按钮文案 */
  backButton?: string;
  /** 裁剪标题 */
  cropTitle?: string;
  /** 裁剪确认按钮文案 */
  cropConfirmButton?: string;
  /** 裁剪保存中按钮文案 */
  cropSavingButton?: string;
  /** 圆形裁剪提示 */
  cropCircleHint?: string;
  /** 矩形裁剪提示 */
  cropRectHint?: string;
  /** 裁剪缺少图片提示 */
  cropMissingPhoto?: string;
  /** 视频时长提示标题 */
  durationLimitAlertTitle?: string;
  /** 视频时长提示内容模板 */
  durationLimitAlertMessage?: string;
  /** 打开相册失败提示 */
  openAlbumError?: string;
  /** 请求权限失败提示 */
  permissionRequestError?: string;
  /** 检查权限失败提示 */
  permissionCheckError?: string;
  /** 加载照片失败提示 */
  loadPhotosError?: string;
  /** 加载更多失败提示 */
  loadMorePhotosError?: string;
}

export interface PhotoAlbumUiTheme {
  /** 权限页“允许访问”按钮背景色 */
  permissionButtonBackgroundColor?: string;
  /** 权限页“允许访问”按钮文字颜色 */
  permissionButtonTextColor?: string;
  /** 权限页“去设置”按钮背景色 */
  permissionSettingsButtonBackgroundColor?: string;
  /** 权限页“去设置”按钮文字颜色 */
  permissionSettingsButtonTextColor?: string;
  /** 底部工具栏取消文字颜色 */
  cancelButtonTextColor?: string;
  /** 底部工具栏预览文字颜色 */
  previewButtonTextColor?: string;
  /** 底部工具栏选中数量文字颜色 */
  selectedCountTextColor?: string;
  /** 预览页选中数量文字颜色 */
  previewSelectedCountTextColor?: string;
  /** 预览页返回文字颜色 */
  backButtonTextColor?: string;
  /** 完成按钮背景色 */
  completeButtonBackgroundColor?: string;
  /** 完成按钮文字颜色 */
  completeButtonTextColor?: string;
  /** 完成按钮禁用背景色 */
  completeButtonDisabledBackgroundColor?: string;
  /** 完成按钮禁用文字颜色 */
  completeButtonDisabledTextColor?: string;
}

export interface PhotoAlbumPermissionConfig {
  /**
   * 当系统不再允许直接弹出权限申请框时的处理方式：
   * - confirm: 弹出确认框后打开系统设置
   * - direct: 直接打开系统设置
   * - disabled: 不自动打开设置，仅回调 onPermissionDenied
   */
  openSettingsMode?: PhotoAlbumPermissionOpenSettingsMode;
}

export interface PhotoAlbumUiConfig {
  /** 文案配置 */
  texts?: PhotoAlbumUiTexts;
  /** 样式配置 */
  theme?: PhotoAlbumUiTheme;
  /** 权限行为配置 */
  permission?: PhotoAlbumPermissionConfig;
}

export interface PhotoAlbumOpenOptions {
  /** 最大选择数量，未传时默认 9 */
  maxSelection?: number;
  /** 打开时允许的媒体类型 */
  mediaType?: PhotoAlbumOpenMediaType;
  /** 是否允许多选，不传时会根据 maxSelection 自动推导 */
  allowsMultipleSelection?: boolean;
  /** 视频最大时长（秒） */
  maxVideoDuration?: number;
  /** 输出质量 */
  quality?: number;
  /** 传入即启用裁剪流程；当前仅支持图片单选 */
  crop?: PhotoAlbumCropOptions;
  /** UI 配置 */
  uiConfig?: PhotoAlbumUiConfig;
}

export interface MediaPickerOptions {
  /** 按钮文本 */
  buttonText?: string;
  /** 是否允许编辑（裁剪） */
  allowsEditing?: boolean;
  /** 图片和视频质量: 0.0 ~ 1.0 */
  quality?: number;
  /** 是否允许选择多张 */
  allowsMultipleSelection?: boolean;
  /** 最多选择数量 */
  selectionLimit?: number;
}

export interface VideoPickerOptions extends MediaPickerOptions {
  /** 最大时长限制（秒），仅 iOS 有效 */
  maxDuration?: number;
  /** 视频导出质量预设 */
  videoExportPreset?: number;
}

export interface ImagePickerOptions extends MediaPickerOptions {
  /** 是否允许选择多张图片 */
  allowsMultipleSelection?: boolean;
  /** 最多选择数量 */
  selectionLimit?: number;
}

export interface MediaInfo {
  /** 本地媒体 URI */
  uri: string;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
  /** 媒体类型 */
  mediaType: 'video' | 'photo' | 'livePhoto';
  /** 视频时长（毫秒），仅视频有效 */
  duration?: number | null;
  /** 文件大小（字节） */
  fileSize?: number;
  /** 文件名 */
  fileName?: string | null;
  /** MIME 类型 */
  mimeType?: string | null;
}

export interface MediaPickerButtonProps {
  /** 选择成功回调 */
  onMediaSelected: (media: MediaInfo[]) => void;
  /** 选择失败回调 */
  onError?: (error: Error) => void;
  /** 按钮文本 */
  buttonText?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** picker 配置选项 */
  options?: Omit<ImagePickerOptions, 'mediaTypes'>;
}

export interface VideoPickerButtonProps {
  /** 选择成功回调 */
  onVideoSelected: (video: MediaInfo) => void;
  /** 选择失败回调 */
  onError?: (error: Error) => void;
  /** 按钮文本 */
  buttonText?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 最大时长限制（秒） */
  maxDuration?: number;
  /** 是否允许编辑 */
  allowsEditing?: boolean;
  /** 视频质量: 0.0 ~ 1.0 */
  quality?: number;
}

export interface ImagePickerButtonProps {
  /** 选择成功回调 */
  onImageSelected: (images: MediaInfo[]) => void;
  /** 选择失败回调 */
  onError?: (error: Error) => void;
  /** 按钮文本 */
  buttonText?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否允许多选 */
  allowsMultipleSelection?: boolean;
  /** 最多选择数量 */
  selectionLimit?: number;
  /** 是否允许编辑 */
  allowsEditing?: boolean;
  /** 图片质量: 0.0 ~ 1.0 */
  quality?: number;
}

export interface PhotoAlbumItem extends Asset {
  /** 可播放/上传的本地文件 URI，部分 iOS 视频需要通过详情接口补全 */
  localUri?: string;
  /** 是否被选中 */
  selected?: boolean;
  /** 选中顺序索引 */
  selectedIndex?: number;
  /** 文件大小 */
  fileSize?: number;
  /** MIME 类型 */
  mimeType?: string | null;
  /** 是否经过裁剪/编辑 */
  edited?: boolean;
  /** 裁剪结果信息 */
  crop?: PhotoAlbumCropOptions & {
    width: number;
    height: number;
  };
}

export interface PhotoAlbumOptions {
  /** 最多选择数量 */
  maxSelection?: number;
  /** 是否允许选择多张 */
  allowsMultipleSelection?: boolean;
  /** 要显示的媒体类型 */
  mediaTypes?: PhotoAlbumMediaType[];
  /** 每行显示数量 */
  numColumns?: number;
  /** 照片间距 */
  spacing?: number;
  /** 是否显示选中计数 */
  showSelectedCount?: boolean;
  /** UI 配置 */
  uiConfig?: PhotoAlbumUiConfig;
}

export interface PhotoAlbumGridProps extends PhotoAlbumOptions {
  /** 选择完成回调 */
  onComplete?: (selectedPhotos: PhotoAlbumItem[]) => void;
  /** 取消选择回调 */
  onCancel?: () => void;
  /** 选择变更回调 */
  onSelectionChange?: (selectedPhotos: PhotoAlbumItem[]) => void;
  /** 权限被拒绝回调 */
  onPermissionDenied?: () => void;
  /** 加载状态变更回调 */
  onLoadingChange?: (loading: boolean) => void;
  /** 自定义渲染选中遮罩 */
  renderSelectedOverlay?: (item: PhotoAlbumItem, index: number) => React.ReactNode;
  /** 自定义渲染底部工具栏 */
  renderToolbar?: (selectedCount: number, onComplete: () => void) => React.ReactNode;
  /** 是否在底部工具栏显示完成按钮，默认 true */
  showToolbarComplete?: boolean;
  /** 是否在底部工具栏显示取消按钮，默认 true */
  showToolbarCancel?: boolean;
}

export interface PhotoAlbumButtonProps {
  /** 选择完成回调 */
  onPhotosSelected: (photos: PhotoAlbumItem[]) => void;
  /** 选择失败回调 */
  onError?: (error: Error) => void;
  /** 按钮文本 */
  buttonText?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 新版统一打开参数 */
  options?: PhotoAlbumOpenOptions;
  /** 最多选择数量 */
  maxSelection?: number;
  /** 是否允许多选 */
  allowsMultipleSelection?: boolean;
  /** 要显示的媒体类型 */
  mediaTypes?: PhotoAlbumMediaType[];
  /** 自定义路由名 */
  routeNames?: Partial<MediaPickerRouteNames>;
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

export interface DefaultPhotoAlbumParamList {
  PhotoAlbum: PhotoAlbumRouteParams;
  PhotoCrop: PhotoCropRouteParams;
}

export interface PhotoAlbumScreenProps {
  /** 路由参数 */
  route?: {
    params?: PhotoAlbumRouteParams;
  };
  /** 导航对象 */
  navigation?: {
    goBack: () => void;
    navigate?: (name: string, params?: Record<string, unknown>) => void;
    pop?: (count?: number) => void;
  };
}

export interface PhotoCropScreenProps {
  route?: {
    params?: PhotoCropRouteParams;
  };
  navigation?: {
    goBack: () => void;
    pop?: (count?: number) => void;
  };
}
