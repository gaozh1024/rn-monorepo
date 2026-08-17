import React, { useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { useTheme, useThemeColors, useOptionalTheme } from '@/theme';
import { AppView, AppText, AppPressable } from '@/ui/primitives';
import { Icon } from './Icon';
import { Center } from '@/ui/layout';
import { SkeletonAvatar, SkeletonText } from '@/ui/feedback';
import { cn } from '@/utils';
import { StaggerItem } from '@/ui/motion';
import { createReanimatedView } from '@/ui/motion/components/ReanimatedView';
import { KeyboardDismissPressable } from '../primitives/KeyboardDismissPressable';
import {
  resolveMotionLayoutProps,
  type MotionEntryExitAnimation,
  type MotionLayoutAnimation,
  type StaggerMotionProps,
} from '../motion';
import { resolveNamedColor, resolveSurfaceColor } from '../utils/theme-color';
import {
  type CommonLayoutProps,
  type LayoutSurface,
  resolveLayoutStyle,
  resolveRoundedStyle,
  resolveSizingStyle,
  resolveSpacingStyle,
} from '../utils/layout-shortcuts';

export interface AppListProps<T = any>
  extends
    Pick<
      CommonLayoutProps,
      | 'flex'
      | 'row'
      | 'wrap'
      | 'center'
      | 'between'
      | 'items'
      | 'justify'
      | 'p'
      | 'px'
      | 'py'
      | 'pt'
      | 'pb'
      | 'pl'
      | 'pr'
      | 'm'
      | 'mx'
      | 'my'
      | 'mt'
      | 'mb'
      | 'ml'
      | 'mr'
      | 'gap'
      | 'rounded'
      | 'w'
      | 'h'
      | 'minW'
      | 'minH'
      | 'maxW'
      | 'maxH'
    >,
    StaggerMotionProps {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor?: (item: T, index: number) => string;

  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;

  hasMore?: boolean;
  onEndReached?: () => void | Promise<void>;
  onEndReachedThreshold?: number;

  error?: Error | null;
  onRetry?: () => void;
  errorTitle?: string;
  errorDescription?: string;
  retryText?: string;

  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  EmptyComponent?: React.ComponentType;

  divider?: boolean;
  dividerStyle?: StyleProp<ViewStyle>;

  skeletonCount?: number;
  skeletonRender?: () => React.ReactElement;

  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  numColumns?: number;
  columnWrapperStyle?: StyleProp<ViewStyle>;
  horizontal?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  bg?: string;
  surface?: LayoutSurface;
  className?: string;
  dismissKeyboardOnPressOutside?: boolean;
  /** 是否为列表项启用错峰入场动画 */
  stagger?: boolean;
  /** 非错峰布局动画是否关闭 */
  motionReduceMotion?: boolean;
}

function renderListSlot(
  slot?: React.ComponentType | React.ReactElement | null
): React.ReactElement | null {
  if (!slot) return null;
  if (React.isValidElement(slot)) return slot;
  if (typeof slot === 'function') {
    const SlotComponent = slot as React.ComponentType;
    return <SlotComponent />;
  }
  return null;
}

function SkeletonItem({ render }: { render?: () => React.ReactElement }) {
  if (render) {
    return render();
  }

  return (
    <AppView p={4} gap={3} testID="skeleton">
      <AppView row gap={3}>
        <SkeletonAvatar size={64} rounded="lg" />
        <AppView flex gap={2}>
          <SkeletonText lines={2} lineHeight={14} spacing={8} lineWidths={['75%', '50%']} />
        </AppView>
      </AppView>
    </AppView>
  );
}

function EmptyState({
  title,
  description,
  icon,
}: {
  title?: string;
  description?: string;
  icon?: string;
}) {
  const colors = useThemeColors();

  return (
    <Center py={20}>
      <Icon name={icon || 'inbox'} size={64} color={colors.textMuted} />
      <AppText size="lg" weight="medium" className="mt-4" style={{ color: colors.text }}>
        {title || '暂无数据'}
      </AppText>
      {description && (
        <AppText size="sm" className="mt-2" style={{ color: colors.textMuted }}>
          {description}
        </AppText>
      )}
    </Center>
  );
}

function ErrorState({
  error,
  onRetry,
  errorTitle,
  errorDescription,
  retryText,
}: {
  error: Error;
  onRetry?: () => void;
  errorTitle?: string;
  errorDescription?: string;
  retryText?: string;
}) {
  const colors = useThemeColors();

  return (
    <Center py={20}>
      <Icon name="error-outline" size={64} color="error-300" />
      <AppText size="lg" weight="medium" color="error-500" className="mt-4">
        {errorTitle || '加载失败'}
      </AppText>
      <AppText size="sm" style={{ color: colors.textMuted }} className="mt-2 text-center px-8">
        {error.message || errorDescription || '请检查网络后重试'}
      </AppText>
      {onRetry && (
        <AppPressable
          onPress={onRetry}
          mt={24}
          px={16}
          py={8}
          rounded="lg"
          style={[
            styles.retryButton,
            { backgroundColor: colors.cardElevated, borderColor: colors.border },
          ]}
        >
          <AppText style={{ color: colors.textSecondary }} className="text-center">
            {retryText || '重新加载'}
          </AppText>
        </AppPressable>
      )}
    </Center>
  );
}

function LoadMoreFooter({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <Center py={4}>
      <ActivityIndicator size="small" />
    </Center>
  );
}

function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useThemeColors();
  return (
    <AppView
      className="h-px"
      style={[{ marginVertical: 0 }, { backgroundColor: colors.divider }, style]}
    />
  );
}

function AppListMotionItem({
  children,
  entering,
  exiting,
  layout,
}: {
  children: React.ReactNode;
  entering?: MotionEntryExitAnimation;
  exiting?: MotionEntryExitAnimation;
  layout?: MotionLayoutAnimation;
}) {
  return createReanimatedView({ entering, exiting, layout }, children);
}

export function AppList<T = any>({
  flex,
  row,
  wrap,
  center,
  between,
  items,
  justify,
  p,
  px,
  py,
  pt,
  pb,
  pl,
  pr,
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  gap,
  rounded,
  w,
  h,
  minW,
  minH,
  maxW,
  maxH,
  data,
  renderItem,
  keyExtractor,

  loading = false,
  refreshing = false,
  onRefresh,

  hasMore = false,
  onEndReached,
  onEndReachedThreshold = 0.5,

  error,
  onRetry,
  errorTitle,
  errorDescription,
  retryText,

  emptyTitle,
  emptyDescription,
  emptyIcon,
  EmptyComponent,

  divider = false,
  dividerStyle,

  skeletonCount = 6,
  skeletonRender,

  ListHeaderComponent,
  ListFooterComponent,
  contentContainerStyle,
  style,
  numColumns,
  columnWrapperStyle,
  horizontal,
  showsVerticalScrollIndicator,
  showsHorizontalScrollIndicator,
  bg,
  surface,
  className,
  dismissKeyboardOnPressOutside = false,
  stagger = false,
  motionReduceMotion,
  staggerPreset,
  staggerMs = 40,
  staggerBaseDelayMs,
  staggerDuration,
  staggerDistance,
  staggerReduceMotion,
  motionEntering,
  motionExiting,
  motionLayout,
  motionLayoutPreset,
  motionLayoutDuration,
  motionLayoutDelay,
  motionLayoutSpring,
}: AppListProps<T>) {
  const { theme } = useTheme();
  const { theme: optionalTheme, isDark } = useOptionalTheme();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const resolvedBgColor =
    resolveSurfaceColor(surface, optionalTheme, isDark) ??
    resolveNamedColor(bg, optionalTheme, isDark);
  const shouldUseClassBg = !!bg && !resolvedBgColor;
  const resolvedListStyle = useMemo(
    () => [
      resolvedBgColor ? { backgroundColor: resolvedBgColor } : undefined,
      resolveLayoutStyle({ flex }),
      resolveSpacingStyle({ m, mx, my, mt, mb, ml, mr }),
      resolveSizingStyle({ w, h, minW, minH, maxW, maxH }),
      resolveRoundedStyle(rounded),
      style,
    ],
    [flex, h, m, maxH, maxW, mb, minH, minW, ml, mr, mt, mx, my, rounded, style, resolvedBgColor, w]
  );
  const resolvedContentStyle = useMemo(
    () => [
      resolveLayoutStyle({
        row,
        wrap,
        center,
        between,
        items,
        justify,
        gap,
      }),
      resolveSpacingStyle({ p, px, py, pt, pb, pl, pr }),
      contentContainerStyle,
    ],
    [
      between,
      center,
      contentContainerStyle,
      gap,
      items,
      justify,
      p,
      pb,
      pl,
      pr,
      pt,
      px,
      py,
      row,
      wrap,
    ]
  );

  const handleEndReached = useCallback(async () => {
    if (isLoadingMore || !hasMore || !onEndReached) return;

    setIsLoadingMore(true);
    try {
      await onEndReached();
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, onEndReached]);

  const defaultKeyExtractor = useCallback(
    (item: T, index: number) => {
      if (keyExtractor) return keyExtractor(item, index);
      return `item-${index}`;
    },
    [keyExtractor]
  );

  const itemMotionProps = useMemo(
    () =>
      resolveMotionLayoutProps({
        entering: motionEntering,
        exiting: motionExiting,
        layout: motionLayout,
        preset: motionLayoutPreset,
        duration: motionLayoutDuration,
        delay: motionLayoutDelay,
        spring: motionLayoutSpring,
        reduceMotion: motionReduceMotion,
      }),
    [
      motionEntering,
      motionExiting,
      motionLayout,
      motionLayoutDelay,
      motionLayoutDuration,
      motionLayoutPreset,
      motionLayoutSpring,
      motionReduceMotion,
    ]
  );

  const shouldWrapItemWithMotion = useMemo(
    () =>
      stagger ||
      Boolean(itemMotionProps?.entering || itemMotionProps?.exiting || itemMotionProps?.layout),
    [itemMotionProps, stagger]
  );

  const wrappedRenderItem = useCallback(
    (info: any) => {
      const content = (
        <>
          {divider && info.index > 0 && <Divider style={dividerStyle} />}
          {renderItem(info)}
        </>
      );

      if (!shouldWrapItemWithMotion) return content;

      if (stagger) {
        return (
          <StaggerItem
            index={info.index}
            visible
            staggerPreset={staggerPreset}
            staggerMs={staggerMs}
            staggerBaseDelayMs={staggerBaseDelayMs}
            staggerDuration={staggerDuration}
            staggerDistance={staggerDistance}
            staggerReduceMotion={staggerReduceMotion}
            motionEntering={motionEntering}
            motionExiting={motionExiting}
            motionLayout={motionLayout}
            motionLayoutPreset={motionLayoutPreset}
            motionLayoutDuration={motionLayoutDuration}
            motionLayoutDelay={motionLayoutDelay}
            motionLayoutSpring={motionLayoutSpring}
          >
            {content}
          </StaggerItem>
        );
      }

      return (
        <AppListMotionItem
          entering={itemMotionProps?.entering}
          exiting={itemMotionProps?.exiting}
          layout={itemMotionProps?.layout}
        >
          {content}
        </AppListMotionItem>
      );
    },
    [
      divider,
      dividerStyle,
      itemMotionProps?.entering,
      itemMotionProps?.exiting,
      itemMotionProps?.layout,
      motionEntering,
      motionExiting,
      motionLayout,
      motionLayoutDelay,
      motionLayoutDuration,
      motionLayoutPreset,
      motionLayoutSpring,
      renderItem,
      shouldWrapItemWithMotion,
      stagger,
      staggerBaseDelayMs,
      staggerDistance,
      staggerDuration,
      staggerMs,
      staggerPreset,
      staggerReduceMotion,
    ]
  );

  const skeletonData = useMemo(
    () => new Array(skeletonCount).fill(null).map((_, i) => ({ _skeletonId: i })),
    [skeletonCount]
  );

  const skeletonRenderItem = useCallback(
    () => <SkeletonItem render={skeletonRender} />,
    [skeletonRender]
  );

  const flatListKey = useMemo(() => {
    if (horizontal) return 'app-list-horizontal';
    return `app-list-columns-${numColumns ?? 1}`;
  }, [horizontal, numColumns]);

  const renderFlatList = (
    listData: readonly T[] | readonly { _skeletonId: number }[],
    listRenderItem: ListRenderItem<any>,
    listKeyExtractor: (item: any, index: number) => string,
    listKey?: string,
    extraProps?: Partial<React.ComponentProps<typeof FlatList<any>>>
  ) => (
    <FlatList
      key={listKey ?? flatListKey}
      className={cn(shouldUseClassBg && `bg-${bg}`, className)}
      data={listData as any}
      renderItem={listRenderItem}
      keyExtractor={listKeyExtractor}
      contentContainerStyle={resolvedContentStyle}
      style={resolvedListStyle}
      numColumns={numColumns}
      columnWrapperStyle={columnWrapperStyle}
      horizontal={horizontal}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      keyboardShouldPersistTaps={
        dismissKeyboardOnPressOutside
          ? (extraProps?.keyboardShouldPersistTaps ?? 'handled')
          : extraProps?.keyboardShouldPersistTaps
      }
      {...extraProps}
    />
  );

  const renderListWithKeyboardDismiss = (content: React.ReactElement) => {
    if (!dismissKeyboardOnPressOutside) {
      return content;
    }

    return <KeyboardDismissPressable>{content}</KeyboardDismissPressable>;
  };

  if (loading && data.length === 0) {
    return renderListWithKeyboardDismiss(
      renderFlatList(
        skeletonData,
        skeletonRenderItem,
        (_, index) => `skeleton-${index}`,
        `${flatListKey}-skeleton`
      )
    );
  }

  if (error && data.length === 0) {
    return (
      <AppView className={cn(shouldUseClassBg && `bg-${bg}`, className)} style={resolvedListStyle}>
        <Center flex>
          <ErrorState
            error={error}
            onRetry={onRetry}
            errorTitle={errorTitle}
            errorDescription={errorDescription}
            retryText={retryText}
          />
        </Center>
      </AppView>
    );
  }

  const ListEmptyComponent = useMemo(() => {
    if (EmptyComponent) return renderListSlot(EmptyComponent);
    return <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />;
  }, [EmptyComponent, emptyTitle, emptyDescription, emptyIcon]);

  const FooterComponent = useMemo(() => {
    return (
      <>
        <LoadMoreFooter loading={isLoadingMore} />
        {renderListSlot(ListFooterComponent)}
      </>
    );
  }, [isLoadingMore, ListFooterComponent]);

  const HeaderComponent = useMemo(() => renderListSlot(ListHeaderComponent), [ListHeaderComponent]);

  return renderListWithKeyboardDismiss(
    renderFlatList(data, wrappedRenderItem, defaultKeyExtractor, undefined, {
      refreshControl: onRefresh ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary?.[500]}
          colors={[theme.colors.primary?.[500]]}
        />
      ) : undefined,
      onEndReached: onEndReached ? handleEndReached : undefined,
      onEndReachedThreshold,
      ListEmptyComponent,
      ListHeaderComponent: HeaderComponent,
      ListFooterComponent: FooterComponent,
      removeClippedSubviews: true,
      maxToRenderPerBatch: 10,
      windowSize: 10,
      initialNumToRender: 10,
    })
  );
}

const styles = StyleSheet.create({
  retryButton: {
    borderWidth: 0.5,
  },
});
