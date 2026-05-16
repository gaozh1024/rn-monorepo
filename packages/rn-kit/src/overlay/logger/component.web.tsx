import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LogEntry, LogLevel } from '@/core/logger';
import { formatLogTime, serializeLogEntries, stringifyLogData } from '@/core/logger';
import { useThemeColors } from '@/theme';
import { AppPressable, AppScrollView, AppText, AppView } from '@/ui';
import type { LoggerExportPayload } from './types';

interface LogOverlayProps {
  entries: LogEntry[];
  onClear: () => void;
  defaultExpanded?: boolean;
  exportEnabled?: boolean;
  onExport?: (payload: LoggerExportPayload) => void;
  buttonPosition?: { x: number; y: number };
  onButtonPositionChange?: (position: { x: number; y: number }) => void;
}

type OverlayFilter = 'all' | LogLevel;
type NamespaceFilter = 'all' | string;

const FILTERS: OverlayFilter[] = ['all', 'error', 'warn', 'info', 'debug'];
const ALL_NAMESPACE = 'all';
const PANEL_HORIZONTAL_MARGIN = 10;
const PANEL_BOTTOM_OFFSET = 70;
const PANEL_MAX_WIDTH = 560;
const PANEL_MAX_HEIGHT = 580;
const LOG_LIST_MIN_HEIGHT = 260;
const TOGGLE_BUTTON_WIDTH = 68;
const TOGGLE_BUTTON_HEIGHT = 32;
const TOGGLE_BUTTON_RIGHT_GAP = 10;
const TOGGLE_BUTTON_BOTTOM_GAP = 20;
const DRAG_THRESHOLD = 6;

interface WebPointerLikeEvent {
  currentTarget?: {
    releasePointerCapture?: (pointerId: number) => void;
    setPointerCapture?: (pointerId: number) => void;
  };
  nativeEvent?: {
    clientX?: number;
    clientY?: number;
    pointerId?: number;
    preventDefault?: () => void;
  };
}

interface DragState {
  pointerId: number | null;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  moved: boolean;
}

function withAlpha(color: string, alpha = '20') {
  return color.startsWith('#') && color.length === 7 ? `${color}${alpha}` : color;
}

function getWebViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 390, height: 844 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function getLoggerOverlayButtonBounds(width: number, height: number) {
  return {
    minX: -(width - TOGGLE_BUTTON_WIDTH - TOGGLE_BUTTON_RIGHT_GAP * 2),
    minY: -(height - TOGGLE_BUTTON_HEIGHT - TOGGLE_BUTTON_BOTTOM_GAP * 2),
  };
}

export function clampLoggerOverlayButtonPosition(
  position: { x: number; y: number },
  width: number,
  height: number
) {
  const { minX, minY } = getLoggerOverlayButtonBounds(width, height);

  return {
    x: Math.max(minX, Math.min(0, position.x)),
    y: Math.max(minY, Math.min(0, position.y)),
  };
}

export function getLoggerOverlaySnappedPosition(
  position: { x: number; y: number },
  width: number,
  height: number
) {
  const clampedPosition = clampLoggerOverlayButtonPosition(position, width, height);
  const { minX } = getLoggerOverlayButtonBounds(width, height);

  return {
    x: clampedPosition.x <= minX / 2 ? minX : 0,
    y: clampedPosition.y,
  };
}

export function LogOverlay({
  entries,
  onClear,
  defaultExpanded = false,
  exportEnabled = true,
  onExport,
  buttonPosition,
  onButtonPositionChange,
}: LogOverlayProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [filter, setFilter] = useState<OverlayFilter>('all');
  const [namespaceFilter, setNamespaceFilter] = useState<NamespaceFilter>(ALL_NAMESPACE);
  const [dragPosition, setDragPosition] = useState(() => {
    const { width, height } = getWebViewportSize();

    return clampLoggerOverlayButtonPosition(
      { x: buttonPosition?.x ?? 0, y: buttonPosition?.y ?? 0 },
      width,
      height
    );
  });
  const dragPositionRef = useRef(dragPosition);
  const dragStateRef = useRef<DragState>({
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });

  const namespaces = useMemo<NamespaceFilter[]>(
    () => [
      ALL_NAMESPACE,
      ...Array.from(
        new Set(
          entries.map(entry => entry.namespace).filter((value): value is string => Boolean(value))
        )
      ),
    ],
    [entries]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const levelMatched = filter === 'all' ? true : entry.level === filter;
      const namespaceMatched =
        namespaceFilter === ALL_NAMESPACE ? true : entry.namespace === namespaceFilter;

      return levelMatched && namespaceMatched;
    });
  }, [entries, filter, namespaceFilter]);

  const levelStyles: Record<LogLevel, { text: string; bg: string }> = {
    debug: { text: colors.muted, bg: colors.cardElevated },
    info: { text: colors.info, bg: withAlpha(colors.info) },
    warn: { text: colors.warning, bg: withAlpha(colors.warning) },
    error: { text: colors.error, bg: withAlpha(colors.error) },
  };

  const handleExport = () => {
    const payload = {
      entries: filteredEntries,
      serialized: serializeLogEntries(filteredEntries),
    };

    if (onExport) {
      onExport(payload);
      return;
    }

    console.info('[LoggerExport]', payload.serialized);
  };

  useEffect(() => {
    const { width, height } = getWebViewportSize();
    const nextPosition = clampLoggerOverlayButtonPosition(
      { x: buttonPosition?.x ?? 0, y: buttonPosition?.y ?? 0 },
      width,
      height
    );

    dragPositionRef.current = nextPosition;
    setDragPosition(nextPosition);
  }, [buttonPosition]);

  const setNextDragPosition = useCallback((position: { x: number; y: number }) => {
    dragPositionRef.current = position;
    setDragPosition(position);
  }, []);

  const handlePointerDown = useCallback((event: WebPointerLikeEvent) => {
    const nativeEvent = event.nativeEvent ?? {};
    const pointerId = typeof nativeEvent.pointerId === 'number' ? nativeEvent.pointerId : null;

    dragStateRef.current = {
      pointerId,
      startClientX: nativeEvent.clientX ?? 0,
      startClientY: nativeEvent.clientY ?? 0,
      startX: dragPositionRef.current.x,
      startY: dragPositionRef.current.y,
      moved: false,
    };

    if (pointerId !== null) {
      event.currentTarget?.setPointerCapture?.(pointerId);
    }
  }, []);

  const handlePointerMove = useCallback(
    (event: WebPointerLikeEvent) => {
      const nativeEvent = event.nativeEvent ?? {};
      const state = dragStateRef.current;

      if (state.pointerId === null) {
        return;
      }

      if (typeof nativeEvent.pointerId === 'number' && nativeEvent.pointerId !== state.pointerId) {
        return;
      }

      const dx = (nativeEvent.clientX ?? state.startClientX) - state.startClientX;
      const dy = (nativeEvent.clientY ?? state.startClientY) - state.startClientY;

      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        state.moved = true;
      }

      if (!state.moved) {
        return;
      }

      nativeEvent.preventDefault?.();

      const { width, height } = getWebViewportSize();
      const nextPosition = clampLoggerOverlayButtonPosition(
        {
          x: state.startX + dx,
          y: state.startY + dy,
        },
        width,
        height
      );

      setNextDragPosition(nextPosition);
    },
    [setNextDragPosition]
  );

  const finishPointerDrag = useCallback(
    (event: WebPointerLikeEvent) => {
      const nativeEvent = event.nativeEvent ?? {};
      const state = dragStateRef.current;

      if (state.pointerId === null) {
        return;
      }

      if (typeof nativeEvent.pointerId === 'number' && nativeEvent.pointerId !== state.pointerId) {
        return;
      }

      if (state.moved) {
        const { width, height } = getWebViewportSize();
        const nextPosition = getLoggerOverlaySnappedPosition(
          dragPositionRef.current,
          width,
          height
        );

        setNextDragPosition(nextPosition);
        onButtonPositionChange?.(nextPosition);
      }

      if (state.pointerId !== null) {
        event.currentTarget?.releasePointerCapture?.(state.pointerId);
      }

      dragStateRef.current = {
        ...state,
        pointerId: null,
      };
    },
    [onButtonPositionChange, setNextDragPosition]
  );

  const handleTogglePress = useCallback(() => {
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }

    setExpanded(value => !value);
  }, []);

  const pointerHandlers = {
    onPointerCancel: finishPointerDrag,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: finishPointerDrag,
  } as Record<string, unknown>;

  return (
    <AppView
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 9998 }}
    >
      {expanded && (
        <AppView
          testID="logger-overlay-panel"
          style={{
            position: 'absolute',
            right: PANEL_HORIZONTAL_MARGIN,
            bottom: PANEL_BOTTOM_OFFSET,
            width: '100%',
            maxWidth: PANEL_MAX_WIDTH,
            maxHeight: PANEL_MAX_HEIGHT,
            borderRadius: 18,
            backgroundColor: colors.card,
            borderWidth: 0.5,
            borderColor: colors.border,
            shadowColor: '#000000',
            shadowOpacity: 0.15,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }}
        >
          <AppView
            row
            items="center"
            justify="between"
            className="px-4 py-3"
            style={{ borderBottomWidth: 0.5, borderBottomColor: colors.divider, flexShrink: 0 }}
          >
            <AppText weight="semibold">开发日志</AppText>
            <AppView row gap={2}>
              {exportEnabled ? (
                <AppPressable
                  testID="logger-overlay-export"
                  onPress={handleExport}
                  px={12}
                  py={4}
                  rounded="full"
                  style={{ backgroundColor: colors.cardElevated }}
                >
                  <AppText size="xs" tone="muted">
                    导出
                  </AppText>
                </AppPressable>
              ) : null}
              <AppPressable
                onPress={onClear}
                px={12}
                py={4}
                rounded="full"
                style={{ backgroundColor: colors.cardElevated }}
              >
                <AppText size="xs" tone="muted">
                  清空
                </AppText>
              </AppPressable>
              <AppPressable
                onPress={() => setExpanded(false)}
                px={12}
                py={4}
                rounded="full"
                style={{ backgroundColor: colors.cardElevated }}
              >
                <AppText size="xs" tone="muted">
                  收起
                </AppText>
              </AppPressable>
            </AppView>
          </AppView>

          <AppScrollView
            testID="logger-overlay-levels"
            horizontal
            row
            showsHorizontalScrollIndicator={false}
            className="px-3 py-2"
            contentContainerStyle={{ gap: 8, paddingRight: 12 }}
            style={{ height: 44, flexGrow: 0, flexShrink: 0 }}
          >
            {FILTERS.map(item => {
              const active = filter === item;
              return (
                <AppPressable
                  key={item}
                  onPress={() => setFilter(item)}
                  px={12}
                  py={4}
                  rounded="full"
                  style={{ backgroundColor: active ? colors.primary : colors.cardElevated }}
                >
                  <AppText
                    size="xs"
                    style={{ color: active ? colors.textInverse : colors.textSecondary }}
                  >
                    {item.toUpperCase()}
                  </AppText>
                </AppPressable>
              );
            })}
          </AppScrollView>

          <AppScrollView
            testID="logger-overlay-namespaces"
            horizontal
            row
            showsHorizontalScrollIndicator={false}
            className="px-3 pb-2"
            contentContainerStyle={{ gap: 8, paddingRight: 12 }}
            style={{ height: 44, flexGrow: 0, flexShrink: 0 }}
          >
            {namespaces.map(item => {
              const active = namespaceFilter === item;
              const label = item === ALL_NAMESPACE ? '全部模块' : String(item);
              return (
                <AppPressable
                  key={item}
                  testID={`logger-namespace-${item}`}
                  onPress={() => setNamespaceFilter(item)}
                  px={12}
                  py={4}
                  rounded="full"
                  style={{ backgroundColor: active ? colors.info : colors.cardElevated }}
                >
                  <AppText
                    size="xs"
                    style={{ color: active ? colors.textInverse : colors.textSecondary }}
                  >
                    {label}
                  </AppText>
                </AppPressable>
              );
            })}
          </AppScrollView>

          <AppScrollView
            testID="logger-overlay-logs"
            className="px-3 pb-3"
            showsVerticalScrollIndicator
            nestedScrollEnabled
            style={{ flex: 1, minHeight: LOG_LIST_MIN_HEIGHT }}
          >
            <AppView gap={2}>
              {filteredEntries.length === 0 ? (
                <AppView className="py-8 items-center">
                  <AppText tone="muted">暂无日志</AppText>
                </AppView>
              ) : (
                filteredEntries.map(entry => {
                  const palette = levelStyles[entry.level];
                  const detail = stringifyLogData(entry.data);

                  return (
                    <AppView
                      key={entry.id}
                      className="px-3 py-3 rounded-xl"
                      style={{
                        backgroundColor: colors.cardElevated,
                        borderWidth: 0.5,
                        borderColor: colors.divider,
                      }}
                    >
                      <AppView row items="center" justify="between">
                        <AppView row items="center" gap={2}>
                          <AppView
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: palette.bg }}
                          >
                            <AppText size="xs" style={{ color: palette.text }}>
                              {entry.level.toUpperCase()}
                            </AppText>
                          </AppView>
                          {entry.namespace ? (
                            <AppText size="xs" tone="muted">
                              [{entry.namespace}]
                            </AppText>
                          ) : null}
                        </AppView>
                        <AppText size="xs" tone="muted">
                          {formatLogTime(entry.timestamp)}
                        </AppText>
                      </AppView>

                      <AppText className="mt-2" size="sm">
                        {entry.message}
                      </AppText>

                      {detail ? (
                        <AppView
                          className="mt-2 px-2 py-2 rounded-lg"
                          style={{ backgroundColor: colors.background }}
                        >
                          <AppText size="xs" tone="muted">
                            {detail}
                          </AppText>
                        </AppView>
                      ) : null}
                    </AppView>
                  );
                })
              )}
            </AppView>
          </AppScrollView>
        </AppView>
      )}

      <AppView
        testID="logger-overlay-toggle-wrapper"
        pointerEvents="box-none"
        {...pointerHandlers}
        style={
          {
            position: 'absolute',
            right: TOGGLE_BUTTON_RIGHT_GAP,
            bottom: TOGGLE_BUTTON_BOTTOM_GAP,
            transform: [{ translateX: dragPosition.x }, { translateY: dragPosition.y }],
            touchAction: 'none',
          } as any
        }
      >
        <AppPressable
          testID="logger-overlay-toggle"
          accessibilityRole="button"
          accessibilityLabel="切换开发日志"
          onPress={handleTogglePress}
          rounded="full"
          style={{
            width: TOGGLE_BUTTON_WIDTH,
            height: TOGGLE_BUTTON_HEIGHT,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000000',
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <AppView row items="center" justify="center" gap={1}>
            <AppText size="xs" weight="semibold" style={{ color: colors.textInverse }}>
              Log
            </AppText>
            <AppView
              className="rounded-full"
              style={{
                minWidth: 22,
                height: 18,
                paddingHorizontal: 5,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: withAlpha(colors.textInverse, '30'),
              }}
            >
              <AppText size="xs" weight="semibold" style={{ color: colors.textInverse }}>
                {entries.length > 99 ? '99+' : String(entries.length)}
              </AppText>
            </AppView>
          </AppView>
        </AppPressable>
      </AppView>
    </AppView>
  );
}
