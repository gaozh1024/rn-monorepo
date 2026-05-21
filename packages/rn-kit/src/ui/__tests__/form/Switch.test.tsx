import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Platform } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { act, create } from 'react-test-renderer';
import { Switch } from '../../form/Switch';
import { AppPressable, AppView } from '../../primitives';
import { renderWithTheme } from './test-utils';
import { ThemeProvider, createTheme } from '@/theme';

const theme = createTheme({
  colors: { primary: '#f38b32' },
});

describe('Switch', () => {
  const originalPlatformOS = Platform.OS;

  function flattenStyle(style: any): Record<string, any> {
    if (!style) return {};
    if (Array.isArray(style)) {
      return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
    }
    return style ?? {};
  }

  it('应该在非受控模式下切换状态', async () => {
    vi.useFakeTimers();

    try {
      const onChange = vi.fn();
      let renderer: ReturnType<typeof create>;

      act(() => {
        renderer = create(
          <ThemeProvider light={theme}>
            <Switch testID="switch" defaultChecked={false} onChange={onChange} />
          </ThemeProvider>
        );
      });

      const pressable = renderer!.root.findByType(AppPressable);

      await act(async () => {
        pressable.props.onPress?.();
        await Promise.resolve();
      });

      await act(async () => {
        vi.advanceTimersByTime(220);
        await Promise.resolve();
      });

      expect(onChange).toHaveBeenCalledWith(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('应该在禁用时阻止切换', () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithTheme(
      <Switch testID="switch" checked={false} onChange={onChange} disabled />
    );

    fireEvent.press(getByTestId('switch'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('应该在动画期间阻止重复点击', async () => {
    vi.useFakeTimers();

    try {
      const onChange = vi.fn();
      let renderer: ReturnType<typeof create>;

      act(() => {
        renderer = create(
          <ThemeProvider light={theme}>
            <Switch testID="switch" checked={false} onChange={onChange} />
          </ThemeProvider>
        );
      });

      const pressable = renderer!.root.findByType(AppPressable);

      await act(async () => {
        pressable.props.onPress?.();
        await Promise.resolve();
      });
      await act(async () => {
        pressable.props.onPress?.();
        await Promise.resolve();
      });

      expect(onChange).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(220);
        await Promise.resolve();
      });

      await act(async () => {
        pressable.props.onPress?.();
        await Promise.resolve();
      });

      await act(async () => {
        vi.advanceTimersByTime(220);
        await Promise.resolve();
      });

      expect(onChange).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('应该根据 motionDuration 调整交互锁定时长', async () => {
    vi.useFakeTimers();

    try {
      const onChange = vi.fn();
      let renderer: ReturnType<typeof create>;

      act(() => {
        renderer = create(
          <ThemeProvider light={theme}>
            <Switch testID="switch" checked={false} onChange={onChange} motionDuration={100} />
          </ThemeProvider>
        );
      });

      const pressable = renderer!.root.findByType(AppPressable);

      await act(async () => {
        pressable.props.onPress?.();
        await Promise.resolve();
      });
      await act(async () => {
        pressable.props.onPress?.();
        await Promise.resolve();
      });

      expect(onChange).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(99);
        await Promise.resolve();
      });
      await act(async () => {
        pressable.props.onPress?.();
        await Promise.resolve();
      });
      expect(onChange).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(1);
        await Promise.resolve();
      });
      await act(async () => {
        pressable.props.onPress?.();
        await Promise.resolve();
      });
      expect(onChange).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('应该支持基础快捷参数', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(<Switch testID="switch" size="lg" mt={10} flex rounded="xl" />);
    });

    const pressable = renderer!.root.findByType(AppPressable);
    const track = renderer!.root
      .findAllByType(AppView)
      .find(
        node =>
          Array.isArray(node.props.style) &&
          node.props.style.some((part: Record<string, unknown> | undefined) => part?.width === 60)
      );

    expect(pressable.props.mt).toBe(10);
    expect(pressable.props.flex).toBe(true);
    expect(track?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderRadius: 16 })])
    );
  });

  it('Web + animated=true 时应使用过渡样式的 PlainSwitchThumb', () => {
    (Platform as any).OS = 'web';

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Switch testID="switch" checked />
        </ThemeProvider>
      );
    });

    const track = renderer!.root
      .findAllByType(AppView)
      .find(
        node =>
          Array.isArray(node.props.style) &&
          node.props.style.some((part: Record<string, unknown> | undefined) => part?.width === 48)
      );

    const thumb = renderer!.root
      .findAllByType(AppView)
      .find(
        node =>
          Array.isArray(node.props.style) &&
          node.props.style.some(
            (part: Record<string, unknown> | undefined) =>
              Array.isArray(part?.transform) && part?.transform?.[0]?.translateX !== undefined
          )
      );

    expect(track).toBeTruthy();
    expect(thumb).toBeTruthy();
    expect(flattenStyle(thumb!.props.style)).toMatchObject({
      transitionProperty: 'transform',
      transitionDuration: '180ms',
    });

    (Platform as any).OS = originalPlatformOS;
  });
});
