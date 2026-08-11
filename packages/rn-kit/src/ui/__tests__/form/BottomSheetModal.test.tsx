import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { act, create } from 'react-test-renderer';
import { BottomSheetModal } from '../../form/BottomSheetModal';
import { AppText } from '@/ui/primitives';
import { ThemeProvider } from '@/theme';
import { renderWithTheme } from './test-utils';
import { theme } from './test-utils';

describe('BottomSheetModal', () => {
  it('不可见且未挂载时不应该渲染弹层内容树', () => {
    const { queryByText, queryByTestId } = renderWithTheme(
      <BottomSheetModal
        visible={false}
        onRequestClose={vi.fn()}
        overlayColor="rgba(0,0,0,0.5)"
        surfaceColor="#ffffff"
        closeOnBackdropPress
      >
        <AppText>隐藏内容</AppText>
      </BottomSheetModal>
    );

    expect(queryByText('隐藏内容')).toBeNull();
    expect(queryByTestId('bottom-sheet-backdrop')).toBeNull();
    expect(queryByTestId('bottom-sheet-handle')).toBeNull();
  });

  it('动画容器应显式关闭 cssInterop，内容类名应落到内层容器', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <BottomSheetModal
            visible
            onRequestClose={vi.fn()}
            overlayColor="rgba(0,0,0,0.5)"
            surfaceColor="#ffffff"
            contentClassName="max-h-[70%]"
          >
            <AppText>内容</AppText>
          </BottomSheetModal>
        </ThemeProvider>
      );
    });

    const animatedViews = renderer!.root.findAll(
      node => typeof node.type === 'string' && node.type === 'Animated.View'
    );
    const sheet = animatedViews[1];
    const surface = renderer!.root
      .findAllByType('View')
      .find(node => node.props.className?.includes?.('max-h-'));

    expect(sheet.props.cssInterop).toBe(false);
    expect(sheet.props.className).toBeUndefined();
    expect(surface?.props.className).toContain('max-h-[70%]');
  });

  it('应该支持点击遮罩关闭', () => {
    const onRequestClose = vi.fn();
    const { getByTestId } = renderWithTheme(
      <BottomSheetModal
        visible
        onRequestClose={onRequestClose}
        overlayColor="rgba(0,0,0,0.5)"
        surfaceColor="#ffffff"
        closeOnBackdropPress
      >
        <AppText>内容</AppText>
      </BottomSheetModal>
    );

    fireEvent.press(getByTestId('bottom-sheet-backdrop'));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('应该支持拖拽 handle 向下关闭', () => {
    const onRequestClose = vi.fn();
    const { getByTestId } = renderWithTheme(
      <BottomSheetModal
        visible
        onRequestClose={onRequestClose}
        overlayColor="rgba(0,0,0,0.5)"
        surfaceColor="#ffffff"
      >
        <AppText>内容</AppText>
      </BottomSheetModal>
    );

    const handle = getByTestId('bottom-sheet-handle');

    act(() => {
      handle.props.onPanResponderGrant?.();
      handle.props.onPanResponderMove?.({}, { dx: 0, dy: 96, vy: 0 });
      handle.props.onPanResponderRelease?.({}, { dx: 0, dy: 96, vy: 0 });
    });

    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});
