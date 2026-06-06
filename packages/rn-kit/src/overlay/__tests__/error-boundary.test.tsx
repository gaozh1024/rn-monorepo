import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react-native';
import type { LogEntry } from '@/core/logger';
import { AppErrorBoundary } from '../error-boundary/component';
import { LoggerProvider } from '../logger/provider';

function CrashComponent() {
  throw new Error('render boom');
}

function RecoverableCrashHarness() {
  const [recovered, setRecovered] = React.useState(false);

  return (
    <AppErrorBoundary enabled onReset={() => setRecovered(true)}>
      {recovered ? (
        <div className="probe" testID="recovered">
          recovered
        </div>
      ) : (
        <CrashComponent />
      )}
    </AppErrorBoundary>
  );
}

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.filter(Boolean).reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  }
  return style;
}

describe('AppErrorBoundary', () => {
  it('应该捕获渲染错误并写入 logger', () => {
    const entries: LogEntry[] = [];
    const healthReporter = { captureRenderException: vi.fn(), captureException: vi.fn() };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByTestId, getByText } = render(
      <LoggerProvider
        enabled
        overlayEnabled={false}
        consoleEnabled={false}
        transports={[entry => entries.push(entry)]}
      >
        <AppErrorBoundary enabled showDetails healthReporter={healthReporter}>
          <CrashComponent />
        </AppErrorBoundary>
      </LoggerProvider>
    );

    expect(getByText('页面发生异常')).toBeTruthy();
    expect(getByText('render boom')).toBeTruthy();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.level).toBe('error');
    expect(entries[0]?.namespace).toBe('react');
    expect(entries[0]?.message).toBe('React ErrorBoundary 捕获渲染异常');
    expect(healthReporter.captureRenderException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'react_error_boundary',
      })
    );
    expect(healthReporter.captureException).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('在没有 captureRenderException 时回退到 captureException', () => {
    const healthReporter = { captureException: vi.fn() };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LoggerProvider enabled overlayEnabled={false} consoleEnabled={false}>
        <AppErrorBoundary enabled showDetails healthReporter={healthReporter}>
          <CrashComponent />
        </AppErrorBoundary>
      </LoggerProvider>
    );

    expect(healthReporter.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'react_error_boundary',
      })
    );

    consoleError.mockRestore();
  });

  it('应该支持点击重试恢复渲染', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByTestId, getByText } = render(
      <LoggerProvider enabled overlayEnabled={false} consoleEnabled={false}>
        <RecoverableCrashHarness />
      </LoggerProvider>
    );

    expect(getByText('页面发生异常')).toBeTruthy();
    expect(flattenStyle(getByTestId('app-error-boundary-reset').props.style)).toMatchObject({
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
      borderRadius: 12,
    });
    fireEvent.press(getByTestId('app-error-boundary-reset'));

    expect(getByTestId('recovered')).toBeTruthy();

    consoleError.mockRestore();
  });
});
