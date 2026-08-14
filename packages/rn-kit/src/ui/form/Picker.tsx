import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  type StyleProp,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextStyle,
} from 'react-native';
import {
  useMotionConfig,
  type PressMotionPreset,
  type PressMotionProps,
  type SheetMotionProps,
} from '@/ui/motion';
import { Icon } from '@/ui/display';
import { AppPressable, AppText, AppView } from '@/ui/primitives';
import { cn } from '@/utils';
import { BottomSheetModal } from './BottomSheetModal';
import { type FormThemeColors, useFormThemeColors } from './useFormTheme';
import {
  type CommonLayoutProps,
  type LayoutSurface,
  resolveLayoutStyle,
  resolveRoundedStyle,
  resolveSizingStyle,
  resolveSpacingStyle,
} from '../utils/layout-shortcuts';
import { useOptionalTheme } from '@/theme';
import { resolveNamedColor, resolveSurfaceColor } from '../utils/theme-color';

const WHEEL_SCROLL_SETTLE_DELAY_MS = 100;

export type PickerValue = string | number;

export interface PickerOption {
  label: string;
  value: PickerValue;
  disabled?: boolean;
}

export interface PickerColumn {
  key: string;
  title?: string;
  options: PickerOption[];
}

export interface PickerRenderFooterContext {
  close: () => void;
  setTempValues: (values: PickerValue[]) => void;
  tempValues: PickerValue[];
}

export interface PickerProps
  extends
    Pick<
      CommonLayoutProps,
      | 'flex'
      | 'm'
      | 'mx'
      | 'my'
      | 'mt'
      | 'mb'
      | 'ml'
      | 'mr'
      | 'w'
      | 'h'
      | 'minW'
      | 'minH'
      | 'maxW'
      | 'maxH'
      | 'rounded'
    >,
    SheetMotionProps,
    PressMotionProps {
  value?: PickerValue[];
  onChange?: (values: PickerValue[]) => void;
  columns: PickerColumn[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  bg?: string;
  surface?: LayoutSurface;
  pickerTitle?: string;
  cancelText?: string;
  confirmText?: string;
  triggerIconName?: string;
  triggerTextStyle?: StyleProp<TextStyle>;
  renderDisplayText?: (selectedOptions: Array<PickerOption | undefined>) => string;
  renderFooter?: (context: PickerRenderFooterContext) => React.ReactNode;
  tempValue?: PickerValue[];
  defaultTempValue?: PickerValue[];
  onTempChange?: (values: PickerValue[]) => void;
  onOpen?: () => void;
  rowHeight?: number;
  visibleRows?: number;
}

function findFirstEnabledValue(column: PickerColumn) {
  return column.options.find(option => !option.disabled)?.value;
}

function normalizeValues(columns: PickerColumn[], values?: PickerValue[]) {
  return columns.map((column, index) => {
    const candidate = values?.[index];
    const matched = column.options.find(option => option.value === candidate && !option.disabled);
    return matched?.value ?? findFirstEnabledValue(column) ?? column.options[0]?.value ?? '';
  });
}

interface WheelPickerColumnProps {
  colors: FormThemeColors;
  column: PickerColumn;
  motionPreset: PressMotionPreset;
  motionDuration?: number;
  motionReduceMotion?: boolean;
  onChange: (value: PickerValue) => void;
  rowHeight: number;
  selectedValue?: PickerValue;
  showDivider?: boolean;
  visibleRows: number;
}

function WheelPickerColumn({
  colors,
  column,
  motionPreset,
  motionDuration,
  motionReduceMotion,
  onChange,
  rowHeight,
  selectedValue,
  showDivider = false,
  visibleRows,
}: WheelPickerColumnProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const isUserInteractingRef = useRef(false);
  const latestOffsetYRef = useRef(0);
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paddingRows = Math.floor(visibleRows / 2);
  const selectedIndex = Math.max(
    0,
    column.options.findIndex(option => option.value === selectedValue)
  );

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      scrollRef.current?.scrollTo?.({ y: index * rowHeight, animated });
    },
    [rowHeight]
  );

  const selectNearestEnabled = useCallback(
    (targetIndex: number) => {
      if (column.options.length === 0) return;

      const maxIndex = column.options.length - 1;
      const clampedIndex = Math.max(0, Math.min(maxIndex, targetIndex));
      const exactOption = column.options[clampedIndex];

      if (exactOption && !exactOption.disabled) {
        onChange(exactOption.value);
        scrollToIndex(clampedIndex, true);
        return;
      }

      for (let distance = 1; distance <= maxIndex; distance += 1) {
        const prevIndex = clampedIndex - distance;
        if (prevIndex >= 0) {
          const prevOption = column.options[prevIndex];
          if (prevOption && !prevOption.disabled) {
            onChange(prevOption.value);
            scrollToIndex(prevIndex, true);
            return;
          }
        }

        const nextIndex = clampedIndex + distance;
        if (nextIndex <= maxIndex) {
          const nextOption = column.options[nextIndex];
          if (nextOption && !nextOption.disabled) {
            onChange(nextOption.value);
            scrollToIndex(nextIndex, true);
            return;
          }
        }
      }
    },
    [column.options, onChange, scrollToIndex]
  );

  const snapToNearestEnabledOffset = useCallback(
    (offsetY: number) => {
      selectNearestEnabled(Math.round(offsetY / rowHeight));
    },
    [rowHeight, selectNearestEnabled]
  );

  const clearScrollSettleTimer = useCallback(() => {
    if (scrollSettleTimerRef.current !== null) {
      clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = null;
    }
  }, []);

  const scheduleScrollSettle = useCallback(
    (offsetY: number) => {
      latestOffsetYRef.current = offsetY;
      isUserInteractingRef.current = true;
      clearScrollSettleTimer();

      scrollSettleTimerRef.current = setTimeout(() => {
        scrollSettleTimerRef.current = null;
        snapToNearestEnabledOffset(latestOffsetYRef.current);
        isUserInteractingRef.current = false;
      }, WHEEL_SCROLL_SETTLE_DELAY_MS);
    },
    [clearScrollSettleTimer, snapToNearestEnabledOffset]
  );

  const handleScrollBeginDrag = useCallback(() => {
    isUserInteractingRef.current = true;
    clearScrollSettleTimer();
  }, [clearScrollSettleTimer]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scheduleScrollSettle(event.nativeEvent.contentOffset?.y ?? 0);
    },
    [scheduleScrollSettle]
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scheduleScrollSettle(event.nativeEvent.contentOffset?.y ?? 0);
    },
    [scheduleScrollSettle]
  );

  useEffect(() => {
    if (isUserInteractingRef.current) return;
    scrollToIndex(selectedIndex, false);
  }, [scrollToIndex, selectedIndex]);

  useEffect(() => clearScrollSettleTimer, [clearScrollSettleTimer]);

  return (
    <AppView
      flex
      style={[
        showDivider ? styles.columnDivider : undefined,
        showDivider ? { borderRightColor: colors.divider } : undefined,
      ]}
    >
      {column.title && (
        <AppView center className="py-2" style={{ backgroundColor: colors.headerSurface }}>
          <AppText className="text-sm font-medium" style={{ color: colors.textMuted }}>
            {column.title}
          </AppText>
        </AppView>
      )}

      <AppView
        style={[
          styles.wheelViewport,
          {
            height: rowHeight * visibleRows,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {/* Keep the opaque selection background behind the scroll content. */}
        <AppView
          testID={`picker-selection-overlay-${column.key}`}
          pointerEvents="none"
          style={[
            styles.selectionOverlay,
            {
              top: rowHeight * paddingRows,
              height: rowHeight,
              borderColor: colors.divider,
              backgroundColor: colors.primarySurface,
            },
          ]}
        />

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={rowHeight}
          decelerationRate="fast"
          onScrollBeginDrag={handleScrollBeginDrag}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingVertical: rowHeight * paddingRows }}
        >
          {column.options.map((option, index) => {
            const selected = option.value === selectedValue;

            return (
              <AppPressable
                key={`${column.key}-${String(option.value)}-${index}`}
                disabled={option.disabled}
                onPress={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  scrollToIndex(index, true);
                }}
                style={[
                  styles.optionButton,
                  {
                    height: rowHeight,
                    opacity: option.disabled ? 0.35 : selected ? 1 : 0.72,
                  },
                ]}
                motionPreset={motionPreset}
                motionDuration={motionDuration}
                motionReduceMotion={motionReduceMotion}
              >
                <AppText
                  className={cn(selected ? 'font-semibold' : undefined)}
                  style={{ color: selected ? colors.primary : colors.text }}
                >
                  {option.label}
                </AppText>
              </AppPressable>
            );
          })}
        </ScrollView>

        <AppView
          pointerEvents="none"
          style={[
            styles.fadeMask,
            {
              top: 0,
              height: rowHeight * paddingRows,
            },
          ]}
        >
          {[0.92, 0.72, 0.48, 0.24].map(opacity => (
            <AppView
              key={`top-${opacity}`}
              flex
              style={{ backgroundColor: colors.surface, opacity }}
            />
          ))}
        </AppView>

        <AppView
          pointerEvents="none"
          style={[
            styles.fadeMask,
            {
              bottom: 0,
              height: rowHeight * paddingRows,
            },
          ]}
        >
          {[0.24, 0.48, 0.72, 0.92].map(opacity => (
            <AppView
              key={`bottom-${opacity}`}
              flex
              style={{ backgroundColor: colors.surface, opacity }}
            />
          ))}
        </AppView>
      </AppView>
    </AppView>
  );
}

/**
 * Picker - 通用多列滚轮选择器，适用于日期、省市区等多列选择场景
 */
export function Picker({
  flex,
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  w,
  h,
  minW,
  minH,
  maxW,
  maxH,
  rounded,
  value,
  onChange,
  columns,
  placeholder = '请选择',
  disabled = false,
  className,
  bg,
  surface,
  pickerTitle = '请选择',
  cancelText = '取消',
  confirmText = '确定',
  triggerIconName = 'keyboard-arrow-down',
  triggerTextStyle,
  renderDisplayText,
  renderFooter,
  tempValue,
  defaultTempValue,
  onTempChange,
  onOpen,
  rowHeight = 40,
  visibleRows = 5,
  motionPreset,
  motionDistance,
  motionOverlayOpacity,
  motionSwipeThreshold,
  motionVelocityThreshold,
  motionReduceMotion,
  motionDuration,
  motionOpenDuration,
  motionCloseDuration,
}: PickerProps) {
  const motionConfig = useMotionConfig();
  const colors = useFormThemeColors();
  const { theme, isDark } = useOptionalTheme();
  const [visible, setVisible] = useState(false);
  const [internalTempValues, setInternalTempValues] = useState<PickerValue[]>(
    normalizeValues(columns, defaultTempValue ?? value)
  );
  const resolvedBgColor =
    resolveSurfaceColor(surface, theme, isDark) ?? resolveNamedColor(bg, theme, isDark);
  const resolvedMotionPreset = motionPreset ?? motionConfig.defaultPressPreset ?? 'none';

  const isControlledTemp = tempValue !== undefined;
  const tempValues = useMemo(
    () => (isControlledTemp ? normalizeValues(columns, tempValue) : internalTempValues),
    [columns, internalTempValues, isControlledTemp, tempValue]
  );
  const latestTempValuesRef = useRef(tempValues);

  useEffect(() => {
    latestTempValuesRef.current = tempValues;
  }, [tempValues]);

  useEffect(() => {
    if (!isControlledTemp) {
      setInternalTempValues(previous => normalizeValues(columns, previous));
    }
  }, [columns, isControlledTemp]);

  const selectedOptions = useMemo(
    () =>
      columns.map((column, index) =>
        column.options.find(option => option.value === value?.[index] && !option.disabled)
      ),
    [columns, value]
  );

  const displayText = useMemo(() => {
    if (!value || value.length === 0) return placeholder;
    if (renderDisplayText) return renderDisplayText(selectedOptions);

    const labels = selectedOptions.map(option => option?.label).filter(Boolean);
    return labels.length > 0 ? labels.join(' / ') : placeholder;
  }, [placeholder, renderDisplayText, selectedOptions, value]);

  const setTempValues = useCallback(
    (nextValues: PickerValue[]) => {
      const normalized = normalizeValues(columns, nextValues);
      latestTempValuesRef.current = normalized;
      if (isControlledTemp) {
        onTempChange?.(normalized);
        return;
      }
      setInternalTempValues(normalized);
      onTempChange?.(normalized);
    },
    [columns, isControlledTemp, onTempChange]
  );

  const updateColumnValue = useCallback(
    (columnIndex: number, nextValue: PickerValue) => {
      const nextValues = [...tempValues];
      nextValues[columnIndex] = nextValue;
      setTempValues(nextValues);
    },
    [setTempValues, tempValues]
  );

  const openModal = useCallback(() => {
    const normalized = normalizeValues(columns, tempValue ?? value ?? defaultTempValue);

    latestTempValuesRef.current = normalized;
    if (!isControlledTemp) {
      setInternalTempValues(normalized);
    }
    onTempChange?.(normalized);
    onOpen?.();
    setVisible(true);
  }, [columns, defaultTempValue, isControlledTemp, onOpen, onTempChange, tempValue, value]);

  const handleConfirm = useCallback(() => {
    onChange?.(latestTempValuesRef.current);
    setVisible(false);
  }, [onChange]);

  return (
    <AppView
      style={[
        resolveLayoutStyle({ flex }),
        resolveSpacingStyle({ m, mx, my, mt, mb, ml, mr }),
        resolveSizingStyle({ w }),
      ]}
    >
      <AppPressable
        className={cn(
          'flex-row items-center justify-between px-4 py-3 rounded-lg',
          disabled ? 'opacity-60' : '',
          className
        )}
        style={[
          styles.trigger,
          resolveSizingStyle({ h, minW, minH, maxW, maxH }),
          resolveRoundedStyle(rounded),
          { backgroundColor: resolvedBgColor ?? colors.surface, borderColor: colors.border },
        ]}
        disabled={disabled}
        onPress={openModal}
        motionPreset={resolvedMotionPreset}
        motionDuration={motionDuration}
        motionReduceMotion={motionReduceMotion}
      >
        <AppText
          style={[
            styles.triggerText,
            { color: value && value.length > 0 ? colors.text : colors.textMuted },
            triggerTextStyle,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </AppText>
        <AppView style={styles.triggerIcon}>
          <Icon name={triggerIconName} size="md" color={colors.icon} />
        </AppView>
      </AppPressable>

      <BottomSheetModal
        visible={visible}
        onRequestClose={() => setVisible(false)}
        overlayColor={colors.overlay}
        surfaceColor={colors.surface}
        closeOnBackdropPress
        motionDuration={motionDuration}
        motionOpenDuration={motionOpenDuration}
        motionCloseDuration={motionCloseDuration}
        motionDistance={motionDistance}
        motionOverlayOpacity={motionOverlayOpacity}
        motionSwipeThreshold={motionSwipeThreshold}
        motionVelocityThreshold={motionVelocityThreshold}
        motionReduceMotion={motionReduceMotion}
      >
        <>
          <AppView
            row
            between
            items="center"
            className="px-4 py-3"
            style={[styles.header, { borderBottomColor: colors.divider }]}
          >
            <AppPressable
              onPress={() => setVisible(false)}
              className="py-1"
              pressedClassName="opacity-70"
              motionPreset={resolvedMotionPreset}
              motionDuration={motionDuration}
              motionReduceMotion={motionReduceMotion}
            >
              <AppText style={{ color: colors.textMuted }}>{cancelText}</AppText>
            </AppPressable>
            <AppText className="text-lg font-semibold" style={{ color: colors.text }}>
              {pickerTitle}
            </AppText>
            <AppPressable
              onPress={handleConfirm}
              className="py-1"
              pressedClassName="opacity-70"
              motionPreset={resolvedMotionPreset}
              motionDuration={motionDuration}
              motionReduceMotion={motionReduceMotion}
            >
              <AppText className="font-medium" style={{ color: colors.primary }}>
                {confirmText}
              </AppText>
            </AppPressable>
          </AppView>

          <AppView row>
            {columns.map((column, index) => (
              <WheelPickerColumn
                key={column.key}
                colors={colors}
                column={column}
                motionPreset={resolvedMotionPreset}
                motionDuration={motionDuration}
                motionReduceMotion={motionReduceMotion}
                onChange={nextValue => updateColumnValue(index, nextValue)}
                rowHeight={rowHeight}
                selectedValue={tempValues[index]}
                showDivider={index < columns.length - 1}
                visibleRows={visibleRows}
              />
            ))}
          </AppView>

          {renderFooter && (
            <AppView
              className="px-4 py-3"
              style={[styles.footer, { borderTopColor: colors.divider }]}
            >
              {renderFooter({ close: () => setVisible(false), setTempValues, tempValues })}
            </AppView>
          )}
        </>
      </BottomSheetModal>
    </AppView>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 0.5,
  },
  triggerText: {
    flex: 1,
    flexShrink: 1,
    lineHeight: 20,
    minWidth: 0,
  },
  triggerIcon: {
    flexShrink: 0,
    marginLeft: 8,
  },
  header: {
    borderBottomWidth: 0.5,
  },
  footer: {
    borderTopWidth: 0.5,
  },
  columnDivider: {
    borderRightWidth: 0.5,
  },
  wheelViewport: {
    position: 'relative',
    overflow: 'hidden',
  },
  fadeMask: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  selectionOverlay: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  optionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
