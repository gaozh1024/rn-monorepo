import { useState, useCallback, useMemo } from 'react';
import { View, FlatList, TextInput, GestureResponderEvent, StyleSheet } from 'react-native';
import { useMotionConfig, type PressMotionProps, type SheetMotionProps } from '@/ui/motion';
import { AppView, AppText, AppPressable } from '@/ui/primitives';
import { Icon } from '@/ui/display';
import { cn } from '@/utils';
import { BottomSheetModal } from './BottomSheetModal';
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
  /** 选中值 */
  value?: string | string[];
  /** 变化回调 */
  onChange?: (value: string | string[]) => void;
  /** 选项列表 */
  options: SelectOption[];
  /** 占位文字 */
  placeholder?: string;
  /** 是否多选 */
  multiple?: boolean;
  /** 是否可搜索 */
  searchable?: boolean;
  /** 搜索回调（异步搜索时使用） */
  onSearch?: (keyword: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否可清空 */
  clearable?: boolean;
  /** 单选弹窗标题 */
  singleSelectTitle?: string;
  /** 多选弹窗标题 */
  multipleSelectTitle?: string;
  /** 搜索占位文字 */
  searchPlaceholder?: string;
  /** 空状态文案 */
  emptyText?: string;
  /** 多选已选数量文案模板，使用 {{count}} 作为占位符 */
  selectedCountText?: string;
  /** 多选确认按钮文案 */
  confirmText?: string;
  /** 自定义样式 */
  className?: string;
  /** 背景颜色 */
  bg?: string;
  /** 语义化背景 */
  surface?: LayoutSurface;
}

function formatSelectedCountText(template: string, count: number) {
  return template.replace('{{count}}', String(count));
}

/**
 * 底部弹出选择器组件，支持浅色/深色主题
 */
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

  // 处理值格式
  const selectedValues = useMemo(() => {
    if (multiple) {
      return Array.isArray(value) ? value : [];
    }
    return value ? [value] : [];
  }, [value, multiple]);

  // 显示文本
  const displayText = useMemo(() => {
    if (selectedValues.length === 0) return placeholder;
    const selectedLabels = options
      .filter(opt => selectedValues.includes(opt.value))
      .map(opt => opt.label);
    return selectedLabels.join(', ') || placeholder;
  }, [selectedValues, options, placeholder]);

  // 过滤选项
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchKeyword) return options;
    return options.filter(opt => opt.label.toLowerCase().includes(searchKeyword.toLowerCase()));
  }, [options, searchable, searchKeyword]);

  // 选择处理
  const handleSelect = useCallback(
    (optionValue: string) => {
      if (multiple) {
        const currentValues = Array.isArray(value) ? value : [];
        const newValues = currentValues.includes(optionValue)
          ? currentValues.filter(v => v !== optionValue)
          : [...currentValues, optionValue];
        onChange?.(newValues);
      } else {
        onChange?.(optionValue);
        setVisible(false);
      }
    },
    [multiple, onChange, value]
  );

  // 清空
  const handleClear = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      onChange?.(multiple ? [] : '');
    },
    [multiple, onChange]
  );

  // 搜索处理
  const handleSearch = useCallback(
    (text: string) => {
      setSearchKeyword(text);
      onSearch?.(text);
    },
    [onSearch]
  );

  // 渲染选项
  const renderOption = useCallback(
    ({ item }: { item: SelectOption }) => {
      const isSelected = selectedValues.includes(item.value);
      return (
        <AppPressable
          className={cn(
            'flex-row items-center justify-between px-4 py-3',
            isSelected && 'bg-primary-50'
          )}
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
    },
    [selectedValues, handleSelect, colors]
  );

  return (
    <AppView
      style={[
        resolveLayoutStyle({ flex }),
        resolveSpacingStyle({ m, mx, my, mt, mb, ml, mr }),
        resolveSizingStyle({ w }),
      ]}
    >
      {/* 触发区域 */}
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
              onPress={handleClear}
              className="mr-2 p-1"
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

      {/* 选择弹窗 */}
      <BottomSheetModal
        visible={visible}
        onRequestClose={() => setVisible(false)}
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
          {/* 头部 */}
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
              onPress={() => setVisible(false)}
              className="p-1"
              pressedClassName="opacity-70"
              motionPreset={resolvedMotionPreset}
              motionDuration={motionDuration}
              motionReduceMotion={motionReduceMotion}
            >
              <Icon name="close" size="md" color={colors.icon} />
            </AppPressable>
          </AppView>

          {/* 搜索框 */}
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
                    onPress={() => setSearchKeyword('')}
                    className="p-1"
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

          {/* 选项列表 */}
          <FlatList
            data={filteredOptions}
            keyExtractor={(item, index) => `${item.value}-${index}`}
            renderItem={renderOption}
            ListEmptyComponent={
              <AppView center className="py-8">
                <AppText style={{ color: colors.textMuted }}>{emptyText}</AppText>
              </AppView>
            }
          />

          {/* 多选底部操作栏 */}
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
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: colors.primary }}
                onPress={() => setVisible(false)}
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
  optionItem: {
    borderBottomWidth: 0.5,
  },
  footer: {
    borderTopWidth: 0.5,
  },
});
