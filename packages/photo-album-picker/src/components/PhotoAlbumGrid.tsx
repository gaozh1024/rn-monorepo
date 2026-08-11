import React, { useCallback, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
  ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { FlashList } from '@shopify/flash-list';
import { AppText, Center, Icon, AppPressable, useTheme } from '@gaozh1024/rn-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePhotoAlbum } from '../hooks/usePhotoAlbum';
import type { PhotoAlbumGridProps, PhotoAlbumItem, PhotoAlbumMediaType } from '../types';
import { mediaPickerColors } from '../constants';
import { commitPreviewSelection } from '../utils/commitPreviewSelection';
import { formatPhotoAlbumText, resolvePhotoAlbumUiConfig } from '../utils/photoAlbumFlow';

function PreviewImage({
  item,
  previewHeight,
  recyclingKey,
}: {
  item: PhotoAlbumItem;
  previewHeight: number;
  recyclingKey: string;
}) {
  return (
    <Image
      source={{ uri: item.uri }}
      style={[styles.previewImage, { height: previewHeight }]}
      contentFit="contain"
      cachePolicy="none"
      allowDownscaling
      decodeFormat="rgb"
      recyclingKey={recyclingKey}
      transition={0}
    />
  );
}

function PreviewMedia({
  item,
  previewHeight,
  active,
  previewVideoBadgeText,
}: {
  item: PhotoAlbumItem;
  previewHeight: number;
  active: boolean;
  previewVideoBadgeText: string;
}) {
  if (item.mediaType === 'video' && active) {
    return (
      <PreviewVideo
        item={item}
        previewHeight={previewHeight}
        previewVideoBadgeText={previewVideoBadgeText}
      />
    );
  }

  return (
    <PreviewImage item={item} previewHeight={previewHeight} recyclingKey={`preview-${item.id}`} />
  );
}

function ActivePreviewVideo({ source, previewHeight }: { source: string; previewHeight: number }) {
  const player = useVideoPlayer(source, createdPlayer => {
    createdPlayer.loop = false;
  });

  React.useEffect(() => {
    safelyCallVideoPlayer(() => player.play?.());
    return () => {
      safelyCallVideoPlayer(() => player.pause?.());
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={[styles.previewVideo, { height: previewHeight }]}
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture
      nativeControls
      contentFit="contain"
    />
  );
}

function PreviewVideo({
  item,
  previewHeight,
  previewVideoBadgeText,
}: {
  item: PhotoAlbumItem;
  previewHeight: number;
  previewVideoBadgeText: string;
}) {
  const [hasStarted, setHasStarted] = React.useState(false);
  const videoSource = item.localUri ?? item.uri;

  const handlePlay = React.useCallback(() => {
    setHasStarted(true);
  }, []);

  return (
    <View style={[styles.previewVideoContainer, { height: previewHeight }]}>
      {hasStarted ? (
        <ActivePreviewVideo source={videoSource} previewHeight={previewHeight} />
      ) : (
        <>
          <PreviewImage
            item={item}
            previewHeight={previewHeight}
            recyclingKey={`preview-video-${item.id}`}
          />

          <Pressable onPress={handlePlay} style={styles.previewVideoPlayOverlay}>
            <View style={styles.previewVideoPlayButton}>
              <Icon name="play-arrow" size={42} color="#ffffff" />
            </View>
          </Pressable>

          <View pointerEvents="none" style={styles.previewVideoBadge}>
            <Icon name="play-arrow" size={18} color="#ffffff" />
            <AppText size="sm" weight="medium" style={{ color: '#ffffff' }}>
              {formatPhotoAlbumText(previewVideoBadgeText, {
                duration: formatDuration(item.duration),
              }).trim()}
            </AppText>
          </View>
        </>
      )}
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MEDIA_TYPE_MAP: Record<PhotoAlbumMediaType, 'photo' | 'video'> = {
  photo: 'photo',
  video: 'video',
};
const DEFAULT_MEDIA_TYPES: PhotoAlbumMediaType[] = ['photo', 'video'];
const GRID_INITIAL_PAGE_ROWS = 18;
const GRID_LOAD_MORE_ROWS = 10;
const GRID_DRAW_DISTANCE_ROWS = 6;

function PhotoAlbumGridPlaceholder({
  itemSize,
  spacing,
  numColumns,
  isDark,
  rows = 5,
}: {
  itemSize: number;
  spacing: number;
  numColumns: number;
  isDark: boolean;
  rows?: number;
}) {
  return (
    <View style={styles.placeholderGrid}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View key={`album-skeleton-row-${rowIndex}`} style={styles.placeholderRow}>
          {Array.from({ length: numColumns }).map((__, columnIndex) => (
            <View
              key={`album-skeleton-${rowIndex}-${columnIndex}`}
              style={[
                styles.placeholderCell,
                {
                  width: itemSize,
                  height: itemSize,
                  margin: spacing / 2,
                  backgroundColor: isDark
                    ? mediaPickerColors.slate[800]
                    : mediaPickerColors.slate[100],
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

interface PhotoGridItemProps {
  item: PhotoAlbumItem;
  index: number;
  itemSize: number;
  spacing: number;
  isSelected: boolean;
  selectedIndex: number;
  showSelectedCount: boolean;
  onPress: (item: PhotoAlbumItem, index: number) => void;
  onToggleSelect: (item: PhotoAlbumItem) => void;
  renderSelectedOverlay?: (item: PhotoAlbumItem, index: number) => React.ReactNode;
}

const PhotoGridItem = React.memo(function PhotoGridItem({
  item,
  index,
  itemSize,
  spacing,
  isSelected,
  selectedIndex,
  showSelectedCount,
  onPress,
  onToggleSelect,
  renderSelectedOverlay,
}: PhotoGridItemProps) {
  return (
    <View
      style={[
        styles.photoItem,
        {
          width: itemSize,
          height: itemSize,
          margin: spacing / 2,
        },
      ]}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.photoImage}
        contentFit="cover"
        transition={0}
        cachePolicy="disk"
        recyclingKey={`grid-${item.id}`}
      />

      <Pressable onPress={() => onPress(item, index)} style={StyleSheet.absoluteFill} />

      {item.mediaType === 'video' && (
        <View pointerEvents="none" style={styles.videoBadge}>
          <Icon name="play-arrow" size={12} color="#ffffff" />
          {typeof item.duration === 'number' && Number.isFinite(item.duration) && (
            <AppText size="xs" style={styles.videoDuration}>
              {formatDuration(item.duration)}
            </AppText>
          )}
        </View>
      )}

      {renderSelectedOverlay ? (
        renderSelectedOverlay(item, index)
      ) : (
        <>
          {isSelected && <View pointerEvents="none" style={styles.selectedOverlay} />}

          <Pressable
            hitSlop={8}
            onPressIn={() => onToggleSelect(item)}
            style={[
              styles.selectedBadge,
              {
                backgroundColor: isSelected ? mediaPickerColors.primary[500] : 'rgba(0,0,0,0.5)',
                borderColor: isSelected ? mediaPickerColors.primary[500] : '#ffffff',
              },
            ]}
          >
            {isSelected && showSelectedCount ? (
              <AppText size="xs" weight="bold" style={{ color: '#ffffff' }}>
                {selectedIndex}
              </AppText>
            ) : null}
          </Pressable>
        </>
      )}
    </View>
  );
});

/**
 * 微信风格相册选择器组件
 *
 * 实现特点：
 * 1. 4列网格布局（类似微信）
 * 2. 支持多选/单选
 * 3. 选中状态显示（带序号的圆形标记）
 * 4. 底部工具栏显示选中数量
 * 5. 支持视频标识
 * 6. 支持分页加载
 */
export function PhotoAlbumGrid({
  maxSelection = 9,
  allowsMultipleSelection = true,
  mediaTypes = DEFAULT_MEDIA_TYPES,
  numColumns = 4,
  spacing = 2,
  showSelectedCount = true,
  uiConfig,
  onComplete,
  onCancel,
  onSelectionChange,
  onPermissionDenied,
  onLoadingChange,
  renderSelectedOverlay,
  renderToolbar,
}: PhotoAlbumGridProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const resolvedUiConfig = useMemo(() => resolvePhotoAlbumUiConfig(uiConfig), [uiConfig]);
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null);
  const previewListRef = React.useRef<FlatList<PhotoAlbumItem>>(null);
  const mediaTypeFilter = useMemo(() => mediaTypes.map(type => MEDIA_TYPE_MAP[type]), [mediaTypes]);
  const albumOptions = useMemo(
    () => ({
      initialLoadCount: numColumns * GRID_INITIAL_PAGE_ROWS,
      loadMoreCount: numColumns * GRID_LOAD_MORE_ROWS,
      mediaType: mediaTypeFilter,
    }),
    [mediaTypeFilter, numColumns]
  );

  const {
    photos,
    loading,
    initialLoading,
    loadingMore,
    hasMore,
    permissionStatus,
    permissionCanAskAgain,
    error,
    requestPermission,
    loadMore,
    refresh,
    toggleSelection,
    getSelectedPhotos,
    selectedCount,
  } = usePhotoAlbum({
    ...albumOptions,
    permission: resolvedUiConfig.permission,
    uiTexts: resolvedUiConfig.texts,
  });

  const selectedPhotos = useMemo(() => getSelectedPhotos(), [getSelectedPhotos]);
  const selectedIdSet = useMemo(
    () => new Set(selectedPhotos.map(item => item.id)),
    [selectedPhotos]
  );
  const selectedIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    selectedPhotos.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [selectedPhotos]);
  const previewItem = previewIndex !== null ? photos[previewIndex] : null;
  const toolbarBottomInset = Math.max(insets.bottom, 8);
  const previewHeaderHeight = 48 + insets.top;
  const previewFooterHeight = 60 + Math.max(insets.bottom, 12);
  const previewContentHeight = SCREEN_HEIGHT - previewHeaderHeight - previewFooterHeight;
  const toolbarSelectedCountText = useMemo(
    () =>
      formatPhotoAlbumText(resolvedUiConfig.texts.selectedCountText, {
        selectedCount,
        maxSelectionPart: maxSelection < Infinity ? `/${maxSelection}` : '',
      }),
    [maxSelection, resolvedUiConfig.texts.selectedCountText, selectedCount]
  );
  const previewSelectedCountText = useMemo(
    () =>
      formatPhotoAlbumText(resolvedUiConfig.texts.previewSelectedCountText, {
        selectedCount,
        maxSelectionPart: maxSelection < Infinity ? ` / ${maxSelection}` : '',
      }),
    [maxSelection, resolvedUiConfig.texts.previewSelectedCountText, selectedCount]
  );
  const previewIndexText = useMemo(() => {
    if (previewIndex === null) return '';

    return formatPhotoAlbumText(resolvedUiConfig.texts.previewIndexText, {
      current: previewIndex + 1,
      total: photos.length,
    });
  }, [photos.length, previewIndex, resolvedUiConfig.texts.previewIndexText]);

  // 通知外部加载状态变化
  React.useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // 通知外部选中状态变化
  React.useEffect(() => {
    onSelectionChange?.(selectedPhotos);
  }, [selectedPhotos, onSelectionChange]);

  // 计算每个 item 的尺寸（正方形，铺满宽度）
  const itemSize = useMemo(() => {
    const totalSpacing = spacing * (numColumns + 1);
    return (SCREEN_WIDTH - totalSpacing) / numColumns;
  }, [numColumns, spacing]);
  const initialPlaceholderRows = useMemo(() => {
    const estimatedToolbarHeight = 56 + toolbarBottomInset;
    const estimatedAvailableHeight = SCREEN_HEIGHT - estimatedToolbarHeight;
    return Math.max(7, Math.ceil(estimatedAvailableHeight / (itemSize + spacing)) + 1);
  }, [itemSize, spacing, toolbarBottomInset]);

  const handleGridViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<PhotoAlbumItem>[] }) => {
      const indexes = viewableItems
        .map(token => token.index)
        .filter((index): index is number => index !== null && index !== undefined);

      if (indexes.length === 0) return;

      const maxIndex = Math.max(...indexes);
      if (
        hasMore &&
        !initialLoading &&
        !loadingMore &&
        maxIndex >= photos.length - numColumns * 8
      ) {
        void loadMore();
      }
    },
    [hasMore, initialLoading, loadingMore, loadMore, numColumns, photos.length]
  );

  /**
   * 处理选择切换
   */
  const handleToggleSelect = useCallback(
    (item: PhotoAlbumItem) => {
      if (!allowsMultipleSelection) {
        onComplete?.([item]);
        return;
      }

      // 多选模式
      if (selectedIdSet.has(item.id)) {
        toggleSelection(item.id);
      } else {
        if (selectedCount >= maxSelection) {
          // 已达到最大选择数
          return;
        }
        toggleSelection(item.id);
      }
    },
    [
      allowsMultipleSelection,
      maxSelection,
      onComplete,
      selectedCount,
      selectedIdSet,
      toggleSelection,
    ]
  );

  /**
   * 处理照片点击：进入预览
   */
  const openPreviewAtIndex = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  const handlePhotoPress = useCallback(
    (_item: PhotoAlbumItem, index: number) => {
      openPreviewAtIndex(index);
    },
    [openPreviewAtIndex]
  );

  /**
   * 处理完成选择
   */
  const handleComplete = useCallback(() => {
    const selected = getSelectedPhotos();
    onComplete?.(selected);
  }, [getSelectedPhotos, onComplete]);

  const handlePreviewComplete = useCallback(() => {
    if (!previewItem) return;

    const selected = getSelectedPhotos();
    if (!allowsMultipleSelection || selected.length === 0) {
      commitPreviewSelection(setPreviewIndex, onComplete, [previewItem]);
      return;
    }

    commitPreviewSelection(setPreviewIndex, onComplete, selected);
  }, [allowsMultipleSelection, getSelectedPhotos, onComplete, previewItem]);

  const closePreview = useCallback(() => {
    setPreviewIndex(null);
  }, []);

  const handlePreviewToggleSelect = useCallback(() => {
    if (!previewItem) return;

    if (!allowsMultipleSelection) {
      commitPreviewSelection(setPreviewIndex, onComplete, [previewItem]);
      return;
    }

    handleToggleSelect(previewItem);
  }, [allowsMultipleSelection, handleToggleSelect, onComplete, previewItem]);

  const openSelectedPreview = useCallback(() => {
    const firstSelected = selectedPhotos[0];
    if (!firstSelected) return;
    const index = photos.findIndex(item => item.id === firstSelected.id);
    if (index >= 0) {
      openPreviewAtIndex(index);
    }
  }, [openPreviewAtIndex, photos, selectedPhotos]);

  React.useEffect(() => {
    if (previewIndex === null) return;

    requestAnimationFrame(() => {
      previewListRef.current?.scrollToIndex({
        animated: false,
        index: previewIndex,
      });
    });
  }, [previewIndex]);

  const handlePreviewMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (nextIndex < 0 || nextIndex >= photos.length || nextIndex === previewIndex) return;

      setPreviewIndex(nextIndex);
    },
    [photos.length, previewIndex]
  );

  const handleEndReached = useCallback(() => {
    if (!hasMore || initialLoading || loadingMore) return;
    void loadMore();
  }, [hasMore, initialLoading, loadMore, loadingMore]);

  const handleGridScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!hasMore || initialLoading || loadingMore) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceToBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);

      if (distanceToBottom <= SCREEN_HEIGHT * 1.5) {
        void loadMore();
      }
    },
    [hasMore, initialLoading, loadMore, loadingMore]
  );

  const handleGridContentSizeChange = useCallback(
    (_width: number, height: number) => {
      if (!hasMore || initialLoading || loadingMore) return;

      if (height <= SCREEN_HEIGHT * 1.2) {
        void loadMore();
      }
    },
    [hasMore, initialLoading, loadMore, loadingMore]
  );

  /**
   * 渲染单个照片项
   */
  const renderItem = useCallback(
    ({ item, index }: { item: PhotoAlbumItem; index: number }) => {
      return (
        <PhotoGridItem
          item={item}
          index={index}
          itemSize={itemSize}
          spacing={spacing}
          isSelected={selectedIdSet.has(item.id)}
          selectedIndex={selectedIndexMap.get(item.id) || 0}
          showSelectedCount={showSelectedCount}
          onPress={handlePhotoPress}
          onToggleSelect={handleToggleSelect}
          renderSelectedOverlay={renderSelectedOverlay}
        />
      );
    },
    [
      itemSize,
      spacing,
      selectedIdSet,
      selectedIndexMap,
      showSelectedCount,
      handlePhotoPress,
      handleToggleSelect,
      renderSelectedOverlay,
    ]
  );

  /**
   * 渲染底部加载指示器
   */
  const renderFooter = useCallback(() => {
    if (!loadingMore || !hasMore) return null;
    return (
      <PhotoAlbumGridPlaceholder
        itemSize={itemSize}
        spacing={spacing}
        numColumns={numColumns}
        isDark={isDark}
        rows={2}
      />
    );
  }, [hasMore, isDark, itemSize, loadingMore, numColumns, spacing]);

  /**
   * 渲染底部工具栏
   */
  const renderDefaultToolbar = useCallback(() => {
    const disabled = selectedCount === 0;

    return (
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: isDark ? mediaPickerColors.slate[800] : '#ffffff',
            borderTopColor: isDark ? mediaPickerColors.slate[700] : mediaPickerColors.slate[200],
            paddingBottom: toolbarBottomInset,
          },
        ]}
      >
        <View style={styles.toolbarMainRow}>
          <View style={styles.toolbarLeft}>
            <AppPressable onPress={onCancel} style={styles.toolbarButton}>
              <AppText
                size="md"
                style={{
                  color: isDark ? mediaPickerColors.slate[300] : mediaPickerColors.slate[600],
                }}
              >
                {resolvedUiConfig.texts.cancelButton}
              </AppText>
            </AppPressable>
          </View>

          <View style={styles.toolbarRight}>
            <View style={styles.toolbarActions}>
              <AppPressable
                onPress={openSelectedPreview}
                disabled={disabled}
                style={styles.toolbarButton}
              >
                <AppText
                  size="md"
                  style={{
                    color: disabled ? mediaPickerColors.slate[400] : mediaPickerColors.primary[500],
                  }}
                >
                  {resolvedUiConfig.texts.previewButton}
                </AppText>
              </AppPressable>

              <AppPressable
                onPress={handleComplete}
                disabled={disabled}
                style={[
                  styles.completeButton,
                  {
                    backgroundColor: disabled
                      ? isDark
                        ? mediaPickerColors.slate[600]
                        : mediaPickerColors.slate[300]
                      : mediaPickerColors.primary[500],
                  },
                ]}
              >
                <AppText
                  size="md"
                  weight="semibold"
                  style={{ color: disabled ? mediaPickerColors.slate[400] : '#ffffff' }}
                >
                  {resolvedUiConfig.texts.completeButton}
                </AppText>
              </AppPressable>
            </View>
          </View>
        </View>

        <View pointerEvents="none" style={styles.toolbarCenterOverlay}>
          {selectedCount > 0 && (
            <AppText size="md" weight="medium">
              {toolbarSelectedCountText}
            </AppText>
          )}
        </View>
      </View>
    );
  }, [
    selectedCount,
    isDark,
    onCancel,
    openSelectedPreview,
    handleComplete,
    resolvedUiConfig.texts.cancelButton,
    resolvedUiConfig.texts.completeButton,
    resolvedUiConfig.texts.previewButton,
    toolbarBottomInset,
    toolbarSelectedCountText,
  ]);

  /**
   * 权限请求界面
   */
  if (permissionStatus === null) {
    return (
      <View style={styles.container}>
        <PhotoAlbumGridPlaceholder
          itemSize={itemSize}
          spacing={spacing}
          numColumns={numColumns}
          isDark={isDark}
          rows={initialPlaceholderRows}
        />
      </View>
    );
  }

  if (permissionStatus !== 'granted') {
    const shouldOpenSettings = permissionCanAskAgain === false;
    const permissionButtonText = shouldOpenSettings
      ? resolvedUiConfig.texts.permissionOpenSettingsButton
      : resolvedUiConfig.texts.permissionAllowButton;
    const permissionButtonBackgroundColor = shouldOpenSettings
      ? resolvedUiConfig.theme.permissionSettingsButtonBackgroundColor
      : resolvedUiConfig.theme.permissionButtonBackgroundColor;
    const permissionButtonTextColor = shouldOpenSettings
      ? resolvedUiConfig.theme.permissionSettingsButtonTextColor
      : resolvedUiConfig.theme.permissionButtonTextColor;

    return (
      <Center style={styles.permissionContainer}>
        <Icon
          name="photo-library"
          size={64}
          color={isDark ? mediaPickerColors.slate[600] : mediaPickerColors.slate[300]}
        />
        <AppText
          size="lg"
          weight="medium"
          style={[
            styles.permissionTitle,
            { color: isDark ? mediaPickerColors.slate[200] : mediaPickerColors.slate[700] },
          ]}
        >
          {resolvedUiConfig.texts.permissionTitle}
        </AppText>
        <AppText
          size="sm"
          style={[
            styles.permissionDesc,
            { color: isDark ? mediaPickerColors.slate[400] : mediaPickerColors.slate[500] },
          ]}
        >
          {resolvedUiConfig.texts.permissionDescription}
        </AppText>
        <AppPressable
          onPress={async () => {
            const granted = await requestPermission();
            if (granted) {
              await refresh();
            } else if (!shouldOpenSettings) {
              onPermissionDenied?.();
            }
          }}
          style={[
            styles.permissionButton,
            {
              backgroundColor: permissionButtonBackgroundColor,
            },
          ]}
        >
          <AppText size="md" weight="semibold" style={{ color: permissionButtonTextColor }}>
            {permissionButtonText}
          </AppText>
        </AppPressable>
      </Center>
    );
  }

  if (error) {
    return (
      <Center style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color={mediaPickerColors.error.DEFAULT} />
        <AppText size="md" style={{ marginTop: 12, color: mediaPickerColors.slate[500] }}>
          {error.message}
        </AppText>
        <AppPressable onPress={refresh} style={styles.retryButton}>
          <AppText size="md" style={{ color: mediaPickerColors.primary[500] }}>
            {resolvedUiConfig.texts.retryButton}
          </AppText>
        </AppPressable>
      </Center>
    );
  }

  return (
    <View style={styles.container}>
      {initialLoading && photos.length === 0 ? (
        <View style={styles.loadingContainer}>
          <PhotoAlbumGridPlaceholder
            itemSize={itemSize}
            spacing={spacing}
            numColumns={numColumns}
            isDark={isDark}
            rows={initialPlaceholderRows}
          />
        </View>
      ) : null}

      {/* 照片网格 */}
      <FlashList
        data={photos}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        showsVerticalScrollIndicator={false}
        onEndReached={hasMore ? handleEndReached : undefined}
        onEndReachedThreshold={0.4}
        onScroll={handleGridScroll}
        onContentSizeChange={handleGridContentSizeChange}
        scrollEventThrottle={16}
        onViewableItemsChanged={handleGridViewableItemsChanged}
        ListFooterComponent={renderFooter}
        drawDistance={itemSize * GRID_DRAW_DISTANCE_ROWS}
        removeClippedSubviews
        extraData={selectedIndexMap}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 20,
        }}
        contentContainerStyle={{
          padding: spacing / 2,
          paddingBottom: 80, // 为底部工具栏留出空间
        }}
      />

      {/* 底部工具栏 */}
      {renderToolbar ? renderToolbar(selectedCount, handleComplete) : renderDefaultToolbar()}

      <Modal
        visible={previewIndex !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closePreview}
      >
        <View style={styles.previewContainer}>
          <View
            style={[
              styles.previewHeader,
              {
                height: previewHeaderHeight,
                paddingTop: insets.top,
              },
            ]}
          >
            <AppPressable onPress={closePreview} style={styles.previewHeaderButton}>
              <Icon name="close" size={24} color="#ffffff" />
            </AppPressable>

            <AppText size="md" weight="medium" style={{ color: '#ffffff' }}>
              {previewIndexText}
            </AppText>

            <AppPressable onPress={handlePreviewToggleSelect} style={styles.previewHeaderButton}>
              <View
                style={[
                  styles.previewSelectBadge,
                  {
                    backgroundColor:
                      previewItem && selectedIdSet.has(previewItem.id)
                        ? mediaPickerColors.primary[500]
                        : 'rgba(0,0,0,0.3)',
                    borderColor: '#ffffff',
                  },
                ]}
              >
                {previewItem && selectedIdSet.has(previewItem.id) ? (
                  <AppText size="xs" weight="bold" style={{ color: '#ffffff' }}>
                    {selectedIndexMap.get(previewItem.id) || '✓'}
                  </AppText>
                ) : null}
              </View>
            </AppPressable>
          </View>

          {previewIndex !== null ? (
            <FlatList
              ref={previewListRef}
              data={photos}
              horizontal
              pagingEnabled
              style={{ height: previewContentHeight }}
              initialScrollIndex={previewIndex}
              renderItem={({ item }) => (
                <View style={[styles.previewPage, { height: previewContentHeight }]}>
                  <PreviewMedia
                    item={item}
                    previewHeight={previewContentHeight - 20}
                    active={item.id === previewItem?.id}
                    previewVideoBadgeText={resolvedUiConfig.texts.previewVideoBadgeText}
                  />
                </View>
              )}
              keyExtractor={item => `preview-${item.id}`}
              getItemLayout={(_, index) => ({
                index,
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
              })}
              onMomentumScrollEnd={handlePreviewMomentumScrollEnd}
              onScrollToIndexFailed={({ index }) => {
                requestAnimationFrame(() => {
                  previewListRef.current?.scrollToIndex({
                    animated: false,
                    index,
                  });
                });
              }}
              showsHorizontalScrollIndicator={false}
              removeClippedSubviews={false}
              windowSize={2}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
            />
          ) : null}

          <View
            style={[
              styles.previewFooter,
              {
                height: previewFooterHeight,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <AppText size="sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {previewSelectedCountText}
            </AppText>

            <View style={styles.toolbarActions}>
              <AppPressable onPress={closePreview} style={styles.toolbarButton}>
                <AppText size="md" style={{ color: '#ffffff' }}>
                  {resolvedUiConfig.texts.backButton}
                </AppText>
              </AppPressable>

              <AppPressable
                onPress={handlePreviewComplete}
                style={[
                  styles.completeButton,
                  {
                    backgroundColor: mediaPickerColors.primary[500],
                  },
                ]}
              >
                <AppText size="md" weight="semibold" style={{ color: '#ffffff' }}>
                  {resolvedUiConfig.texts.completeButton}
                </AppText>
              </AppPressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * 格式化视频时长
 */
function formatDuration(duration?: number | null): string {
  const totalSeconds = Math.max(
    0,
    Math.floor(Number.isFinite(duration) ? (duration as number) : 0)
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function safelyCallVideoPlayer(call: () => unknown) {
  try {
    const result = call();
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      void (result as Promise<unknown>).catch(() => {});
    }
  } catch {
    // expo-video may already have released the shared object during modal teardown.
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'none',
  },
  placeholderGrid: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 1,
  },
  placeholderRow: {
    flexDirection: 'row',
  },
  placeholderCell: {
    borderRadius: 0,
  },
  photoItem: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: mediaPickerColors.slate[100],
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  videoDuration: {
    color: '#ffffff',
    marginLeft: 2,
    fontSize: 10,
  },
  footer: {
    paddingVertical: 16,
  },
  toolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  toolbarMainRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolbarButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  toolbarLeft: {
    minWidth: 72,
    alignItems: 'flex-start',
    zIndex: 1,
  },
  toolbarRight: {
    zIndex: 1,
  },
  toolbarCenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButton: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 6,
    marginLeft: 8,
  },
  permissionContainer: {
    flex: 1,
    padding: 24,
  },
  permissionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  permissionDesc: {
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: mediaPickerColors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  errorContainer: {
    flex: 1,
    padding: 24,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewHeader: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  previewHeaderButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSelectBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewVideoContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewVideo: {
    width: SCREEN_WIDTH,
  },
  previewVideoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewVideoPlayButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 160,
  },
  previewVideoBadge: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  previewFooter: {
    position: 'relative',
    zIndex: 2,
    elevation: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
