import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { LogEntry, LogLevel } from '@/core/logger';
import { formatLogTime, serializeLogEntries, stringifyLogData } from '@/core/logger';
import { useThemeColors } from '@/theme';
import { AppPressable, AppScrollView, AppText, AppView } from '@/ui';
import { createReanimatedView } from '@/ui/motion/components/ReanimatedView';
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
const PANEL_MIN_HEIGHT = 360;
const FILTER_BAR_HEIGHT = 44;
const NAMESPACE_BAR_HEIGHT = 44;
const LOG_LIST_MIN_HEIGHT = 260;
const TOGGLE_BUTTON_WIDTH = 68;
const TOGGLE_BUTTON_HEIGHT = 32;
const TOGGLE_BUTTON_RIGHT_GAP = 10;
const TOGGLE_BUTTON_BOTTOM_GAP = 20;
const DRAG_THRESHOLD = 6;

function withAlpha(color: string, alpha = '20') {
  return color.startsWith('#') && color.length === 7 ? `${color}${alpha}` : color;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function animateValueTo(value: { value: number }, toValue: number) {
  value.value = withTiming(toValue, {
    duration: 180,
  });
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
    x: clamp(position.x, minX, 0),
    y: clamp(position.y, minY, 0),
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
  const { width, height } = Dimensions.get('window');
  const panelWidth = Math.min(width - PANEL_HORIZONTAL_MARGIN * 2, PANEL_MAX_WIDTH);
  const panelMaxHeight = Math.min(PANEL_MAX_HEIGHT, Math.max(PANEL_MIN_HEIGHT, height * 0.68));
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [filter, setFilter] = useState<OverlayFilter>('all');
  const [namespaceFilter, setNamespaceFilter] = useState<NamespaceFilter>(ALL_NAMESPACE);
  const buttonTranslateX = useSharedValue(0);
  const buttonTranslateY = useSharedValue(0);
  const buttonPositionRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

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

  const buttonPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          return (
            Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD
          );
        },
        onPanResponderGrant: () => {
          dragStartRef.current = {
            x: buttonPositionRef.current.x,
            y: buttonPositionRef.current.y,
          };
        },
        onPanResponderMove: (_event, gestureState) => {
          const nextPosition = clampLoggerOverlayButtonPosition(
            {
              x: dragStartRef.current.x + gestureState.dx,
              y: dragStartRef.current.y + gestureState.dy,
            },
            width,
            height
          );

          buttonPositionRef.current = nextPosition;
          buttonTranslateX.value = nextPosition.x;
          buttonTranslateY.value = nextPosition.y;
        },
        onPanResponderRelease: () => {
          const nextPosition = getLoggerOverlaySnappedPosition(
            buttonPositionRef.current,
            width,
            height
          );

          buttonPositionRef.current = nextPosition;
          animateValueTo(buttonTranslateX, nextPosition.x);
          animateValueTo(buttonTranslateY, nextPosition.y);
          onButtonPositionChange?.(nextPosition);
        },
        onPanResponderTerminate: () => {
          const nextPosition = getLoggerOverlaySnappedPosition(
            buttonPositionRef.current,
            width,
            height
          );

          buttonPositionRef.current = nextPosition;
          animateValueTo(buttonTranslateX, nextPosition.x);
          animateValueTo(buttonTranslateY, nextPosition.y);
          onButtonPositionChange?.(nextPosition);
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [buttonTranslateX, buttonTranslateY, height, onButtonPositionChange, width]
  );

  useEffect(() => {
    const nextPosition = clampLoggerOverlayButtonPosition(
      {
        x: buttonPosition?.x ?? 0,
        y: buttonPosition?.y ?? 0,
      },
      width,
      height
    );

    buttonPositionRef.current = nextPosition;
    buttonTranslateX.value = nextPosition.x;
    buttonTranslateY.value = nextPosition.y;
  }, [buttonPosition, buttonTranslateX, buttonTranslateY, height, width]);

  const buttonAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: buttonTranslateX.value }, { translateY: buttonTranslateY.value }],
    }),
    []
  );

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
            width: panelWidth,
            maxHeight: panelMaxHeight,
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
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: colors.cardElevated }}
                >
                  <AppText size="xs" tone="muted">
                    导出
                  </AppText>
                </AppPressable>
              ) : null}
              <AppPressable
                onPress={onClear}
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: colors.cardElevated }}
              >
                <AppText size="xs" tone="muted">
                  清空
                </AppText>
              </AppPressable>
              <AppPressable
                onPress={() => setExpanded(false)}
                className="px-3 py-1 rounded-full"
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
            style={{ height: FILTER_BAR_HEIGHT, flexGrow: 0, flexShrink: 0 }}
          >
            {FILTERS.map(item => {
              const active = filter === item;
              return (
                <AppPressable
                  key={item}
                  onPress={() => setFilter(item)}
                  className="px-3 py-1 rounded-full"
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
            style={{ height: NAMESPACE_BAR_HEIGHT, flexGrow: 0, flexShrink: 0 }}
          >
            {namespaces.map(item => {
              const active = namespaceFilter === item;
              const label = item === ALL_NAMESPACE ? '全部模块' : String(item);
              return (
                <AppPressable
                  key={item}
                  testID={`logger-namespace-${item}`}
                  onPress={() => setNamespaceFilter(item)}
                  className="px-3 py-1 rounded-full"
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

      {createReanimatedView(
        {
          testID: 'logger-overlay-toggle-wrapper',
          pointerEvents: 'box-none',
          style: [
            {
              position: 'absolute',
              right: TOGGLE_BUTTON_RIGHT_GAP,
              bottom: TOGGLE_BUTTON_BOTTOM_GAP,
            },
            buttonAnimatedStyle,
          ],
          ...buttonPanResponder.panHandlers,
        },
        <AppPressable
          testID="logger-overlay-toggle"
          onPress={() => setExpanded(value => !value)}
          className="rounded-full"
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
      )}
    </AppView>
  );
}
