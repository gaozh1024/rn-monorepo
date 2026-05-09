import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@/theme';
import { Checkbox } from '../../form/Checkbox';
import { Radio } from '../../form/Radio';
import { Switch } from '../../form/Switch';

const useToggleMotionMock = vi.hoisted(() => vi.fn());

vi.mock('../../motion/hooks/useToggleMotion', () => ({
  useToggleMotion: useToggleMotionMock,
}));

const theme = createTheme({
  colors: { primary: '#f38b32' },
});

describe('toggle motion props', () => {
  beforeEach(() => {
    useToggleMotionMock.mockReset();
    useToggleMotionMock.mockReturnValue({
      progress: { interpolate: vi.fn() },
      trackStyle: undefined,
      thumbStyle: {},
      indicatorStyle: {},
    });
  });

  it('Switch 应该透传自定义切换动画配置', () => {
    render(
      <ThemeProvider light={theme}>
        <Switch checked motionDuration={260} motionSpringPreset="snappy" />
      </ThemeProvider>
    );

    expect(useToggleMotionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        value: true,
        preset: 'switch',
        duration: 260,
        spring: 'snappy',
      })
    );
  });

  it('Checkbox 应该透传自定义切换动画配置', () => {
    render(
      <ThemeProvider light={theme}>
        <Checkbox checked motionDuration={180} motionSpringPreset="smooth" />
      </ThemeProvider>
    );

    expect(useToggleMotionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        value: true,
        preset: 'checkbox',
        duration: 180,
        spring: 'smooth',
      })
    );
  });

  it('Radio 应该透传自定义切换动画配置', () => {
    render(
      <ThemeProvider light={theme}>
        <Radio checked motionDuration={200} motionSpringPreset="bouncy" />
      </ThemeProvider>
    );

    expect(useToggleMotionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        value: true,
        preset: 'radio',
        duration: 200,
        spring: 'bouncy',
      })
    );
  });

  it('animated=false 时不应该调用切换动画 hook', () => {
    render(
      <ThemeProvider light={theme}>
        <>
          <Switch checked animated={false} />
          <Checkbox checked animated={false} />
          <Radio checked animated={false} />
        </>
      </ThemeProvider>
    );

    expect(useToggleMotionMock).not.toHaveBeenCalled();
  });

  it('motionReduceMotion=true 时不应该调用切换动画 hook', () => {
    render(
      <ThemeProvider light={theme}>
        <>
          <Switch checked motionReduceMotion />
          <Checkbox checked motionReduceMotion />
          <Radio checked motionReduceMotion />
        </>
      </ThemeProvider>
    );

    expect(useToggleMotionMock).not.toHaveBeenCalled();
  });
});
