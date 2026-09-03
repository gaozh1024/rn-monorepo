import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import type { AppStateStatus } from 'react-native';
import {
  requestPermissionsAsync,
  getPermissionsAsync,
  getAssetsAsync,
  getAssetInfoAsync,
  presentPermissionsPickerAsync,
  PermissionStatus,
  MediaTypeValue,
  SortByValue,
} from 'expo-media-library';
import type { PhotoAlbumItem, PhotoAlbumPermissionConfig, PhotoAlbumUiTexts } from '../types';
import {
  DEFAULT_PHOTO_ALBUM_PERMISSION_CONFIG,
  DEFAULT_PHOTO_ALBUM_UI_TEXTS,
} from '../utils/photoAlbumFlow';
import {
  hasMediaAccess,
  MEDIA_PERMISSION_TYPES,
  resolveMediaAccessPrivileges,
} from '../utils/mediaAccess';
import type { PhotoAlbumAccessPrivileges } from '../utils/mediaAccess';

export type { PhotoAlbumAccessPrivileges } from '../utils/mediaAccess';

const MAX_CURSOR_STALL_RETRIES = 2;
const MAX_PAGE_SIZE_MULTIPLIER = 4;
const DEFAULT_MEDIA_TYPES: MediaTypeValue[] = ['photo'];
const DEFAULT_SORT_BY: SortByValue[] = [
  ['creationTime', false],
  ['modificationTime', false],
];

interface FetchPageResult {
  assets: PhotoAlbumItem[];
  endCursor?: string;
  hasNextPage: boolean;
  totalCount: number;
}

type AssetInfoRecord = Partial<PhotoAlbumItem> & Record<string, unknown>;
type MediaLibraryPermissionResponse = Awaited<ReturnType<typeof getPermissionsAsync>>;

export interface PhotoAlbumPaginationDebugInfo {
  totalCount: number;
  pageCount: number;
  cursor: string | null;
  lastRequestCursor: string | null;
  lastPageSize: number;
  lastReturnedCount: number;
  lastUniqueCount: number;
  hasNextPage: boolean;
  stallCount: number;
}

export interface UsePhotoAlbumOptions {
  /** 初始加载数量 */
  initialLoadCount?: number;
  /** 每次加载更多数量 */
  loadMoreCount?: number;
  /** 媒体类型筛选 */
  mediaType?: MediaTypeValue[];
  /** 排序字段 */
  sortBy?: SortByValue[];
  /** UI 文案配置 */
  uiTexts?: Partial<PhotoAlbumUiTexts>;
  /** 权限行为配置 */
  permission?: PhotoAlbumPermissionConfig;
}

export interface UsePhotoAlbumReturn {
  /** 照片列表 */
  photos: PhotoAlbumItem[];
  /** 是否加载中 */
  loading: boolean;
  /** 首屏是否加载中 */
  initialLoading: boolean;
  /** 翻页是否加载中 */
  loadingMore: boolean;
  /** 是否还有更多 */
  hasMore: boolean;
  /** 权限状态 */
  permissionStatus: PermissionStatus | null;
  /** 系统是否还允许再次弹出权限申请框 */
  permissionCanAskAgain: boolean | null;
  /** 当前可访问的媒体库范围 */
  accessPrivileges: PhotoAlbumAccessPrivileges | null;
  /** 错误信息 */
  error: Error | null;
  /** 请求权限 */
  requestPermission: () => Promise<boolean>;
  /** 管理系统已允许访问的照片和视频范围 */
  manageLimitedAccess: () => Promise<void>;
  /** 加载更多 */
  loadMore: () => Promise<void>;
  /** 刷新列表 */
  refresh: () => Promise<void>;
  /** 切换选中状态 */
  toggleSelection: (id: string) => void;
  /** 设置选中项 */
  setSelectedIds: (ids: string[]) => void;
  /** 获取选中项 */
  getSelectedPhotos: () => PhotoAlbumItem[];
  /** 清除选中 */
  clearSelection: () => void;
  /** 选中数量 */
  selectedCount: number;
  /** 分页调试信息 */
  paginationDebugInfo: PhotoAlbumPaginationDebugInfo;
}

/**
 * 相册管理 Hook
 *
 * 功能：
 * 1. 请求并管理相册权限
 * 2. 分页加载照片
 * 3. 管理选中状态
 *
 * 类似微信的实现：
 * - 按时间倒序排列（最新的在前）
 * - 支持分页加载
 * - 支持多选管理
 */
export function usePhotoAlbum(options: UsePhotoAlbumOptions = {}): UsePhotoAlbumReturn {
  const {
    initialLoadCount = 400,
    loadMoreCount = 240,
    mediaType = DEFAULT_MEDIA_TYPES,
    sortBy = DEFAULT_SORT_BY,
    uiTexts,
    permission,
  } = options;

  const [photos, setPhotos] = useState<PhotoAlbumItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [permissionCanAskAgain, setPermissionCanAskAgain] = useState<boolean | null>(null);
  const [accessPrivileges, setAccessPrivileges] = useState<PhotoAlbumAccessPrivileges | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const [paginationDebugInfo, setPaginationDebugInfo] = useState<PhotoAlbumPaginationDebugInfo>({
    totalCount: 0,
    pageCount: 0,
    cursor: null,
    lastRequestCursor: null,
    lastPageSize: initialLoadCount,
    lastReturnedCount: 0,
    lastUniqueCount: 0,
    hasNextPage: true,
    stallCount: 0,
  });

  // 使用 ref 存储 endCursor 用于分页
  const endCursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const openedSettingsRef = useRef(false);
  const pageCountRef = useRef(0);
  const stallCountRef = useRef(0);
  const photoIdsRef = useRef<Set<string>>(new Set());
  const hasMediaAccessRef = useRef(false);

  const mergeUniqueAssets = useCallback((prev: PhotoAlbumItem[], next: PhotoAlbumItem[]) => {
    if (prev.length === 0) return next;

    const seen = new Set(prev.map(item => item.id));
    const merged = [...prev];

    for (const item of next) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }

    return merged;
  }, []);

  const applyPermissionResponse = useCallback((response: MediaLibraryPermissionResponse) => {
    const privileges = resolveMediaAccessPrivileges(response);
    hasMediaAccessRef.current = hasMediaAccess(response);

    if (!mountedRef.current) return;

    setPermissionStatus(response.status);
    setPermissionCanAskAgain(response.canAskAgain ?? null);
    setAccessPrivileges(privileges);
  }, []);

  const getUiText = useCallback(
    <Key extends keyof PhotoAlbumUiTexts>(key: Key): Required<PhotoAlbumUiTexts>[Key] => {
      return uiTexts?.[key] ?? DEFAULT_PHOTO_ALBUM_UI_TEXTS[key];
    },
    [uiTexts]
  );

  const openPermissionSettings = useCallback(async () => {
    try {
      openedSettingsRef.current = true;
      await Linking.openSettings();
    } catch (err) {
      openedSettingsRef.current = false;
      setError(err instanceof Error ? err : new Error(getUiText('permissionRequestError')));
    }
  }, [getUiText]);

  const handleBlockedPermission = useCallback(async () => {
    const openSettingsMode =
      permission?.openSettingsMode ?? DEFAULT_PHOTO_ALBUM_PERMISSION_CONFIG.openSettingsMode;

    if (openSettingsMode === 'disabled') return;

    if (openSettingsMode === 'direct') {
      await openPermissionSettings();
      return;
    }

    Alert.alert(
      getUiText('permissionSettingsAlertTitle'),
      getUiText('permissionSettingsAlertMessage'),
      [
        {
          text: getUiText('permissionSettingsAlertCancelButton'),
          style: 'cancel',
        },
        {
          text: getUiText('permissionSettingsAlertConfirmButton'),
          onPress: () => {
            void openPermissionSettings();
          },
        },
      ]
    );
  }, [getUiText, openPermissionSettings, permission?.openSettingsMode]);

  /**
   * 请求相册权限
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const currentPermission = await getPermissionsAsync(false, [...MEDIA_PERMISSION_TYPES]);
      applyPermissionResponse(currentPermission);

      if (hasMediaAccess(currentPermission)) return true;

      if (currentPermission.canAskAgain === false) {
        await handleBlockedPermission();
        return false;
      }

      const nextPermission = await requestPermissionsAsync(false, [...MEDIA_PERMISSION_TYPES]);
      applyPermissionResponse(nextPermission);

      if (hasMediaAccess(nextPermission)) return true;

      if (nextPermission.canAskAgain === false) {
        await handleBlockedPermission();
      }

      return false;
    } catch (err) {
      hasMediaAccessRef.current = false;
      setError(
        err instanceof Error ? err : new Error(uiTexts?.permissionRequestError ?? '请求权限失败')
      );
      return false;
    }
  }, [applyPermissionResponse, handleBlockedPermission, uiTexts?.permissionRequestError]);

  /**
   * 检查权限状态
   */
  const checkPermission = useCallback(async (): Promise<boolean> => {
    try {
      const currentPermission = await getPermissionsAsync(false, [...MEDIA_PERMISSION_TYPES]);
      applyPermissionResponse(currentPermission);
      return hasMediaAccess(currentPermission);
    } catch (err) {
      hasMediaAccessRef.current = false;
      setError(
        err instanceof Error ? err : new Error(uiTexts?.permissionCheckError ?? '检查权限失败')
      );
      return false;
    }
  }, [applyPermissionResponse, uiTexts?.permissionCheckError]);

  /**
   * 加载照片
   */
  const updatePaginationDebugInfo = useCallback((patch: Partial<PhotoAlbumPaginationDebugInfo>) => {
    if (!mountedRef.current) return;

    setPaginationDebugInfo(prev => ({ ...prev, ...patch }));
  }, []);

  const logPagination = useCallback((message: string, payload: Record<string, unknown>) => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    console.log('[PhotoAlbumPagination]', message, payload);
  }, []);

  const enrichVideoAssets = useCallback(async (assets: PhotoAlbumItem[]) => {
    const enrichedAssets = await Promise.all(
      assets.map(async item => {
        if (item.mediaType !== 'video') return item;
        if (typeof item.duration === 'number' && item.localUri) return item;

        try {
          const assetInfo = (await getAssetInfoAsync(item.id)) as AssetInfoRecord;
          const duration = normalizeDuration(assetInfo.duration, item.duration);
          const localUri = stringValue(assetInfo.localUri);
          const fileSize = numberValue(
            assetInfo.fileSize ?? assetInfo.size ?? assetInfo.fileSizeBytes
          );

          return {
            ...item,
            ...(duration !== undefined ? { duration } : {}),
            ...(localUri ? { localUri } : {}),
            ...(fileSize !== undefined ? { fileSize } : {}),
          };
        } catch (err) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.debug('[PhotoAlbum] video-asset-info:unavailable', {
              id: item.id,
              message: err instanceof Error ? err.message : 'asset info unavailable',
            });
          }
          return item;
        }
      })
    );

    return enrichedAssets;
  }, []);

  const fetchPhotos = useCallback(
    async (after?: string, first: number = initialLoadCount) => {
      try {
        if (!hasMediaAccessRef.current) {
          throw new Error(uiTexts?.permissionCheckError ?? '检查权限失败');
        }

        const result = await getAssetsAsync({
          first,
          after,
          mediaType,
          sortBy,
        });
        const assets = await enrichVideoAssets(result.assets as PhotoAlbumItem[]);

        return {
          assets,
          endCursor: result.endCursor || assets[assets.length - 1]?.id,
          hasNextPage: result.hasNextPage,
          totalCount: result.totalCount,
        };
      } catch (err) {
        throw err instanceof Error ? err : new Error(uiTexts?.loadPhotosError ?? '加载照片失败');
      }
    },
    [enrichVideoAssets, initialLoadCount, mediaType, sortBy, uiTexts?.loadPhotosError]
  );

  const applyPageResult = useCallback(
    (
      result: FetchPageResult,
      requestedCursor: string | undefined,
      requestedPageSize: number,
      replace: boolean
    ) => {
      const existingIds = replace ? new Set<string>() : new Set(photoIdsRef.current);
      const uniqueAssets = result.assets.filter(item => !existingIds.has(item.id));
      const derivedCursor =
        result.endCursor ||
        uniqueAssets[uniqueAssets.length - 1]?.id ||
        result.assets[result.assets.length - 1]?.id;
      const cursorAdvanced = Boolean(derivedCursor && derivedCursor !== requestedCursor);

      if (replace) {
        setPhotos(result.assets);
        photoIdsRef.current = new Set(result.assets.map(item => item.id));
      } else if (uniqueAssets.length > 0) {
        setPhotos(prev => mergeUniqueAssets(prev, uniqueAssets));
        for (const item of uniqueAssets) {
          photoIdsRef.current.add(item.id);
        }
      }

      if (cursorAdvanced) {
        endCursorRef.current = derivedCursor;
        stallCountRef.current = 0;
      } else if (result.hasNextPage) {
        stallCountRef.current += 1;
      } else {
        stallCountRef.current = 0;
      }

      hasMoreRef.current = result.hasNextPage;
      setHasMore(result.hasNextPage);

      pageCountRef.current += 1;
      updatePaginationDebugInfo({
        totalCount: result.totalCount,
        pageCount: pageCountRef.current,
        cursor: endCursorRef.current || null,
        lastRequestCursor: requestedCursor || null,
        lastPageSize: requestedPageSize,
        lastReturnedCount: result.assets.length,
        lastUniqueCount: replace ? result.assets.length : uniqueAssets.length,
        hasNextPage: result.hasNextPage,
        stallCount: stallCountRef.current,
      });

      logPagination(replace ? 'initial-page' : 'load-more-page', {
        requestedCursor,
        nextCursor: derivedCursor,
        requestedPageSize,
        returnedCount: result.assets.length,
        uniqueCount: replace ? result.assets.length : uniqueAssets.length,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
        stallCount: stallCountRef.current,
      });

      return {
        cursorAdvanced,
        uniqueCount: replace ? result.assets.length : uniqueAssets.length,
      };
    },
    [logPagination, mergeUniqueAssets, updatePaginationDebugInfo]
  );

  /**
   * 初始加载
   */
  const loadInitial = useCallback(async () => {
    if (isFetchingRef.current || !hasMediaAccessRef.current) return;

    isFetchingRef.current = true;
    setInitialLoading(true);
    setError(null);

    try {
      endCursorRef.current = undefined;
      pageCountRef.current = 0;
      stallCountRef.current = 0;
      photoIdsRef.current = new Set();
      const result = await fetchPhotos(undefined, initialLoadCount);
      endCursorRef.current = result.endCursor;
      applyPageResult(result, undefined, initialLoadCount, true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(uiTexts?.loadPhotosError ?? '加载照片失败'));
    } finally {
      isFetchingRef.current = false;
      setInitialLoading(false);
    }
  }, [applyPageResult, fetchPhotos, initialLoadCount, uiTexts?.loadPhotosError]);

  /**
   * 加载更多
   */
  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMoreRef.current || !hasMediaAccessRef.current) return;

    isFetchingRef.current = true;
    setLoadingMore(true);

    try {
      let currentCursor = endCursorRef.current;
      let requestedPageSize = loadMoreCount;
      let attempt = 0;

      while (attempt <= MAX_CURSOR_STALL_RETRIES && hasMoreRef.current) {
        const result = await fetchPhotos(currentCursor, requestedPageSize);
        const { cursorAdvanced, uniqueCount } = applyPageResult(
          result,
          currentCursor,
          requestedPageSize,
          false
        );

        if (uniqueCount > 0 || !result.hasNextPage) {
          break;
        }

        if (cursorAdvanced) {
          currentCursor = endCursorRef.current;
          requestedPageSize = loadMoreCount;
          attempt += 1;
          continue;
        }

        if (requestedPageSize >= loadMoreCount * MAX_PAGE_SIZE_MULTIPLIER) {
          logPagination('cursor-stalled-stop', {
            cursor: currentCursor,
            requestedPageSize,
            stallCount: stallCountRef.current,
          });
          break;
        }

        requestedPageSize = Math.min(
          requestedPageSize * 2,
          loadMoreCount * MAX_PAGE_SIZE_MULTIPLIER
        );
        attempt += 1;
        logPagination('cursor-stalled-retry', {
          cursor: currentCursor,
          nextPageSize: requestedPageSize,
          attempt,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error(uiTexts?.loadMorePhotosError ?? '加载更多照片失败')
      );
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [applyPageResult, fetchPhotos, loadMoreCount, logPagination, uiTexts?.loadMorePhotosError]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const photoMap = useMemo(() => new Map(photos.map(photo => [photo.id, photo])), [photos]);

  /**
   * 刷新列表
   */
  const refresh = useCallback(async () => {
    const hasPermission = await checkPermission();
    if (!hasPermission) return;

    endCursorRef.current = undefined;
    hasMoreRef.current = true;
    setHasMore(true);
    pageCountRef.current = 0;
    stallCountRef.current = 0;
    photoIdsRef.current = new Set();
    await loadInitial();
  }, [checkPermission, loadInitial]);

  const manageLimitedAccess = useCallback(async () => {
    try {
      setError(null);
      await presentPermissionsPickerAsync(['photo', 'video']);
      await refresh();
    } catch (err) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('[PhotoAlbum] limited-access:manage-failed', {
          message: err instanceof Error ? err.message : 'permission picker unavailable',
        });
      }
      setError(new Error(getUiText('limitedAccessManageError')));
    }
  }, [getUiText, refresh]);

  useEffect(() => {
    const handleAppStateChange = async (state: AppStateStatus) => {
      if (state !== 'active' || !openedSettingsRef.current) return;

      openedSettingsRef.current = false;
      const hasPermission = await checkPermission();

      if (hasPermission) {
        await refresh();
      }
    };

    const subscription = AppState.addEventListener('change', state => {
      void handleAppStateChange(state);
    });

    return () => {
      subscription.remove();
    };
  }, [checkPermission, refresh]);

  /**
   * 切换选中状态
   */
  const toggleSelection = useCallback((id: string) => {
    setSelectedIdsState(prev => {
      if (prev.includes(id)) {
        return prev.filter(selectedId => selectedId !== id);
      }

      return [...prev, id];
    });
  }, []);

  /**
   * 设置选中项（支持批量设置）
   */
  const setSelectedIds = useCallback((ids: string[]) => {
    setSelectedIdsState(Array.from(new Set(ids)));
  }, []);

  /**
   * 获取选中的照片
   */
  const getSelectedPhotos = useCallback((): PhotoAlbumItem[] => {
    return selectedIds
      .map(id => photoMap.get(id))
      .filter((photo): photo is PhotoAlbumItem => Boolean(photo));
  }, [photoMap, selectedIds]);

  /**
   * 清除所有选中
   */
  const clearSelection = useCallback(() => {
    setSelectedIdsState([]);
  }, []);

  // 初始化：检查权限并加载照片
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      const hasPermission = await checkPermission();
      if (hasPermission) {
        await loadInitial();
      }
    };
    init();

    return () => {
      mountedRef.current = false;
    };
  }, [checkPermission, loadInitial]);

  return {
    photos,
    loading: initialLoading || loadingMore,
    initialLoading,
    loadingMore,
    hasMore,
    permissionStatus,
    permissionCanAskAgain,
    accessPrivileges,
    error,
    requestPermission,
    manageLimitedAccess,
    loadMore,
    refresh,
    toggleSelection,
    setSelectedIds,
    getSelectedPhotos,
    clearSelection,
    selectedCount: selectedIdSet.size,
    paginationDebugInfo,
  };
}

function normalizeDuration(primary: unknown, fallback: unknown): number | undefined {
  return numberValue(primary) ?? numberValue(fallback);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
