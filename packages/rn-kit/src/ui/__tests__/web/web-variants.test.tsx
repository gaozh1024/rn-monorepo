import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import { ThemeProvider } from '@/theme';
import { AppStatusBar } from '@/overlay/AppStatusBar.web';
import { BottomSheetModal } from '../../form/BottomSheetModal.web';
import { PageDrawer } from '../../display/PageDrawer.web';
import { Slider } from '../../form/Slider.web';
import { LogOverlay } from '@/overlay/logger/component.web';

const lightTheme = {
  colors: {
    primary: '#f38b32',
    secondary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    background: '#ffffff',
    card: '#ffffff',
    text: '#111827',
    border: '#e5e7eb',
  },
};

function withTheme(children: React.ReactNode) {
  return <ThemeProvider light={lightTheme}>{children}</ThemeProvider>;
}

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  }
  return style;
}

describe('Web platform variants', () => {
  it('AppStatusBar.web renders a stable marker instead of native StatusBar', () => {
    const { getByTestId } = render(withTheme(<AppStatusBar testID="status-bar" />));

    expect(getByTestId('status-bar')).toBeTruthy();
  });

  it('BottomSheetModal.web renders visible sheet content and closes from backdrop', () => {
    const onRequestClose = vi.fn();
    const { getByTestId, getByText } = render(
      <BottomSheetModal
        visible
        closeOnBackdropPress
        onRequestClose={onRequestClose}
        overlayColor="rgba(0,0,0,0.4)"
        surfaceColor="#fff"
      >
        <span>Sheet content</span>
      </BottomSheetModal>
    );

    expect(getByText('Sheet content')).toBeTruthy();
    expect(flattenStyle(getByTestId('bottom-sheet-backdrop').props.style).flex).toBe(1);
    fireEvent.press(getByTestId('bottom-sheet-backdrop'));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('PageDrawer.web renders drawer content and supports close button', () => {
    const onClose = vi.fn();
    const { getByTestId, getByText } = render(
      withTheme(
        <PageDrawer visible title="Drawer" onClose={onClose}>
          <span>Drawer content</span>
        </PageDrawer>
      )
    );

    expect(getByText('Drawer content')).toBeTruthy();
    expect(flattenStyle(getByTestId('page-drawer-close').props.style)).toMatchObject({
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 4,
      paddingRight: 4,
    });
    expect(flattenStyle(getByTestId('page-drawer-backdrop').props.style).flex).toBe(1);
    fireEvent.press(getByTestId('page-drawer-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('BottomSheetModal.web locks scroll and restores focus on close', () => {
    const previousOverflow = document.body.style.overflow;
    const focusTarget = document.createElement('button');
    document.body.appendChild(focusTarget);
    focusTarget.focus();

    const rendered = render(
      <BottomSheetModal
        visible
        onRequestClose={vi.fn()}
        overlayColor="rgba(0,0,0,0.4)"
        surfaceColor="#fff"
      >
        <span>Sheet content</span>
      </BottomSheetModal>
    );

    expect(document.body.style.overflow).toBe('hidden');
    rendered.unmount();
    expect(document.body.style.overflow).toBe(previousOverflow);
    expect(document.activeElement).toBe(focusTarget);
    focusTarget.remove();
  });

  it('PageDrawer.web locks scroll while visible', () => {
    const previousOverflow = document.body.style.overflow;
    const rendered = render(
      withTheme(
        <PageDrawer visible title="Drawer" onClose={vi.fn()}>
          <span>Drawer content</span>
        </PageDrawer>
      )
    );

    expect(document.body.style.overflow).toBe('hidden');
    rendered.unmount();
    expect(document.body.style.overflow).toBe(previousOverflow);
  });

  it('Slider.web renders browser range input with accessibility values', () => {
    const { getByTestId } = render(withTheme(<Slider value={30} min={0} max={100} />));
    const range = getByTestId('slider-range-input');

    expect(range).toBeTruthy();
  });

  it('LogOverlay.web renders toggle and can show logs', () => {
    const { getByTestId, getByText } = render(
      withTheme(
        <LogOverlay
          defaultExpanded
          onClear={vi.fn()}
          entries={[
            {
              id: '1',
              level: 'info',
              message: 'hello web',
              timestamp: Date.now(),
              namespace: 'web',
            },
          ]}
        />
      )
    );

    expect(getByTestId('logger-overlay-toggle')).toBeTruthy();
    expect(flattenStyle(getByTestId('logger-overlay-toggle').props.style).borderRadius).toBe(9999);
    expect(flattenStyle(getByTestId('logger-overlay-export').props.style)).toMatchObject({
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 12,
      paddingRight: 12,
      borderRadius: 9999,
    });
    expect(flattenStyle(getByTestId('logger-namespace-web').props.style)).toMatchObject({
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 12,
      paddingRight: 12,
      borderRadius: 9999,
    });
    expect(getByText('hello web')).toBeTruthy();
  });

  it('LogOverlay.web restores persisted button position', () => {
    const { getByTestId } = render(
      withTheme(<LogOverlay entries={[]} onClear={vi.fn()} buttonPosition={{ x: -120, y: -80 }} />)
    );

    expect(
      flattenStyle(getByTestId('logger-overlay-toggle-wrapper').props.style).transform
    ).toEqual([{ translateX: -120 }, { translateY: -80 }]);
  });

  it('LogOverlay.web supports pointer drag, snap and persist', () => {
    const onButtonPositionChange = vi.fn();

    const { getByTestId } = render(
      withTheme(
        <LogOverlay
          entries={[]}
          onClear={vi.fn()}
          onButtonPositionChange={onButtonPositionChange}
        />
      )
    );

    const wrapper = getByTestId('logger-overlay-toggle-wrapper');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();

    act(() => {
      wrapper.props.onPointerDown({
        currentTarget: { setPointerCapture },
        nativeEvent: { clientX: 300, clientY: 700, pointerId: 1 },
      });
      wrapper.props.onPointerMove({
        nativeEvent: {
          clientX: 80,
          clientY: 600,
          pointerId: 1,
          preventDefault: vi.fn(),
        },
      });
      wrapper.props.onPointerUp({
        currentTarget: { releasePointerCapture },
        nativeEvent: { clientX: 80, clientY: 600, pointerId: 1 },
      });
    });

    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
    expect(onButtonPositionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      })
    );
  });

  it('LogOverlay.web does not toggle panel after drag', () => {
    const { getByTestId, queryByTestId } = render(
      withTheme(<LogOverlay entries={[]} onClear={vi.fn()} />)
    );

    const wrapper = getByTestId('logger-overlay-toggle-wrapper');
    const toggle = getByTestId('logger-overlay-toggle');

    act(() => {
      wrapper.props.onPointerDown({
        nativeEvent: { clientX: 300, clientY: 700, pointerId: 1 },
      });
      wrapper.props.onPointerMove({
        nativeEvent: { clientX: 100, clientY: 650, pointerId: 1 },
      });
      wrapper.props.onPointerUp({
        nativeEvent: { clientX: 100, clientY: 650, pointerId: 1 },
      });
    });
    fireEvent.press(toggle);

    expect(queryByTestId('logger-overlay-panel')).toBeNull();
  });
});
