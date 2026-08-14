import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { render } from '@testing-library/react-native';
import { MotionConfigProvider } from '../../motion/context';
import { AppPressable } from '../../primitives/AppPressable';
import { flattenStyle } from '../style-utils';

const usePressMotionMock = vi.hoisted(() => vi.fn());

vi.mock('../../motion/hooks/usePressMotion', () => ({
  usePressMotion: usePressMotionMock,
}));

describe('AppPressable motion props', () => {
  beforeEach(() => {
    usePressMotionMock.mockReset();
    usePressMotionMock.mockReturnValue({
      pressed: { interpolate: vi.fn() },
      animatedStyle: {},
      onPressIn: vi.fn(),
      onPressOut: vi.fn(),
    });
  });

  it('默认 none 预设不应该调用 usePressMotion', () => {
    render(<AppPressable onPress={vi.fn()}>Press me</AppPressable>);

    expect(usePressMotionMock).not.toHaveBeenCalled();
  });

  it('motionPreset="none" 不应该调用 usePressMotion', () => {
    render(<AppPressable motionPreset="none">Press me</AppPressable>);

    expect(usePressMotionMock).not.toHaveBeenCalled();
  });

  it('默认 none 预设下 motionReduceMotion 不应该调用 usePressMotion', () => {
    render(<AppPressable motionReduceMotion>Press me</AppPressable>);

    expect(usePressMotionMock).not.toHaveBeenCalled();
  });

  it('pressedClassName 本身不应该强制进入 motion 路径', () => {
    render(<AppPressable pressedClassName="opacity-70">Press me</AppPressable>);

    expect(usePressMotionMock).not.toHaveBeenCalled();
  });

  it('motionPreset="soft" 应该调用 usePressMotion', () => {
    render(<AppPressable motionPreset="soft">Press me</AppPressable>);

    expect(usePressMotionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'soft',
      })
    );
  });

  it('motionPreset="strong" 应该透传按压动画配置到 usePressMotion', () => {
    render(
      <AppPressable motionPreset="strong" motionDuration={240} motionReduceMotion>
        Press me
      </AppPressable>
    );

    expect(usePressMotionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'strong',
        duration: 240,
        reduceMotion: true,
      })
    );
  });

  it('应该支持继承全局默认按压预设进入 motion 路径', () => {
    render(
      <MotionConfigProvider defaultPressPreset="soft">
        <AppPressable testID="pressable">按钮</AppPressable>
      </MotionConfigProvider>
    );

    expect(usePressMotionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'soft',
      })
    );
  });

  it('motion 样式应隔离在关闭 cssInterop 的 Animated.View 上', () => {
    const animatedStyle = {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    };

    usePressMotionMock.mockReturnValueOnce({
      pressed: { interpolate: vi.fn() },
      animatedStyle,
      onPressIn: vi.fn(),
      onPressOut: vi.fn(),
    });

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppPressable
          testID="pressable"
          flex
          className="flex-row px-4"
          style={{ height: 40 }}
          motionPreset="soft"
        >
          按钮
        </AppPressable>
      );
    });

    const animatedView = renderer!.root.findByType('Animated.View');
    const pressable = renderer!.root.findByType('Pressable');

    expect(animatedView.props.cssInterop).toBe(false);
    expect(flattenStyle(animatedView.props.style)).toMatchObject({
      flex: 1,
      height: 40,
      opacity: 0.8,
    });
    expect(pressable.props.className).toContain('flex-row');
    expect(pressable.props.style).not.toContain(animatedStyle);
    expect(flattenStyle(pressable.props.style)).toMatchObject({
      alignSelf: 'stretch',
      flexGrow: 1,
    });
    expect(flattenStyle(pressable.props.style).flex).toBeUndefined();
    expect(flattenStyle(pressable.props.style).height).toBeUndefined();
  });

  it('motion 模式不应该在内层 Pressable 重复百分比宽度', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <AppPressable
          center
          testID="pressable"
          style={{ width: '25%', minHeight: 70, paddingHorizontal: 4 }}
          motionPreset="soft"
        >
          通知
        </AppPressable>
      );
    });

    const animatedView = renderer!.root.findByType('Animated.View');
    const pressable = renderer!.root.findByType('Pressable');
    const wrapperStyle = flattenStyle(animatedView.props.style);
    const pressableStyle = flattenStyle(pressable.props.style);

    expect(wrapperStyle).toMatchObject({ width: '25%', minHeight: 70 });
    expect(pressableStyle.width).toBeUndefined();
    expect(pressableStyle.minHeight).toBeUndefined();
    expect(pressableStyle).toMatchObject({
      alignItems: 'center',
      alignSelf: 'stretch',
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 4,
    });
  });
});
