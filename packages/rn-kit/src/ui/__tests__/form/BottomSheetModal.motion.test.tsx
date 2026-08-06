import { describe, expect, it, beforeEach, vi } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { AppText } from '@/ui/primitives';
import { ThemeProvider, createTheme } from '@/theme';
import { renderWithTheme } from './test-utils';
import { BottomSheetModal } from '../../form/BottomSheetModal';
import { flattenStyle } from '../style-utils';

const useSheetMotionMock = vi.hoisted(() => vi.fn());

const theme = createTheme({
  colors: { primary: '#f38b32' },
});

vi.mock('../../motion/hooks/useSheetMotion', () => ({
  useSheetMotion: useSheetMotionMock,
}));

describe('BottomSheetModal motion props', () => {
  beforeEach(() => {
    useSheetMotionMock.mockReset();
    useSheetMotionMock.mockReturnValue({
      mounted: true,
      progress: { value: 1, interpolate: vi.fn() },
      overlayStyle: {},
      sheetStyle: {},
      panHandlers: undefined,
      open: vi.fn(),
      close: vi.fn(),
    });
  });

  it('应该透传自定义 sheet motion 配置', () => {
    renderWithTheme(
      <BottomSheetModal
        visible
        onRequestClose={vi.fn()}
        overlayColor="rgba(0,0,0,0.5)"
        surfaceColor="#ffffff"
        motionDuration={240}
        motionOpenDuration={320}
        motionCloseDuration={180}
        motionDistance={320}
        motionOverlayOpacity={0.72}
        motionSwipeThreshold={96}
        motionVelocityThreshold={1.6}
        motionReduceMotion
      >
        <AppText>内容</AppText>
      </BottomSheetModal>
    );

    expect(useSheetMotionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: true,
        placement: 'bottom',
        duration: 240,
        openDuration: 320,
        closeDuration: 180,
        distance: 320,
        overlayOpacity: 0.72,
        closeOnSwipe: true,
        swipeThreshold: 96,
        velocityThreshold: 1.6,
        reduceMotion: true,
      })
    );
  });

  it('阴影应该随进度淡出', () => {
    useSheetMotionMock.mockReturnValueOnce({
      mounted: true,
      progress: { value: 0.25, interpolate: vi.fn() },
      overlayStyle: {},
      sheetStyle: {},
      panHandlers: undefined,
      open: vi.fn(),
      close: vi.fn(),
    });

    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <BottomSheetModal
            visible
            onRequestClose={vi.fn()}
            overlayColor="rgba(0,0,0,0.5)"
            surfaceColor="#ffffff"
          >
            <AppText>内容</AppText>
          </BottomSheetModal>
        </ThemeProvider>
      );
    });

    const sheet = renderer!.root
      .findAll(node => typeof node.type === 'string' && node.type === 'Animated.View')
      .at(1);

    expect(flattenStyle(sheet?.props.style)).toMatchObject({
      shadowOpacity: 0.03,
      elevation: 3,
    });
  });
});
