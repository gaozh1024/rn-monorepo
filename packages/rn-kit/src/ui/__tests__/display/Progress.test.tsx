import { describe, it, expect } from 'vitest';
import React from 'react';
import { Platform } from 'react-native';
import { act, create } from 'react-test-renderer';
import { ThemeProvider, createTheme } from '@/theme';
import { Progress } from '../../display/Progress';
import { AppView } from '../../primitives/AppView';

const theme = createTheme({
  colors: { primary: '#f38b32', card: '#ffffff', border: '#e5e7eb' },
});

describe('Progress', () => {
  const originalPlatformOS = Platform.OS;

  function flattenStyle(style: any): Record<string, any> {
    if (!style) return {};
    if (Array.isArray(style)) {
      return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
    }
    return style ?? {};
  }

  it('应该根据 value 计算进度宽度', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Progress value={40} max={100} />
        </ThemeProvider>
      );
    });

    const track = renderer!.root.findByType(AppView);
    const bar = renderer!.root.findAll(
      node =>
        typeof node.type === 'string' &&
        node.type === 'Animated.View' &&
        Array.isArray(node.props.style)
    )[0];

    expect(track).toBeTruthy();
    const widthStyle = bar.props.style.find((style: Record<string, unknown>) => 'width' in style);
    expect(widthStyle.width).toBe('40%');
  });

  it('应该支持基础快捷参数', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Progress value={60} w={180} h={12} mt={8} rounded="xl" surface="card" />
        </ThemeProvider>
      );
    });

    const track = renderer!.root.findByType(AppView);
    const bar = renderer!.root.findAll(
      node =>
        typeof node.type === 'string' &&
        node.type === 'Animated.View' &&
        Array.isArray(node.props.style)
    )[0];

    expect(track.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 180, height: 12 }),
        expect.objectContaining({ marginTop: 8 }),
        expect.objectContaining({ borderRadius: 16 }),
        expect.objectContaining({ backgroundColor: '#ffffff' }),
      ])
    );
    expect(bar.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderRadius: 16 })])
    );
    const widthStyle = bar.props.style.find((style: Record<string, unknown>) => 'width' in style);
    expect(widthStyle.width).toBe('60%');
  });

  it('Web + animated=true 时应使用过渡样式而不是 Animated.View', () => {
    (Platform as any).OS = 'web';

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Progress value={35} max={100} />
        </ThemeProvider>
      );
    });

    const animatedBars = renderer!.root.findAll(node => node.type === 'Animated.View');
    const bars = renderer!.root.findAll(
      node =>
        node.type === AppView &&
        Array.isArray(node.props.style) &&
        node.props.style.some((part: Record<string, unknown> | undefined) => part?.width === '35%')
    );

    expect(animatedBars).toHaveLength(0);
    expect(bars).toHaveLength(1);
    expect(flattenStyle(bars[0].props.style)).toMatchObject({
      width: '35%',
      transitionProperty: 'width',
      transitionDuration: '220ms',
    });

    (Platform as any).OS = originalPlatformOS;
  });
});
