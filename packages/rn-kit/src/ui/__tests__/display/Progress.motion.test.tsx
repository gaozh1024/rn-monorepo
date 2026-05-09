import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@/theme';
import { Progress } from '../../display/Progress';

const useProgressMotionMock = vi.hoisted(() => vi.fn());

vi.mock('../../motion/hooks/useProgressMotion', () => ({
  useProgressMotion: useProgressMotionMock,
}));

const theme = createTheme({
  colors: { primary: '#f38b32', card: '#ffffff', border: '#e5e7eb' },
});

describe('Progress motion props', () => {
  beforeEach(() => {
    useProgressMotionMock.mockReset();
    useProgressMotionMock.mockReturnValue({
      progress: { value: 0.5 },
      animatedValue: { value: 50 },
      barStyle: { width: '50%' },
    });
  });

  it('应该透传自定义 progress motion 配置', () => {
    render(
      <ThemeProvider light={theme}>
        <Progress value={50} motionDuration={280} motionSpringPreset="smooth" motionReduceMotion />
      </ThemeProvider>
    );

    expect(useProgressMotionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 50,
        min: 0,
        max: 100,
        duration: 280,
        spring: 'smooth',
        reduceMotion: true,
      })
    );
  });

  it('animated=false 时不应该调用 progress motion hook', () => {
    render(
      <ThemeProvider light={theme}>
        <Progress value={50} animated={false} />
      </ThemeProvider>
    );

    expect(useProgressMotionMock).not.toHaveBeenCalled();
  });
});
