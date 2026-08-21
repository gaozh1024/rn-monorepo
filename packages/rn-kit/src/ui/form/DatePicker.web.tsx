import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMotionConfig, type PressMotionProps, type SheetMotionProps } from '@/ui/motion';
import { AppPressable, AppText, AppView } from '@/ui/primitives';
import { formatDate } from '@/utils';
import { Picker, type PickerColumn, type PickerValue } from './Picker.web';
import { useFormThemeColors } from './useFormTheme';
import type { CommonLayoutProps, LayoutSurface } from '../utils/layout-shortcuts';

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
  value?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  format?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  cancelText?: string;
  confirmText?: string;
  pickerTitle?: string;
  pickerDateFormat?: string;
  yearLabel?: string;
  monthLabel?: string;
  dayLabel?: string;
  todayText?: string;
  minDateText?: string;
  maxDateText?: string;
  bg?: string;
  surface?: LayoutSurface;
}

function createSafeDate(year: number, month: number, day: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, daysInMonth));
}

function getDateValues(date: Date): PickerValue[] {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

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
  const resolvedMotionPreset = motionPreset ?? motionConfig.defaultPressPreset ?? 'none';

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
              testID={`date-picker-quick-${action.label}`}
              flex
              py={8}
              items="center"
              rounded="lg"
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
