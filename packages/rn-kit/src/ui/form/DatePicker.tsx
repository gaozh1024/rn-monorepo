import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { useMotionConfig, type PressMotionProps, type SheetMotionProps } from '@/ui/motion';
import { AppPressable, AppText, AppView } from '@/ui/primitives';
import { formatDate } from '@/utils';
import { Picker, type PickerColumn, type PickerValue } from './Picker';
import { useFormThemeColors } from './useFormTheme';
import type { CommonLayoutProps, LayoutSurface } from '../utils/layout-shortcuts';

/**
 * DatePicker 组件属性接口
 */
export interface DatePickerProps
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
  /** 选中日期 */
  value?: Date;
  /** 变化回调 */
  onChange?: (date: Date) => void;
  /** 占位文字 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 日期格式 */
  format?: string;
  /** 最小日期 */
  minDate?: Date;
  /** 最大日期 */
  maxDate?: Date;
  /** 自定义样式 */
  className?: string;
  /** 触发器文本样式 */
  triggerTextStyle?: StyleProp<TextStyle>;
  /** 弹窗取消按钮文案 */
  cancelText?: string;
  /** 弹窗确认按钮文案 */
  confirmText?: string;
  /** 弹窗标题文案 */
  pickerTitle?: string;
  /** 兼容保留：旧版弹窗顶部日期格式 */
  pickerDateFormat?: string;
  /** 年列标题 */
  yearLabel?: string;
  /** 月列标题 */
  monthLabel?: string;
  /** 日列标题 */
  dayLabel?: string;
  /** 快捷按钮“今天”文案 */
  todayText?: string;
  /** 快捷按钮“最早”文案 */
  minDateText?: string;
  /** 快捷按钮“最晚”文案 */
  maxDateText?: string;
  /** 背景颜色 */
  bg?: string;
  /** 语义化背景 */
  surface?: LayoutSurface;
}

function createSafeDate(year: number, month: number, day: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, daysInMonth));
}

function getDateValues(date: Date): PickerValue[] {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

/**
 * DatePicker - 日期滚轮选择器，保留日期封装并复用通用 Picker
 */
export function DatePicker({
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
  placeholder = '请选择日期',
  disabled = false,
  format = 'yyyy-MM-dd',
  minDate,
  maxDate,
  className,
  triggerTextStyle,
  cancelText = '取消',
  confirmText = '确定',
  pickerTitle = '选择日期',
  pickerDateFormat: _pickerDateFormat = 'yyyy年MM月dd日',
  yearLabel = '年',
  monthLabel = '月',
  dayLabel = '日',
  todayText = '今天',
  minDateText = '最早',
  maxDateText = '最晚',
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
}: DatePickerProps) {
  const motionConfig = useMotionConfig();
  const colors = useFormThemeColors();
  const [tempDate, setTempDate] = useState<Date>(value || new Date());
  const resolvedMotionPreset = motionPreset ?? motionConfig.defaultPressPreset ?? 'soft';

  useEffect(() => {
    if (value) setTempDate(value);
  }, [value]);

  const years = useMemo(() => {
    const baseYear = value?.getFullYear() ?? new Date().getFullYear();
    const startYear = minDate?.getFullYear() ?? baseYear - 50;
    const endYear = maxDate?.getFullYear() ?? baseYear + 50;

    return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
  }, [maxDate, minDate, value]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);

  const days = useMemo(() => {
    const daysInMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => index + 1);
  }, [tempDate]);

  const isDateDisabled = useCallback(
    (year: number, month: number, day: number) => {
      const date = createSafeDate(year, month, day);

      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;

      return false;
    },
    [maxDate, minDate]
  );

  const columns = useMemo<PickerColumn[]>(
    () => [
      {
        key: 'year',
        title: yearLabel,
        options: years.map(year => ({
          label: String(year),
          value: year,
          disabled: isDateDisabled(year, tempDate.getMonth() + 1, tempDate.getDate()),
        })),
      },
      {
        key: 'month',
        title: monthLabel,
        options: months.map(month => ({
          label: `${month}月`,
          value: month,
          disabled: isDateDisabled(tempDate.getFullYear(), month, tempDate.getDate()),
        })),
      },
      {
        key: 'day',
        title: dayLabel,
        options: days.map(day => ({
          label: `${day}日`,
          value: day,
          disabled: isDateDisabled(tempDate.getFullYear(), tempDate.getMonth() + 1, day),
        })),
      },
    ],
    [dayLabel, days, isDateDisabled, monthLabel, months, tempDate, yearLabel, years]
  );

  const handleTempChange = useCallback((nextValues: PickerValue[]) => {
    const [nextYear, nextMonth, nextDay] = nextValues;

    if (
      typeof nextYear !== 'number' ||
      typeof nextMonth !== 'number' ||
      typeof nextDay !== 'number'
    ) {
      return;
    }

    setTempDate(createSafeDate(nextYear, nextMonth, nextDay));
  }, []);

  const handleChange = useCallback(
    (nextValues: PickerValue[]) => {
      const [nextYear, nextMonth, nextDay] = nextValues;

      if (
        typeof nextYear !== 'number' ||
        typeof nextMonth !== 'number' ||
        typeof nextDay !== 'number'
      ) {
        return;
      }

      onChange?.(createSafeDate(nextYear, nextMonth, nextDay));
    },
    [onChange]
  );

  const quickActions = useMemo(() => {
    const actions: Array<{ label: string; date: Date }> = [{ label: todayText, date: new Date() }];

    if (minDate) actions.push({ label: minDateText, date: minDate });
    if (maxDate) actions.push({ label: maxDateText, date: maxDate });

    return actions;
  }, [maxDate, maxDateText, minDate, minDateText, todayText]);

  return (
    <Picker
      flex={flex}
      m={m}
      mx={mx}
      my={my}
      mt={mt}
      mb={mb}
      ml={ml}
      mr={mr}
      w={w}
      h={h}
      minW={minW}
      minH={minH}
      maxW={maxW}
      maxH={maxH}
      rounded={rounded}
      value={value ? getDateValues(value) : undefined}
      tempValue={getDateValues(tempDate)}
      onTempChange={handleTempChange}
      onChange={handleChange}
      onOpen={() => setTempDate(value || new Date())}
      columns={columns}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      triggerTextStyle={triggerTextStyle}
      bg={bg}
      surface={surface}
      motionPreset={resolvedMotionPreset}
      motionDuration={motionDuration}
      motionOpenDuration={motionOpenDuration}
      motionCloseDuration={motionCloseDuration}
      motionReduceMotion={motionReduceMotion}
      motionDistance={motionDistance}
      motionOverlayOpacity={motionOverlayOpacity}
      motionSwipeThreshold={motionSwipeThreshold}
      motionVelocityThreshold={motionVelocityThreshold}
      pickerTitle={pickerTitle}
      cancelText={cancelText}
      confirmText={confirmText}
      triggerIconName="calendar-today"
      renderDisplayText={() => (value ? formatDate(value, format) : placeholder)}
      renderFooter={() => (
        <AppView row className="gap-2">
          {quickActions.map(action => (
            <AppPressable
              key={action.label}
              className="flex-1 py-2 items-center rounded-lg"
              style={{ backgroundColor: colors.surfaceMuted }}
              onPress={() => setTempDate(action.date)}
              motionPreset={resolvedMotionPreset}
              motionDuration={motionDuration}
              motionReduceMotion={motionReduceMotion}
              pressedClassName="opacity-90"
            >
              <AppText style={{ color: colors.text }}>{action.label}</AppText>
            </AppPressable>
          ))}
        </AppView>
      )}
    />
  );
}
