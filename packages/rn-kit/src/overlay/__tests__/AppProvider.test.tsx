/**
 * AppProvider 集成测试
 * @module overlay/__tests__/AppProvider
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react-native';
import { AppProvider } from '../AppProvider';
import { useLoading } from '../loading/hooks';
import { useToast } from '../toast/hooks';
import { useAlert } from '../alert/hooks';
import { useLogger } from '../logger/hooks';
import { useReducedMotion } from '@/ui/motion';

// 测试组件：使用 Overlay 功能
function TestOverlayComponent() {
  const loading = useLoading();
  const toast = useToast();
  const alert = useAlert();
  const logger = useLogger();

  return (
    <div testID="test-component">
      {typeof loading.show === 'function' && <span testID="loading-ok" />}
      {typeof toast.success === 'function' && <span testID="toast-ok" />}
      {typeof alert.alert === 'function' && <span testID="alert-ok" />}
      {typeof logger.info === 'function' && <span testID="logger-ok" />}
    </div>
  );
}

function CrashComponent() {
  throw new Error('app provider crash');
}

function MotionStateProbe() {
  const motion = useReducedMotion();

  return (
    <div testID="motion-state">{`${String(motion.reduceMotion)}|${String(motion.durationScale)}`}</div>
  );
}

describe('AppProvider', () => {
  it('应该正确渲染子组件', () => {
    const { getByTestId } = render(
      <AppProvider>
        <div testID="child">子组件</div>
      </AppProvider>
    );
    expect(getByTestId('child')).toBeTruthy();
  });

  it('应该提供所有上下文', () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestOverlayComponent />
      </AppProvider>
    );

    expect(getByTestId('loading-ok')).toBeTruthy();
    expect(getByTestId('toast-ok')).toBeTruthy();
    expect(getByTestId('alert-ok')).toBeTruthy();
    expect(getByTestId('logger-ok')).toBeTruthy();
  });

  it('应该支持禁用导航', () => {
    const { getByTestId } = render(
      <AppProvider enableNavigation={false}>
        <div testID="child">无导航</div>
      </AppProvider>
    );
    expect(getByTestId('child')).toBeTruthy();
  });

  it('应该支持禁用 Overlay', () => {
    const { getByTestId } = render(
      <AppProvider enableOverlay={false}>
        <div testID="child">无 Overlay</div>
      </AppProvider>
    );
    expect(getByTestId('child')).toBeTruthy();
  });

  // 注意：禁用时 NavigationProvider 仍需要 ThemeProvider
  // 这是一个已知的实现限制，不在此处测试

  it('应该支持禁用安全区域', () => {
    const { getByTestId } = render(
      <AppProvider enableSafeArea={false}>
        <div testID="child">无安全区域</div>
      </AppProvider>
    );
    expect(getByTestId('child')).toBeTruthy();
  });

  it('应该默认注入全局状态栏', () => {
    const { getByTestId } = render(
      <AppProvider>
        <div testID="child">子组件</div>
      </AppProvider>
    );
    expect(getByTestId('status-bar')).toBeTruthy();
  });

  it('应该支持禁用全局状态栏', () => {
    const { queryByTestId } = render(
      <AppProvider enableStatusBar={false}>
        <div testID="child">子组件</div>
      </AppProvider>
    );
    expect(queryByTestId('status-bar')).toBeNull();
  });

  it('应该支持自定义主题', () => {
    const customLightTheme = {
      colors: {
        primary: '#1890ff',
        secondary: '#3b82f6',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    };

    const { getByTestId } = render(
      <AppProvider lightTheme={customLightTheme}>
        <div testID="child">自定义主题</div>
      </AppProvider>
    );
    expect(getByTestId('child')).toBeTruthy();
  });

  it('应该支持受控暗色模式', () => {
    const { getByTestId } = render(
      <AppProvider isDark>
        <div testID="child">受控暗色模式</div>
      </AppProvider>
    );
    expect(getByTestId('child')).toBeTruthy();
    expect(getByTestId('status-bar')).toBeTruthy();
  });

  it('应该支持通过 AppProvider 注入全局 motion 配置', () => {
    const { getByText } = render(
      <AppProvider motion={{ reduceMotion: true, durationScale: 0.5 }}>
        <MotionStateProbe />
      </AppProvider>
    );

    expect(getByText('true|0')).toBeTruthy();
  });

  it('启用错误边界后应该显示回退界面', () => {
    const healthReporter = { captureRenderException: vi.fn(), captureException: vi.fn() };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByTestId } = render(
      <AppProvider enableErrorBoundary enableLogger={false} healthReporter={healthReporter}>
        <CrashComponent />
      </AppProvider>
    );

    expect(getByTestId('app-error-boundary')).toBeTruthy();
    expect(healthReporter.captureRenderException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ source: 'react_error_boundary' })
    );
    expect(healthReporter.captureException).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
