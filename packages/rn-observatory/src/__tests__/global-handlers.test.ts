import { describe, expect, it, vi } from 'vitest';
import { installGlobalErrorHandlers } from '..';
import type { AppObservatoryReporter } from '..';

function reporter(): AppObservatoryReporter {
  return {
    trackEvent: vi.fn(async () => undefined),
    trackScreen: vi.fn(async () => undefined),
    captureException: vi.fn(async () => undefined),
    captureMessage: vi.fn(async () => undefined),
    markAppReady: vi.fn(async () => undefined),
    captureApiError: vi.fn(async () => undefined),
    captureRenderException: vi.fn(async () => undefined),
    captureUnhandledRejection: vi.fn(async () => undefined),
    addBreadcrumb: vi.fn(),
    setUser: vi.fn(),
    setTags: vi.fn(),
    flush: vi.fn(async () => undefined),
  };
}

describe('installGlobalErrorHandlers', () => {
  it('captures web error events', () => {
    const health = reporter();
    const dispose = installGlobalErrorHandlers(health);

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('web boom') }));

    expect(health.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ source: 'window.onerror', level: 'fatal' })
    );
    dispose();
  });

  it('captures React Native ErrorUtils fatal errors', () => {
    const health = reporter();
    let handler: ((error: unknown, isFatal?: boolean) => void) | undefined;
    const previousErrorUtils = (globalThis as { ErrorUtils?: unknown }).ErrorUtils;
    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = {
      getGlobalHandler: () => undefined,
      setGlobalHandler: (nextHandler: typeof handler) => {
        handler = nextHandler;
      },
    };

    const dispose = installGlobalErrorHandlers(health);
    handler?.(new Error('native js boom'), true);

    expect(health.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ source: 'global_error_utils', level: 'fatal' })
    );

    dispose();
    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = previousErrorUtils;
  });

  it('captures React Native unhandled rejection callback fallback', () => {
    const health = reporter();
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousHandler = (globalThis as { onunhandledrejection?: unknown }).onunhandledrejection;
    const previousAddEventListener = (globalThis as { addEventListener?: unknown })
      .addEventListener;
    const previousRemoveEventListener = (globalThis as { removeEventListener?: unknown })
      .removeEventListener;

    (globalThis as { window?: unknown }).window = undefined;
    (globalThis as { onunhandledrejection?: unknown }).onunhandledrejection = undefined;
    (globalThis as { addEventListener?: unknown }).addEventListener = undefined;
    (globalThis as { removeEventListener?: unknown }).removeEventListener = undefined;

    const dispose = installGlobalErrorHandlers(health, { captureGlobalErrors: false });
    const reason = new Error('promise boom');
    (globalThis as { onunhandledrejection?: (event: unknown) => unknown }).onunhandledrejection?.({
      reason,
    });

    expect(health.captureUnhandledRejection).toHaveBeenCalledWith(
      reason,
      expect.objectContaining({
        source: 'global.onunhandledrejection',
      })
    );

    dispose();
    (globalThis as { window?: unknown }).window = previousWindow;
    (globalThis as { onunhandledrejection?: unknown }).onunhandledrejection = previousHandler;
    (globalThis as { addEventListener?: unknown }).addEventListener = previousAddEventListener;
    (globalThis as { removeEventListener?: unknown }).removeEventListener =
      previousRemoveEventListener;
  });

  it('does not call window.addEventListener when a native runtime exposes a non-DOM window object', () => {
    const health = reporter();
    const previousWindow = (globalThis as { window?: unknown }).window;

    (globalThis as { window?: unknown }).window = {};

    expect(() => installGlobalErrorHandlers(health)).not.toThrow();

    (globalThis as { window?: unknown }).window = previousWindow;
  });
});
