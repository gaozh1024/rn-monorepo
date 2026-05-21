import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import { withSpring, withTiming } from 'react-native-reanimated';
import { ThemeProvider, createTheme } from '@/theme';
import { SegmentedTabs } from '../../display/SegmentedTabs';

const theme = createTheme({
  colors: {
    primary: '#f38b32',
    card: '#ffffff',
    border: '#e5e7eb',
    text: '#111827',
  },
});

const options = [
  { label: '全部', value: 'all' },
  { label: '待处理', value: 'pending' },
  { label: '已完成', value: 'done' },
];

function flattenStyleEntries(style: unknown): Array<Record<string, unknown>> {
  if (!style) return [];
  if (Array.isArray(style)) return style.flatMap(flattenStyleEntries);
  if (typeof style === 'object') return [style as Record<string, unknown>];
  return [];
}

describe('SegmentedTabs', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    (Platform as any).OS = originalPlatformOS;
    vi.mocked(withTiming).mockClear();
    vi.mocked(withSpring).mockClear();
  });

  it('应该渲染选项并在非受控模式点击切换', () => {
    const onChange = vi.fn();
    const { getByText, getByTestId } = render(
      <ThemeProvider light={theme}>
        <SegmentedTabs testID="tabs" options={options} value="all" onChange={onChange} />
      </ThemeProvider>
    );

    expect(getByText('全部')).toBeTruthy();
    expect(getByText('待处理')).toBeTruthy();
    expect(getByText('已完成')).toBeTruthy();

    act(() => {
      fireEvent.press(getByTestId('tabs-item-pending'));
    });

    expect(onChange).toHaveBeenCalledWith('pending', options[1], 1);
  });

  it('应该在布局与选中值变化时使用 timing 动画移动滑块', () => {
    const { getByTestId, rerender } = render(
      <ThemeProvider light={theme}>
        <SegmentedTabs testID="tabs" options={options} value="all" />
      </ThemeProvider>
    );

    act(() => {
      getByTestId('tabs').props.onLayout({
        nativeEvent: { layout: { width: 300, height: 40, x: 0, y: 0 } },
      });
    });

    rerender(
      <ThemeProvider light={theme}>
        <SegmentedTabs testID="tabs" options={options} value="done" />
      </ThemeProvider>
    );

    expect(withTiming).toHaveBeenCalledWith(203, { duration: 180 });
    expect(withTiming).toHaveBeenCalledWith(94, { duration: 180 });
  });

  it('传入 spring 预设时应该使用 spring 动画', () => {
    const { getByTestId, rerender } = render(
      <ThemeProvider light={theme}>
        <SegmentedTabs testID="tabs" options={options} value="all" motionSpringPreset="smooth" />
      </ThemeProvider>
    );

    act(() => {
      getByTestId('tabs').props.onLayout({
        nativeEvent: { layout: { width: 300, height: 40, x: 0, y: 0 } },
      });
    });

    rerender(
      <ThemeProvider light={theme}>
        <SegmentedTabs
          testID="tabs"
          options={options}
          value="pending"
          motionSpringPreset="smooth"
        />
      </ThemeProvider>
    );

    expect(withSpring).toHaveBeenCalledWith(103, { damping: 22, stiffness: 180, mass: 1 });
  });

  it('animated=false 时应该使用普通滑块并跳过 timing/spring 动画', () => {
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <SegmentedTabs testID="tabs" options={options} value="done" animated={false} />
      </ThemeProvider>
    );

    act(() => {
      getByTestId('tabs').props.onLayout({
        nativeEvent: { layout: { width: 300, height: 40, x: 0, y: 0 } },
      });
    });

    const indicator = getByTestId('tabs-indicator');
    const indicatorStyles = flattenStyleEntries(indicator.props.style);

    expect(indicator.type).not.toBe('Animated.View');
    expect(indicatorStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 94,
          transform: [{ translateX: 203 }],
        }),
      ])
    );
    expect(withTiming).not.toHaveBeenCalled();
    expect(withSpring).not.toHaveBeenCalled();
  });

  it('Web + animated=true 时应该使用 CSS 过渡滑块并保持可见', () => {
    (Platform as any).OS = 'web';

    const { getByTestId, rerender } = render(
      <ThemeProvider light={theme}>
        <SegmentedTabs testID="tabs" options={options} value="all" />
      </ThemeProvider>
    );

    act(() => {
      getByTestId('tabs').props.onLayout({
        nativeEvent: { layout: { width: 300, height: 40, x: 0, y: 0 } },
      });
    });

    rerender(
      <ThemeProvider light={theme}>
        <SegmentedTabs testID="tabs" options={options} value="done" />
      </ThemeProvider>
    );

    const indicator = getByTestId('tabs-indicator');
    const indicatorStyles = flattenStyleEntries(indicator.props.style);

    expect(indicator.type).not.toBe('Animated.View');
    expect(indicatorStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 94,
          transform: [{ translateX: 203 }],
        }),
        expect.objectContaining({
          transitionProperty: 'transform, width, opacity',
          transitionDuration: '180ms',
        }),
      ])
    );
    expect(withTiming).not.toHaveBeenCalled();
    expect(withSpring).not.toHaveBeenCalled();
  });

  it('应该支持禁用选项', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <ThemeProvider light={theme}>
        <SegmentedTabs
          testID="tabs"
          options={[options[0], { ...options[1], disabled: true }]}
          onChange={onChange}
        />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('tabs-item-pending'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('空 options 时应该不渲染', () => {
    const { queryByTestId } = render(
      <ThemeProvider light={theme}>
        <SegmentedTabs testID="tabs" options={[]} />
      </ThemeProvider>
    );

    expect(queryByTestId('tabs')).toBeNull();
  });
});
