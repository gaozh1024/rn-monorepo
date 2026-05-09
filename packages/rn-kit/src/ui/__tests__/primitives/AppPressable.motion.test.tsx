import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react-native';
import { MotionConfigProvider } from '../../motion/context';
import { AppPressable } from '../../primitives/AppPressable';

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
});
