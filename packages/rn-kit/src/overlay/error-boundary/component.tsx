import React from 'react';
import type { ErrorInfo } from 'react';
import { LoggerContext } from '../logger/context';
import { isDevelopment } from '@/utils';
import { AppPressable, AppText, AppView } from '@/ui';
import type { AppErrorBoundaryProps } from './types';

interface AppErrorBoundaryState {
  error: Error | null;
}

function areResetKeysChanged(prev: unknown[] = [], next: unknown[] = []) {
  if (prev.length !== next.length) return true;
  return prev.some((item, index) => !Object.is(item, next[index]));
}

function DefaultFallback({
  error,
  onReset,
  title = '页面发生异常',
  description = '已自动捕获渲染错误，你可以重试并结合开发日志继续排查。',
  resetText = '重试',
  showDetails = isDevelopment(),
}: {
  error: Error;
  onReset: () => void;
  title?: string;
  description?: string;
  resetText?: string;
  showDetails?: boolean;
}) {
  return (
    <AppView testID="app-error-boundary" flex center className="px-6 py-8" gap={4}>
      <AppView className="items-center" gap={2}>
        <AppText size="xl" weight="semibold">
          {title}
        </AppText>
        <AppText tone="muted" style={{ textAlign: 'center' }}>
          {description}
        </AppText>
      </AppView>

      {showDetails ? (
        <AppView
          className="w-full px-4 py-3 rounded-xl"
          style={{ maxWidth: 560, borderWidth: 0.5 }}
        >
          <AppText testID="app-error-boundary-detail" size="sm">
            {error.message || String(error)}
          </AppText>
        </AppView>
      ) : null}

      <AppPressable
        testID="app-error-boundary-reset"
        onPress={onReset}
        px={16}
        py={12}
        rounded="lg"
        style={{ borderWidth: 0.5 }}
      >
        <AppText weight="semibold">{resetText}</AppText>
      </AppPressable>
    </AppView>
  );
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  static contextType = LoggerContext;
  declare context: React.ContextType<typeof LoggerContext>;

  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorPayload = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    };

    this.context?.error('React ErrorBoundary 捕获渲染异常', errorPayload, 'react');

    const renderErrorContext = {
      source: 'react_error_boundary',
      componentStack: errorInfo.componentStack,
    };

    if (this.props.healthReporter?.captureRenderException) {
      void this.props.healthReporter.captureRenderException(error, renderErrorContext);
    } else {
      void this.props.healthReporter?.captureException?.(error, renderErrorContext);
    }

    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (!this.state.error) return;
    if (areResetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.handleReset();
    }
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const {
      children,
      enabled = false,
      fallback,
      title,
      description,
      showDetails,
      resetText,
    } = this.props;

    if (!enabled) return children;

    if (!this.state.error) return children;

    if (typeof fallback === 'function') {
      return fallback({ error: this.state.error, reset: this.handleReset });
    }

    if (fallback) return fallback;

    return (
      <DefaultFallback
        error={this.state.error}
        onReset={this.handleReset}
        title={title}
        description={description}
        showDetails={showDetails}
        resetText={resetText}
      />
    );
  }
}
