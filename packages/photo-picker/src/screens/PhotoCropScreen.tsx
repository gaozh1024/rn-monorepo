import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { CropZoom, type CropZoomRefType } from 'react-native-zoom-toolkit';
import { Image } from 'expo-image';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  clearPhotoAlbumCompleteCallback,
  getPhotoAlbumCompleteCallback,
} from '../internal/photoPickerCallbackRegistry';
import type { PhotoCropScreenProps } from '../types';
import { createCroppedPhotoAlbumItem, resolvePhotoPickerUiConfig } from '../utils/photoPickerFlow';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_ROW_HEIGHT = 48;
const FOOTER_MIN_HEIGHT = 52;
const CONTENT_HORIZONTAL_PADDING = 16;
const CONTENT_VERTICAL_PADDING = 12;

function getCropBoxSize(aspect: [number, number], maxWidth: number, maxHeight: number) {
  const ratio = aspect[0] / aspect[1];
  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return { width: Math.floor(width), height: Math.floor(height) };
}

function getImageDisplaySize(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number
) {
  const imageRatio = imageWidth / imageHeight;
  const cropRatio = cropWidth / cropHeight;
  return imageRatio > cropRatio
    ? { width: cropHeight * imageRatio, height: cropHeight }
    : { width: cropWidth, height: cropWidth / imageRatio };
}

export function PhotoCropScreen({ route, navigation }: PhotoCropScreenProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const cropRef = React.useRef<CropZoomRefType>(null);
  const [saving, setSaving] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [contentLayout, setContentLayout] = React.useState({ width: 0, height: 0 });
  const photo = route?.params?.photo;
  const cropOptions = route?.params?.crop;
  const callbackId = route?.params?.callbackId;
  const uiConfig = React.useMemo(
    () => resolvePhotoPickerUiConfig(route?.params?.uiConfig),
    [route?.params?.uiConfig]
  );
  const quality = route?.params?.quality ?? cropOptions?.quality ?? 1;
  const aspect = cropOptions?.aspect ?? ([1, 1] as [number, number]);
  const isCircleCrop = cropOptions?.shape === 'circle';
  const headerHeight = insets.top + HEADER_ROW_HEIGHT;
  const footerHeight = Math.max(insets.bottom, 16) + FOOTER_MIN_HEIGHT;
  const cropBox = React.useMemo(
    () =>
      getCropBoxSize(
        aspect,
        SCREEN_WIDTH - CONTENT_HORIZONTAL_PADDING * 2,
        SCREEN_HEIGHT - headerHeight - footerHeight - CONTENT_VERTICAL_PADDING * 2
      ),
    [aspect, footerHeight, headerHeight]
  );
  const cropFramePosition = React.useMemo(
    () => ({
      left: Math.max(0, (contentLayout.width - cropBox.width) / 2),
      top: Math.max(0, (contentLayout.height - cropBox.height) / 2),
    }),
    [contentLayout.height, contentLayout.width, cropBox.height, cropBox.width]
  );
  const imageSize = React.useMemo(
    () =>
      !photo
        ? { width: cropBox.width, height: cropBox.height }
        : getImageDisplaySize(
            Math.max(photo.width, 1),
            Math.max(photo.height, 1),
            cropBox.width,
            cropBox.height
          ),
    [cropBox.height, cropBox.width, photo]
  );

  const closeFlow = React.useCallback(
    (count = 1) => {
      if (closing) return;
      setClosing(true);
      requestAnimationFrame(() => {
        if (count > 1 && navigation?.pop) navigation.pop(count);
        else navigation?.goBack();
      });
    },
    [closing, navigation]
  );

  const handleCancel = React.useCallback(() => {
    clearPhotoAlbumCompleteCallback(callbackId);
    closeFlow();
  }, [callbackId, closeFlow]);

  const handleConfirm = React.useCallback(async () => {
    if (!photo || !cropRef.current || saving) return;
    setSaving(true);
    try {
      const result = cropRef.current.crop();
      const manipulated = await manipulateAsync(photo.uri, [{ crop: result.crop }], {
        compress: quality,
        format: SaveFormat.JPEG,
      });
      const croppedPhoto = createCroppedPhotoAlbumItem(photo, manipulated, cropOptions);
      getPhotoAlbumCompleteCallback(callbackId)?.([croppedPhoto]);
      clearPhotoAlbumCompleteCallback(callbackId);
      closeFlow(2);
    } catch (error) {
      console.error('[photo-picker] crop failed', error);
    } finally {
      setSaving(false);
    }
  }, [callbackId, closeFlow, cropOptions, photo, quality, saving]);

  if (!photo) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{uiConfig.texts.cropMissingPhoto}</Text>
      </View>
    );
  }

  const footerHint = isCircleCrop ? uiConfig.texts.cropCircleHint : uiConfig.texts.cropRectHint;
  const showContent = isFocused && !closing;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { height: headerHeight, paddingTop: insets.top }]}>
        <Pressable onPress={handleCancel} style={styles.headerButton} accessibilityRole="button">
          <Text style={styles.headerIcon}>×</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{uiConfig.texts.cropTitle}</Text>
        <Pressable
          onPress={handleConfirm}
          style={styles.headerButton}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text style={styles.headerAction}>
            {saving ? uiConfig.texts.cropSavingButton : uiConfig.texts.cropConfirmButton}
          </Text>
        </Pressable>
      </View>
      <View
        style={styles.content}
        onLayout={({ nativeEvent }) => setContentLayout(nativeEvent.layout)}
      >
        {showContent ? (
          <CropZoom
            ref={cropRef}
            cropSize={cropBox}
            resolution={{ width: Math.max(photo.width, 1), height: Math.max(photo.height, 1) }}
          >
            <Image
              source={{ uri: photo.uri }}
              style={imageSize}
              contentFit="cover"
              transition={0}
              cachePolicy="memory-disk"
            />
          </CropZoom>
        ) : null}
        {showContent && contentLayout.width > 0 ? (
          <View pointerEvents="none" style={styles.overlay}>
            <View
              style={[styles.mask, { left: 0, top: 0, right: 0, height: cropFramePosition.top }]}
            />
            <View
              style={[
                styles.mask,
                {
                  left: 0,
                  top: cropFramePosition.top,
                  width: cropFramePosition.left,
                  height: cropBox.height,
                },
              ]}
            />
            <View
              style={[
                styles.mask,
                {
                  left: cropFramePosition.left + cropBox.width,
                  top: cropFramePosition.top,
                  right: 0,
                  height: cropBox.height,
                },
              ]}
            />
            <View
              style={[
                styles.mask,
                { left: 0, right: 0, top: cropFramePosition.top + cropBox.height, bottom: 0 },
              ]}
            />
            <View
              style={[
                styles.cropFrame,
                {
                  width: cropBox.width,
                  height: cropBox.height,
                  left: cropFramePosition.left,
                  top: cropFramePosition.top,
                  borderRadius: isCircleCrop ? cropBox.width / 2 : 16,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
      <View
        style={[
          styles.footer,
          { minHeight: footerHeight, paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <Text style={styles.hint}>{footerHint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#334155', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#000000',
  },
  headerButton: { minWidth: 52, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  headerIcon: { color: '#ffffff', fontSize: 30, lineHeight: 32 },
  headerAction: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: CONTENT_HORIZONTAL_PADDING,
    paddingVertical: CONTENT_VERTICAL_PADDING,
    backgroundColor: '#000000',
  },
  overlay: { ...StyleSheet.absoluteFillObject },
  mask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.58)' },
  cropFrame: { position: 'absolute', borderWidth: 2, borderColor: '#ffffff' },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#000000',
  },
  hint: { color: 'rgba(255,255,255,0.8)' },
});
