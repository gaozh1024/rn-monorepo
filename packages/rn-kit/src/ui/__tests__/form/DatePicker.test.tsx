import { beforeEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { DatePicker } from '../../form/DatePicker';
import { renderWithTheme } from './test-utils';
import { flattenStyle, resolveInteractiveStyle } from '../style-utils';
import { act, create } from 'react-test-renderer';
import { ThemeProvider, createTheme } from '@/theme';
import { Picker } from '../../form/Picker';

const useSheetMotionMock = vi.hoisted(() => vi.fn());

vi.mock('../../motion/hooks/useSheetMotion', () => ({
  useSheetMotion: useSheetMotionMock,
}));

const theme = createTheme({
  colors: { primary: '#f38b32' },
});

describe('DatePicker', () => {
  beforeEach(() => {
    useSheetMotionMock.mockReset();
    useSheetMotionMock.mockImplementation((options: any) => ({
      mounted: options.visible,
      progress: { interpolate: vi.fn() },
      overlayStyle: {},
      sheetStyle: {},
      panHandlers: undefined,
      open: vi.fn(),
      close: vi.fn(),
    }));
  });

  it('应该渲染格式化后的日期', () => {
    const { getByText } = renderWithTheme(<DatePicker value={new Date(2024, 1, 3)} />);

    expect(getByText('2024-02-03')).toBeTruthy();
  });

  it('应该支持快捷选择最早日期', () => {
    const onChange = vi.fn();
    const minDate = new Date(2024, 0, 1);
    const { getByText } = renderWithTheme(
      <DatePicker placeholder="请选择生日" minDate={minDate} onChange={onChange} />
    );

    fireEvent.press(getByText('请选择生日'));
    expect(getByText('选择日期')).toBeTruthy();

    fireEvent.press(getByText('最早'));
    fireEvent.press(getByText('确定'));

    expect(onChange).toHaveBeenCalledWith(minDate);
  });

  it('应该在禁用时禁用触发区域', () => {
    const { getByText } = renderWithTheme(<DatePicker placeholder="请选择日期" disabled />);

    expect(getByText('请选择日期').props.disabled).toBe(true);
  });

  it('应该支持自定义弹窗文案', () => {
    const { getByText } = renderWithTheme(
      <DatePicker
        placeholder="打开日期"
        pickerTitle="选择生日"
        cancelText="返回"
        confirmText="完成"
        yearLabel="年份"
        monthLabel="月份"
        dayLabel="日期"
        todayText="今日"
      />
    );

    fireEvent.press(getByText('打开日期'));
    expect(getByText('选择生日')).toBeTruthy();
    expect(getByText('返回')).toBeTruthy();
    expect(getByText('完成')).toBeTruthy();
    expect(getByText('年份')).toBeTruthy();
    expect(getByText('月份')).toBeTruthy();
    expect(getByText('日期')).toBeTruthy();
    expect(getByText('今日')).toBeTruthy();
  });

  it('应该透传基础快捷参数到日期触发器', () => {
    const { getByText } = renderWithTheme(
      <DatePicker placeholder="选择日期" h={46} rounded="full" bg="primary-500" />
    );

    let trigger: any = getByText('选择日期');
    while (trigger?.props && !trigger.props.onPress) {
      trigger = trigger.parent;
    }

    expect(resolveInteractiveStyle(trigger.props.style)).toMatchObject({
      height: 46,
      borderRadius: 9999,
      backgroundColor: '#f38b32',
    });
  });

  it('日期触发器文本应该使用稳定的原生文本布局', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <DatePicker value={new Date(2024, 1, 3)} format="yyyy年MM月dd日" />
        </ThemeProvider>
      );
    });

    const triggerText = renderer!.root
      .findAllByType(Text)
      .find(node => node.props.children === '2024年02月03日');

    expect(flattenStyle(triggerText?.props.style)).toMatchObject({
      color: '#1f2937',
      flex: 1,
      flexShrink: 1,
      lineHeight: 20,
      minWidth: 0,
    });
  });

  it('应该透传触发器文本样式给内部 Picker', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <DatePicker value={new Date(2024, 1, 3)} triggerTextStyle={{ lineHeight: 22 }} />
        </ThemeProvider>
      );
    });

    const picker = renderer!.root.findByType(Picker);
    expect(picker.props.triggerTextStyle).toMatchObject({ lineHeight: 22 });
  });

  it('应该透传自定义底部弹层动画配置给内部 Picker', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <DatePicker
            placeholder="打开日期"
            motionDuration={240}
            motionOpenDuration={320}
            motionCloseDuration={180}
            motionDistance={300}
            motionOverlayOpacity={0.7}
            motionSwipeThreshold={92}
            motionVelocityThreshold={1.3}
            motionReduceMotion
          />
        </ThemeProvider>
      );
    });

    const picker = renderer!.root.findByType(Picker);
    expect(picker.props).toMatchObject({
      motionDuration: 240,
      motionOpenDuration: 320,
      motionCloseDuration: 180,
      motionDistance: 300,
      motionOverlayOpacity: 0.7,
      motionSwipeThreshold: 92,
      motionVelocityThreshold: 1.3,
      motionReduceMotion: true,
    });
  });
});
