import * as React from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/theme';
import { cn } from '@/utils';
import { AppPressable, AppText, AppView } from '@/ui/primitives';
import { motionDurations } from '../motion/tokens';
import type { MotionAnimatedViewStyle, MotionSpringPreset } from '../motion';
import { useReducedMotion } from '../motion/hooks/useReducedMotion';
import { resolveDuration, resolveSpringConfig } from '../motion/utils';
import {
  type CommonLayoutProps,
  type LayoutRounded,
  resolveRoundedStyle,
  resolveSizingStyle,
  resolveSpacingStyle,
} from '../utils/layout-shortcuts';

export interface SegmentedTabOption<Value extends string | number = string> {
  /** 选项值，受控/回调使用 */
  value: Value;
  /** 默认标签内容 */
  label: React.ReactNode;
  /** 可选图标，会渲染在 label 左侧 */
  icon?: React.ReactNode;
  /** 禁用单个选项 */
  disabled?: boolean;
  /** 选项无障碍标签 */
  accessibilityLabel?: string;
  /** 选项测试 ID */
  testID?: string;
}

export interface SegmentedTabsRenderState<Value extends string | number = string> {
  option: SegmentedTabOption<Value>;
  index: number;
  selected: boolean;
  disabled: boolean;
}

export interface SegmentedTabsProps<Value extends string | number = string> extends Pick<
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
> {
  /** 选项列表 */
  options: Array<SegmentedTabOption<Value>>;
  /** 当前值（受控） */
  value?: Value;
  /** 默认值（非受控） */
  defaultValue?: Value;
  /** 切换回调 */
  onChange?: (value: Value, option: SegmentedTabOption<Value>, index: number) => void;
  /** 整体禁用 */
  disabled?: boolean;
  /** 尺寸预设 */
  size?: 'sm' | 'md' | 'lg';
  /** 圆角预设，默认 full */
  rounded?: LayoutRounded;
  /** 滑块距离容器边缘的内缩，默认 3 */
  indicatorInset?: number;
  /** 选中滑块颜色，默认主题主色 */
  indicatorColor?: string;
  /** 容器背景色，默认主题分割线色 */
  backgroundColor?: string;
  /** 选中文字色，默认反白 */
  activeTintColor?: string;
  /** 未选中文字色，默认 muted */
  inactiveTintColor?: string;
  /** 禁用文字色 */
  disabledTintColor?: string;
  /** 是否让滑块跟随点击动画移动，默认 true */
  animated?: boolean;
  /** 动画时长 */
  motionDuration?: number;
  /** 使用 spring 动画预设 */
  motionSpringPreset?: MotionSpringPreset;
  /** 是否关闭动画 */
  motionReduceMotion?: boolean;
  /** 自定义标签渲染 */
  renderLabel?: (state: SegmentedTabsRenderState<Value>) => React.ReactNode;
  /** 自定义整个选项内容渲染 */
  renderItem?: (state: SegmentedTabsRenderState<Value>) => React.ReactNode;
  /** 测试 ID */
  testID?: string;
  /** 容器样式 */
  style?: StyleProp<ViewStyle>;
  /** 滑块样式 */
  indicatorStyle?: StyleProp<ViewStyle>;
  /** 选项样式 */
  itemStyle?: StyleProp<ViewStyle>;
  /** 选中选项样式 */
  activeItemStyle?: StyleProp<ViewStyle>;
  /** 标签样式 */
  labelStyle?: StyleProp<TextStyle>;
  /** 选中标签样式 */
  activeLabelStyle?: StyleProp<TextStyle>;
  /** 禁用标签样式 */
  disabledLabelStyle?: StyleProp<TextStyle>;
  /** 容器 className */
  className?: string;
  /** 滑块 className */
  indicatorClassName?: string;
  /** 选项 className */
  itemClassName?: string;
  /** 选中选项 className */
  activeItemClassName?: string;
  /** 标签 className */
  labelClassName?: string;
  /** 选中标签 className */
  activeLabelClassName?: string;
}

const sizeConfig = {
  sm: { height: 32, labelSize: 'sm' as const, itemPaddingHorizontal: 10 },
  md: { height: 40, labelSize: 'sm' as const, itemPaddingHorizontal: 12 },
  lg: { height: 48, labelSize: 'md' as const, itemPaddingHorizontal: 14 },
};

interface SegmentedTabsIndicatorProps extends Pick<
  SegmentedTabsProps,
  | 'indicatorClassName'
  | 'indicatorStyle'
  | 'motionDuration'
  | 'motionReduceMotion'
  | 'motionSpringPreset'
> {
  indicatorInset: number;
  resolvedHeight: number;
  resolvedIndicatorColor: string;
  roundedStyle: ReturnType<typeof resolveRoundedStyle>;
  targetWidth: number;
  targetX: number;
  testID?: string;
  visible: boolean;
}

function getIndicatorBaseStyle({
  indicatorInset,
  resolvedHeight,
  resolvedIndicatorColor,
  visible,
}: Pick<
  SegmentedTabsIndicatorProps,
  'indicatorInset' | 'resolvedHeight' | 'resolvedIndicatorColor' | 'visible'
>): ViewStyle {
  return {
    top: indicatorInset,
    height: Math.max(resolvedHeight - indicatorInset * 2, 0),
    backgroundColor: resolvedIndicatorColor,
    opacity: visible ? 1 : 0,
  };
}

function PlainSegmentedTabsIndicator({
  indicatorClassName,
  indicatorInset,
  indicatorStyle,
  resolvedHeight,
  resolvedIndicatorColor,
  roundedStyle,
  targetWidth,
  targetX,
  testID,
  visible,
}: SegmentedTabsIndicatorProps) {
  return (
    <AppView
      testID={testID}
      className={cn(indicatorClassName)}
      pointerEvents="none"
      style={[
        styles.indicator,
        roundedStyle,
        getIndicatorBaseStyle({
          indicatorInset,
          resolvedHeight,
          resolvedIndicatorColor,
          visible,
        }),
        {
          width: targetWidth,
          transform: [{ translateX: targetX }],
        },
        indicatorStyle,
      ]}
    />
  );
}

function MotionSegmentedTabsIndicator({
  indicatorClassName,
  indicatorInset,
  indicatorStyle,
  motionDuration,
  motionReduceMotion,
  motionSpringPreset,
  resolvedHeight,
  resolvedIndicatorColor,
  roundedStyle,
  targetWidth,
  targetX,
  testID,
  visible,
}: SegmentedTabsIndicatorProps) {
  const { reduceMotion: systemReduceMotion, durationScale } = useReducedMotion();
  const reduceMotion = motionReduceMotion ?? systemReduceMotion;
  const duration = resolveDuration(
    motionDuration,
    motionSpringPreset ? motionDurations.medium : motionDurations.normal,
    reduceMotion,
    durationScale
  );
  const translateX = useSharedValue(targetX);
  const indicatorWidth = useSharedValue(targetWidth);

  const animateValue = React.useCallback(
    (nextValue: number) => {
      if (duration === 0) return nextValue;
      if (motionSpringPreset) return withSpring(nextValue, resolveSpringConfig(motionSpringPreset));
      return withTiming(nextValue, { duration });
    },
    [duration, motionSpringPreset]
  );

  React.useEffect(() => {
    translateX.value = animateValue(targetX);
    indicatorWidth.value = animateValue(targetWidth);
  }, [animateValue, indicatorWidth, targetWidth, targetX, translateX]);

  const animatedIndicatorStyle = useAnimatedStyle(
    () =>
      ({
        width: indicatorWidth.value,
        transform: [{ translateX: translateX.value }],
      }) satisfies MotionAnimatedViewStyle,
    []
  );

  return (
    <Animated.View
      testID={testID}
      className={cn(indicatorClassName)}
      pointerEvents="none"
      style={[
        styles.indicator,
        roundedStyle,
        getIndicatorBaseStyle({
          indicatorInset,
          resolvedHeight,
          resolvedIndicatorColor,
          visible,
        }),
        animatedIndicatorStyle,
        indicatorStyle,
      ]}
    />
  );
}

function findValueIndex<Value extends string | number>(
  options: Array<SegmentedTabOption<Value>>,
  value?: Value
) {
  if (value === undefined) return -1;
  return options.findIndex(option => option.value === value);
}

/**
 * SegmentedTabs - 可复用的滑块式 Tab/Menu 切换条。
 *
 * 适合页面内分类、状态筛选、顶部 menu 等场景。点击选项后，底层的
 * Animated.View 会按选中索引左右平移动画切换，并支持受控/非受控用法。
 */
export function SegmentedTabs<Value extends string | number = string>({
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
  options,
  value,
  defaultValue,
  onChange,
  disabled = false,
  size = 'md',
  rounded = 'full',
  indicatorInset = 3,
  indicatorColor,
  backgroundColor,
  activeTintColor,
  inactiveTintColor,
  disabledTintColor,
  animated = true,
  motionDuration,
  motionSpringPreset,
  motionReduceMotion,
  renderLabel,
  renderItem,
  testID,
  style,
  indicatorStyle,
  itemStyle,
  activeItemStyle,
  labelStyle,
  activeLabelStyle,
  disabledLabelStyle,
  className,
  indicatorClassName,
  itemClassName,
  activeItemClassName,
  labelClassName,
  activeLabelClassName,
}: SegmentedTabsProps<Value>) {
  const colors = useThemeColors();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [internalValue, setInternalValue] = React.useState<Value | undefined>(
    defaultValue ?? options[0]?.value
  );

  const selectedValue = value ?? internalValue;
  const selectedIndex = React.useMemo(() => {
    const index = findValueIndex(options, selectedValue);
    return index >= 0 ? index : 0;
  }, [options, selectedValue]);

  const config = sizeConfig[size];
  const resolvedHeight = typeof h === 'number' ? h : config.height;
  const roundedStyle = resolveRoundedStyle(rounded);
  const itemWidth = options.length > 0 && containerWidth > 0 ? containerWidth / options.length : 0;
  const targetWidth = Math.max(itemWidth - indicatorInset * 2, 0);
  const targetX = selectedIndex * itemWidth + indicatorInset;

  if (options.length === 0) return null;

  const handlePress = (option: SegmentedTabOption<Value>, index: number) => {
    if (disabled || option.disabled || option.value === selectedValue) return;

    if (value === undefined) {
      setInternalValue(option.value);
    }

    onChange?.(option.value, option, index);
  };

  const resolvedIndicatorColor = indicatorColor ?? colors.primary;
  const resolvedBackgroundColor = backgroundColor ?? colors.divider;
  const resolvedActiveTintColor = activeTintColor ?? colors.textInverse;
  const resolvedInactiveTintColor = inactiveTintColor ?? colors.textMuted;
  const resolvedDisabledTintColor = disabledTintColor ?? colors.iconMuted;
  const indicatorTestID = testID ? `${testID}-indicator` : undefined;
  const shouldAnimateIndicator = animated && motionReduceMotion !== true;

  return (
    <AppView
      row
      p={indicatorInset}
      flex={flex}
      m={m}
      mx={mx}
      my={my}
      mt={mt}
      mb={mb}
      ml={ml}
      mr={mr}
      w={w}
      minW={minW}
      minH={minH}
      maxW={maxW}
      maxH={maxH}
      className={cn(className)}
      testID={testID}
      onLayout={event => setContainerWidth(event.nativeEvent.layout.width)}
      style={[
        styles.container,
        roundedStyle,
        { height: resolvedHeight, backgroundColor: resolvedBackgroundColor },
        resolveSpacingStyle({ m, mx, my, mt, mb, ml, mr, p: indicatorInset }),
        resolveSizingStyle({ w, h, minW, minH, maxW, maxH }),
        style,
      ]}
    >
      {shouldAnimateIndicator ? (
        <MotionSegmentedTabsIndicator
          indicatorClassName={indicatorClassName}
          indicatorInset={indicatorInset}
          indicatorStyle={indicatorStyle}
          motionDuration={motionDuration}
          motionReduceMotion={motionReduceMotion}
          motionSpringPreset={motionSpringPreset}
          resolvedHeight={resolvedHeight}
          resolvedIndicatorColor={resolvedIndicatorColor}
          roundedStyle={roundedStyle}
          targetWidth={targetWidth}
          targetX={targetX}
          testID={indicatorTestID}
          visible={containerWidth > 0}
        />
      ) : (
        <PlainSegmentedTabsIndicator
          indicatorClassName={indicatorClassName}
          indicatorInset={indicatorInset}
          indicatorStyle={indicatorStyle}
          motionDuration={motionDuration}
          motionReduceMotion={motionReduceMotion}
          motionSpringPreset={motionSpringPreset}
          resolvedHeight={resolvedHeight}
          resolvedIndicatorColor={resolvedIndicatorColor}
          roundedStyle={roundedStyle}
          targetWidth={targetWidth}
          targetX={targetX}
          testID={indicatorTestID}
          visible={containerWidth > 0}
        />
      )}

      {options.map((option, index) => {
        const selected = index === selectedIndex;
        const itemDisabled = disabled || option.disabled === true;
        const state = { option, index, selected, disabled: itemDisabled };
        const textColor = itemDisabled
          ? resolvedDisabledTintColor
          : selected
            ? resolvedActiveTintColor
            : resolvedInactiveTintColor;
        const labelNode = renderLabel ? (
          renderLabel(state)
        ) : typeof option.label === 'string' || typeof option.label === 'number' ? (
          <AppText
            size={config.labelSize}
            weight={selected ? 'semibold' : 'medium'}
            numberOfLines={1}
            className={cn(labelClassName, selected && activeLabelClassName)}
            style={[
              styles.label,
              { color: textColor },
              labelStyle,
              selected && activeLabelStyle,
              itemDisabled && disabledLabelStyle,
            ]}
          >
            {option.label}
          </AppText>
        ) : (
          option.label
        );

        return (
          <AppPressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: itemDisabled }}
            accessibilityLabel={option.accessibilityLabel}
            disabled={itemDisabled}
            testID={option.testID ?? (testID ? `${testID}-item-${option.value}` : undefined)}
            onPress={() => handlePress(option, index)}
            className={cn(itemClassName, selected && activeItemClassName)}
            style={[
              styles.item,
              {
                height: Math.max(resolvedHeight - indicatorInset * 2, 0),
                paddingHorizontal: config.itemPaddingHorizontal,
              },
              itemStyle,
              selected && activeItemStyle,
            ]}
          >
            {renderItem ? (
              renderItem(state)
            ) : (
              <View style={styles.itemContent}>
                {option.icon}
                {labelNode}
              </View>
            )}
          </AppPressable>
        );
      })}
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  indicator: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  itemContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
