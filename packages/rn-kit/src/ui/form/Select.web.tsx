import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View, type GestureResponderEvent } from 'react-native';
import { useMotionConfig, type PressMotionProps, type SheetMotionProps } from '@/ui/motion';
import { AppPressable, AppScrollView, AppText, AppView } from '@/ui/primitives';
import { Icon } from '@/ui/display';
import { cn } from '@/utils';
import { BottomSheetModal } from './BottomSheetModal.web';
import { useFormThemeColors } from './useFormTheme';
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

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps
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
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  onSearch?: (keyword: string) => void;
  disabled?: boolean;
  clearable?: boolean;
  singleSelectTitle?: string;
  multipleSelectTitle?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  selectedCountText?: string;
  confirmText?: string;
  className?: string;
  bg?: string;
  surface?: LayoutSurface;
}

function formatSelectedCountText(template: string, count: number) {
  return template.replace('{{count}}', String(count));
}

export function Select({
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
  options,
  placeholder = '请选择',
  multiple = false,
  searchable = false,
  onSearch,
  disabled = false,
  clearable = true,
  singleSelectTitle = '请选择',
  multipleSelectTitle = '选择选项',
  searchPlaceholder = '搜索...',
  emptyText = '暂无选项',
  selectedCountText = '已选择 {{count}} 项',
  confirmText = '确定',
  className,
  bg,
  surface,
  motionPreset,
  motionDistance,
  motionOverlayOpacity,
  motionSwipeThreshold,
  motionVelocityThreshold,
  motionReduceMotion,
  motionDuration,
  motionOpenDuration,
  motionCloseDuration,
}: SelectProps) {
  const motionConfig = useMotionConfig();
  const colors = useFormThemeColors();
  const { theme, isDark } = useOptionalTheme();
  const [visible, setVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const resolvedMotionPreset = motionPreset ?? motionConfig.defaultPressPreset ?? 'none';
  const resolvedBgColor =
    resolveSurfaceColor(surface, theme, isDark) ?? resolveNamedColor(bg, theme, isDark);

  const selectedValues = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : [];
    return typeof value === 'string' && value ? [value] : [];
  }, [multiple, value]);

  const displayText = useMemo(() => {
    if (selectedValues.length === 0) return placeholder;
    const selectedLabels = options
      .filter(option => selectedValues.includes(option.value))
      .map(option => option.label);
    return selectedLabels.join(', ') || placeholder;
  }, [options, placeholder, selectedValues]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchKeyword) return options;
    const keyword = searchKeyword.toLowerCase();
    return options.filter(option => option.label.toLowerCase().includes(keyword));
  }, [options, searchable, searchKeyword]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (multiple) {
        const currentValues = Array.isArray(value) ? value : [];
        const nextValues = currentValues.includes(optionValue)
          ? currentValues.filter(item => item !== optionValue)
          : [...currentValues, optionValue];
        onChange?.(nextValues);
        return;
      }

      onChange?.(optionValue);
      setVisible(false);
    },
    [multiple, onChange, value]
  );

  const handleClear = useCallback(
    (event?: GestureResponderEvent) => {
      event?.stopPropagation?.();
      onChange?.(multiple ? [] : '');
    },
    [multiple, onChange]
  );

  const handleSearch = useCallback(
    (text: string) => {
      setSearchKeyword(text);
      onSearch?.(text);
    },
    [onSearch]
  );

  const close = useCallback(() => setVisible(false), []);

  return (
    <AppView
      style={[
        resolveLayoutStyle({ flex }),
        resolveSpacingStyle({ m, mx, my, mt, mb, ml, mr }),
        resolveSizingStyle({ w }),
      ]}
    >
      <AppPressable
        testID="select-trigger"
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: visible }}
        row
        items="center"
        justify="between"
        px={16}
        py={12}
        rounded={rounded ?? 'lg'}
        className={cn(disabled ? 'opacity-60' : '', className)}
        style={[
          styles.trigger,
          resolveSizingStyle({ h, minW, minH, maxW, maxH }),
          resolveRoundedStyle(rounded),
          {
            backgroundColor: resolvedBgColor ?? colors.surface,
            borderColor: colors.border,
          },
        ]}
        disabled={disabled}
        onPress={() => setVisible(true)}
        motionPreset={resolvedMotionPreset}
        motionDuration={motionDuration}
        motionReduceMotion={motionReduceMotion}
      >
        <AppText
          className="flex-1"
          style={{ color: selectedValues.length === 0 ? colors.textMuted : colors.text }}
          numberOfLines={1}
        >
          {displayText}
        </AppText>
        <View className="flex-row items-center">
          {clearable && selectedValues.length > 0 && !disabled && (
            <AppPressable
              testID="select-clear"
              onPress={handleClear}
              mr={8}
              p={4}
              pressedClassName="opacity-70"
              motionPreset={resolvedMotionPreset}
              motionDuration={motionDuration}
              motionReduceMotion={motionReduceMotion}
            >
              <Icon name="close" size="sm" color={colors.icon} />
            </AppPressable>
          )}
          <Icon name="keyboard-arrow-down" size="md" color={colors.icon} />
        </View>
      </AppPressable>

      <BottomSheetModal
        visible={visible}
        onRequestClose={close}
        overlayColor={colors.overlay}
        surfaceColor={colors.surface}
        closeOnBackdropPress
        contentClassName="max-h-[70%]"
        motionDistance={motionDistance}
        motionDuration={motionDuration}
        motionOpenDuration={motionOpenDuration}
        motionCloseDuration={motionCloseDuration}
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
            <AppText className="text-lg font-semibold" style={{ color: colors.text }}>
              {multiple ? multipleSelectTitle : singleSelectTitle}
            </AppText>
            <AppPressable
              testID="select-close"
              accessibilityRole="button"
              accessibilityLabel="关闭选择器"
              onPress={close}
              p={4}
              pressedClassName="opacity-70"
              motionPreset={resolvedMotionPreset}
              motionDuration={motionDuration}
              motionReduceMotion={motionReduceMotion}
            >
              <Icon name="close" size="md" color={colors.icon} />
            </AppPressable>
          </AppView>

          {searchable && (
            <AppView
              className="px-4 py-3"
              style={[styles.searchBox, { borderBottomColor: colors.divider }]}
            >
              <AppView
                row
                items="center"
                className="px-3 py-2 rounded-lg"
                style={{ backgroundColor: colors.surfaceMuted }}
              >
                <View style={{ marginRight: 8 }}>
                  <Icon name="search" size="sm" color={colors.icon} />
                </View>
                <TextInput
                  testID="select-search-input"
                  className="flex-1 text-base"
                  style={{ color: colors.text }}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  value={searchKeyword}
                  onChangeText={handleSearch}
                  autoFocus
                />
                {searchKeyword.length > 0 && (
                  <AppPressable
                    testID="select-search-clear"
                    onPress={() => handleSearch('')}
                    p={4}
                    pressedClassName="opacity-70"
                    motionPreset={resolvedMotionPreset}
                    motionDuration={motionDuration}
                    motionReduceMotion={motionReduceMotion}
                  >
                    <Icon name="close" size="sm" color={colors.icon} />
                  </AppPressable>
                )}
              </AppView>
            </AppView>
          )}

          <AppScrollView
            testID="select-options"
            accessibilityRole="list"
            style={styles.optionsList}
            showsVerticalScrollIndicator
          >
            {filteredOptions.length === 0 ? (
              <AppView center className="py-8">
                <AppText style={{ color: colors.textMuted }}>{emptyText}</AppText>
              </AppView>
            ) : (
              filteredOptions.map((item, index) => {
                const isSelected = selectedValues.includes(item.value);
                return (
                  <AppPressable
                    key={`${item.value}-${index}`}
                    testID={`select-option-${item.value}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    row
                    items="center"
                    justify="between"
                    px={16}
                    py={12}
                    className={cn(isSelected && 'bg-primary-50')}
                    style={[
                      styles.optionItem,
                      { borderBottomColor: colors.divider },
                      isSelected && { backgroundColor: colors.primarySurface },
                    ]}
                    onPress={() => handleSelect(item.value)}
                    motionPreset={resolvedMotionPreset}
                    motionDuration={motionDuration}
                    motionReduceMotion={motionReduceMotion}
                  >
                    <AppText style={{ color: isSelected ? colors.primary : colors.text }}>
                      {item.label}
                    </AppText>
                    {isSelected && <Icon name="check" size="sm" color="primary-500" />}
                  </AppPressable>
                );
              })
            )}
          </AppScrollView>

          {multiple && (
            <AppView
              row
              between
              items="center"
              className="px-4 py-3"
              style={[styles.footer, { borderTopColor: colors.divider }]}
            >
              <AppText style={{ color: colors.textMuted }}>
                {formatSelectedCountText(selectedCountText, selectedValues.length)}
              </AppText>
              <AppPressable
                testID="select-confirm"
                px={16}
                py={8}
                rounded="lg"
                style={{ backgroundColor: colors.primary }}
                onPress={close}
                pressedClassName="opacity-90"
                motionPreset={resolvedMotionPreset}
                motionDuration={motionDuration}
                motionReduceMotion={motionReduceMotion}
              >
                <AppText className="font-medium" style={{ color: colors.textInverse }}>
                  {confirmText}
                </AppText>
              </AppPressable>
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
  header: {
    borderBottomWidth: 0.5,
  },
  searchBox: {
    borderBottomWidth: 0.5,
  },
  optionsList: {
    maxHeight: 360,
  },
  optionItem: {
    borderBottomWidth: 0.5,
  },
  footer: {
    borderTopWidth: 0.5,
  },
});
