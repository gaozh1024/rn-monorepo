import { describe, expect, it, vi } from 'vitest';
import { installGlobalErrorHandlers } from '..';
import type { AppHealthReporter } from '..';

function reporter(): AppHealthReporter {
  return {
    captureException: vi.fn(async () => undefined),
    captureMessage: vi.fn(async () => undefined),
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
      expect.objectContaining({ source: 'window.onerror', type: 'js_error' })
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
});
