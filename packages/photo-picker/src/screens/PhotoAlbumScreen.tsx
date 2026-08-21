import React from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MEDIA_PICKER_ROUTES } from '../constants';
import {
  clearPhotoAlbumCompleteCallback,
  getPhotoAlbumCompleteCallback,
} from '../internal/photoPickerCallbackRegistry';
import { pickMedia } from '../native';
import type { MediaPickerRouteNames, PhotoAlbumItem, PhotoAlbumScreenProps } from '../types';
import {
  formatPhotoPickerText,
  normalizeOpenOptions,
  resolvePhotoPickerUiConfig,
} from '../utils/photoPickerFlow';

/**
 * Compatibility route for applications that previously navigated to PhotoAlbum.
 * It immediately opens the system picker; the app never enumerates the device library.
 */
export function PhotoAlbumScreen({ route, navigation }: PhotoAlbumScreenProps) {
  const startedRef = React.useRef(false);
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const callbackId = route?.params?.callbackId;
  const options = React.useMemo(
    () =>
      normalizeOpenOptions({
        ...route?.params?.options,
        maxSelection: route?.params?.options?.maxSelection ?? route?.params?.maxSelection,
        allowsMultipleSelection:
          route?.params?.options?.allowsMultipleSelection ?? route?.params?.allowsMultipleSelection,
        mediaType:
          route?.params?.options?.mediaType ??
          (route?.params?.mediaTypes?.length === 1 ? route.params.mediaTypes[0] : 'all'),
      }),
    [
      route?.params?.allowsMultipleSelection,
      route?.params?.maxSelection,
      route?.params?.mediaTypes,
      route?.params?.options,
    ]
  );
  const uiConfig = React.useMemo(
    () =>
      resolvePhotoPickerUiConfig({
        ...route?.params?.uiConfig,
        ...options.uiConfig,
        texts: {
          ...route?.params?.uiConfig?.texts,
          ...options.uiConfig?.texts,
        },
      }),
    [options.uiConfig, route?.params?.uiConfig]
  );
  const routeNames: MediaPickerRouteNames = React.useMemo(
    () => ({
      photoAlbum: route?.params?.routeNames?.photoAlbum ?? MEDIA_PICKER_ROUTES.PHOTO_ALBUM,
      photoCrop: route?.params?.routeNames?.photoCrop ?? MEDIA_PICKER_ROUTES.PHOTO_CROP,
    }),
    [route?.params?.routeNames?.photoAlbum, route?.params?.routeNames?.photoCrop]
  );

  const close = React.useCallback(() => {
    clearPhotoAlbumCompleteCallback(callbackId);
    navigation?.goBack();
  }, [callbackId, navigation]);

  const complete = React.useCallback(
    (assets: PhotoAlbumItem[]) => {
      const overLimitVideo =
        options.maxVideoDuration == null
          ? undefined
          : assets.find(
              asset =>
                asset.mediaType === 'video' && (asset.duration ?? 0) > options.maxVideoDuration!
            );

      if (overLimitVideo) {
        Alert.alert(
          uiConfig.texts.durationLimitAlertTitle,
          formatPhotoPickerText(uiConfig.texts.durationLimitAlertMessage, {
            maxDuration: options.maxVideoDuration!,
          })
        );
        return;
      }

      if (options.crop) {
        const photo = assets[0];
        if (!photo) return;
        navigation?.navigate?.(routeNames.photoCrop, {
          photo,
          crop: options.crop,
          quality: options.quality,
          callbackId,
          routeNames,
          uiConfig: options.uiConfig,
        });
        return;
      }

      getPhotoAlbumCompleteCallback(callbackId)?.(assets);
      clearPhotoAlbumCompleteCallback(callbackId);
      navigation?.goBack();
    },
    [
      callbackId,
      navigation,
      options,
      routeNames,
      uiConfig.texts.durationLimitAlertMessage,
      uiConfig.texts.durationLimitAlertTitle,
    ]
  );

  const openPicker = React.useCallback(async () => {
    setErrorMessage(undefined);
    try {
      const result = await pickMedia({
        mediaType: options.mediaType,
        maxSelection: options.maxSelection,
        allowsMultipleSelection: options.allowsMultipleSelection,
        cacheMode: 'copy',
      });
      if (result.cancelled) {
        close();
        return;
      }
      complete(result.assets);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : uiConfig.texts.openAlbumError);
    }
  }, [
    close,
    complete,
    options.allowsMultipleSelection,
    options.maxSelection,
    options.mediaType,
    uiConfig.texts.openAlbumError,
  ]);

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void openPicker();
  }, [openPicker]);

  React.useEffect(
    () => () => {
      if (!options.crop) {
        clearPhotoAlbumCompleteCallback(callbackId);
      }
    },
    [callbackId, options.crop]
  );

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.title}>
        {errorMessage ? uiConfig.texts.openAlbumError : uiConfig.texts.albumTitle}
      </Text>
      {errorMessage ? <Text style={styles.message}>{errorMessage}</Text> : null}
      {errorMessage ? (
        <View style={styles.actions}>
          <Pressable onPress={() => void openPicker()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>重试</Text>
          </Pressable>
          <Pressable onPress={close} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>取消</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: { marginTop: 16, color: '#0f172a', fontSize: 16, fontWeight: '600' },
  message: { marginTop: 8, color: '#64748b', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  primaryButton: {
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  secondaryButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  secondaryButtonText: { color: '#334155', fontSize: 14, fontWeight: '600' },
});
