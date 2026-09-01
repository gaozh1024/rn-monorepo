import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { AppHeader, AppPressable, AppScreen, AppText, useTheme } from '@gaozh1024/rn-kit';
import { mediaPickerColors, MEDIA_PICKER_ROUTES } from '../constants';
import { PhotoAlbumGrid } from '../components/PhotoAlbumGrid';
import type {
  MediaPickerRouteNames,
  PhotoAlbumScreenProps,
  PhotoAlbumItem,
  PhotoAlbumUiConfig,
} from '../types';
import {
  clearPhotoAlbumCompleteCallback,
  getPhotoAlbumCompleteCallback,
} from '../internal/photoAlbumCallbackRegistry';
import {
  formatPhotoAlbumText,
  normalizeOpenOptions,
  resolveMediaTypes,
  resolvePhotoAlbumUiConfig,
} from '../utils/photoAlbumFlow';

/**
 * 相册选择器页面
 *
 * 使用方式：
 * ```typescript
 * navigation.navigate('PhotoAlbum', {
 *   maxSelection: 9,
 *   allowsMultipleSelection: true,
 *   callbackId: '...'
 * });
 * ```
 */
export function PhotoAlbumScreen({ route, navigation }: PhotoAlbumScreenProps) {
  const { isDark } = useTheme();
  const callbackId = route?.params?.callbackId;
  const mergedUiConfig = React.useMemo<PhotoAlbumUiConfig>(
    () => ({
      texts: {
        ...route?.params?.uiConfig?.texts,
        ...route?.params?.options?.uiConfig?.texts,
      },
      theme: {
        ...route?.params?.uiConfig?.theme,
        ...route?.params?.options?.uiConfig?.theme,
      },
    }),
    [
      route?.params?.options?.uiConfig?.texts,
      route?.params?.options?.uiConfig?.theme,
      route?.params?.uiConfig?.texts,
      route?.params?.uiConfig?.theme,
    ]
  );
  const uiConfig = React.useMemo(() => resolvePhotoAlbumUiConfig(mergedUiConfig), [mergedUiConfig]);
  const openOptions = React.useMemo(
    () =>
      normalizeOpenOptions(route?.params?.options, {
        maxSelection: route?.params?.maxSelection,
        allowsMultipleSelection: route?.params?.allowsMultipleSelection,
        mediaTypes: route?.params?.mediaTypes,
      }),
    [
      route?.params?.allowsMultipleSelection,
      route?.params?.maxSelection,
      route?.params?.mediaTypes,
      route?.params?.options,
    ]
  );
  const maxSelection = openOptions.maxSelection ?? 1;
  const allowsMultipleSelection = openOptions.allowsMultipleSelection ?? false;
  const mediaTypes = resolveMediaTypes(openOptions.mediaType ?? 'all');
  const routeNames: MediaPickerRouteNames = React.useMemo(
    () => ({
      photoAlbum: route?.params?.routeNames?.photoAlbum ?? MEDIA_PICKER_ROUTES.PHOTO_ALBUM,
      photoCrop: route?.params?.routeNames?.photoCrop ?? MEDIA_PICKER_ROUTES.PHOTO_CROP,
    }),
    [route?.params?.routeNames?.photoAlbum, route?.params?.routeNames?.photoCrop]
  );

  const onComplete = React.useMemo(() => getPhotoAlbumCompleteCallback(callbackId), [callbackId]);
  const [selectedPhotos, setSelectedPhotos] = React.useState<PhotoAlbumItem[]>([]);

  /**
   * 处理选择完成
   */
  const handleComplete = React.useCallback(
    (selectedPhotos: PhotoAlbumItem[]) => {
      const maxVideoDuration = openOptions.maxVideoDuration;
      if (maxVideoDuration != null) {
        const overLimitVideo = selectedPhotos.find(
          item =>
            item.mediaType === 'video' &&
            typeof item.duration === 'number' &&
            item.duration > maxVideoDuration
        );

        if (overLimitVideo) {
          Alert.alert(
            uiConfig.texts.durationLimitAlertTitle,
            formatPhotoAlbumText(uiConfig.texts.durationLimitAlertMessage, {
              maxDuration: maxVideoDuration,
            })
          );
          return;
        }
      }

      if (openOptions.crop) {
        const photo = selectedPhotos[0];
        if (!photo) return;

        navigation?.navigate?.(routeNames.photoCrop, {
          photo,
          crop: openOptions.crop,
          quality: openOptions.quality,
          callbackId,
          routeNames,
          uiConfig,
        });
        return;
      }

      onComplete?.(selectedPhotos);
      clearPhotoAlbumCompleteCallback(callbackId);
      // 返回上一页
      navigation?.goBack();
    },
    [
      callbackId,
      navigation,
      onComplete,
      openOptions.crop,
      openOptions.maxVideoDuration,
      openOptions.quality,
      routeNames,
      uiConfig,
    ]
  );

  /**
   * 处理取消
   */
  const handleCancel = React.useCallback(() => {
    clearPhotoAlbumCompleteCallback(callbackId);
    navigation?.goBack();
  }, [callbackId, navigation]);

  React.useEffect(() => {
    return () => {
      clearPhotoAlbumCompleteCallback(callbackId);
    };
  }, [callbackId]);

  return (
    <AppScreen
      flex
      top={false}
      bg={isDark ? mediaPickerColors.slate[900] : mediaPickerColors.slate[50]}
    >
      <AppHeader
        title={uiConfig.texts.albumTitle}
        onLeftPress={handleCancel}
        rightNode={
          <AppPressable
            onPress={() => handleComplete(selectedPhotos)}
            disabled={selectedPhotos.length === 0}
            style={[
              styles.completeHeaderAction,
              {
                backgroundColor:
                  selectedPhotos.length === 0
                    ? uiConfig.theme.completeButtonDisabledBackgroundColor
                    : uiConfig.theme.completeButtonBackgroundColor,
              },
            ]}
          >
            <AppText
              size="md"
              weight="semibold"
              style={{
                color:
                  selectedPhotos.length === 0
                    ? uiConfig.theme.completeButtonDisabledTextColor
                    : uiConfig.theme.completeButtonTextColor,
              }}
            >
              {uiConfig.texts.completeButton}
            </AppText>
          </AppPressable>
        }
        style={[
          styles.header,
          {
            backgroundColor: isDark ? mediaPickerColors.slate[800] : '#ffffff',
            borderBottomColor: isDark ? mediaPickerColors.slate[700] : mediaPickerColors.slate[200],
          },
        ]}
      />

      {/* 相册网格 */}
      <PhotoAlbumGrid
        maxSelection={maxSelection}
        allowsMultipleSelection={allowsMultipleSelection}
        mediaTypes={mediaTypes}
        numColumns={4}
        spacing={2}
        uiConfig={uiConfig}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onSelectionChange={setSelectedPhotos}
        showToolbarComplete={false}
        showToolbarCancel={false}
        onPermissionDenied={() => {
          // 可以在这里显示提示或跳转设置
          console.log('权限被拒绝');
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
  },
  completeHeaderAction: {
    minWidth: 52,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
