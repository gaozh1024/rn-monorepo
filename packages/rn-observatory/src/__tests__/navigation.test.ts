import { describe, expect, it, vi } from 'vitest';
import { createNavigationObservatoryTracker } from '../integrations/navigation';
import type { AppObservatoryReporter } from '..';

function createReporter(): AppObservatoryReporter {
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

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(nextResolve => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('createNavigationObservatoryTracker', () => {
  it('tracks the initial screen on ready', async () => {
    const observatory = createReporter();
    const tracker = createNavigationObservatoryTracker(observatory);

    tracker.onReady(() => ({ name: 'Home' }));
    await Promise.resolve();

    expect(observatory.trackScreen).toHaveBeenCalledWith(
      'Home',
      expect.objectContaining({
        screen: 'Home',
        routeName: 'Home',
      })
    );
  });

  it('tracks the next screen on state change', async () => {
    const observatory = createReporter();
    const tracker = createNavigationObservatoryTracker(observatory);

    tracker.onReady(() => ({ name: 'Home' }));
    await Promise.resolve();

    tracker.onStateChange(() => ({ name: 'Settings' }));
    await Promise.resolve();

    expect(observatory.trackScreen).toHaveBeenLastCalledWith(
      'Settings',
      expect.objectContaining({
        screen: 'Settings',
        routeName: 'Settings',
        fromScreen: 'Home',
      })
    );
  });

  it('does not re-track the same screen name', async () => {
    const observatory = createReporter();
    const tracker = createNavigationObservatoryTracker(observatory);

    tracker.onReady(() => ({ name: 'Home' }));
    await Promise.resolve();

    tracker.onStateChange(() => ({ name: 'Home' }));
    await Promise.resolve();

    expect(observatory.trackScreen).toHaveBeenCalledTimes(1);
  });

  it('supports custom route mapping', async () => {
    const observatory = createReporter();
    const tracker = createNavigationObservatoryTracker(observatory, {
      mapRouteName: route => `screen:${route.name}`,
    });

    tracker.onReady(() => ({ name: 'Checkout' }));
    await Promise.resolve();

    expect(observatory.trackScreen).toHaveBeenCalledWith(
      'screen:Checkout',
      expect.objectContaining({
        routeName: 'Checkout',
      })
    );
  });

  it('supports custom properties', async () => {
    const observatory = createReporter();
    const tracker = createNavigationObservatoryTracker(observatory, {
      buildProperties: ({ current, previous }) => ({
        currentRoute: current.name,
        previousRoute: previous?.name,
      }),
    });

    tracker.onReady(() => ({ name: 'Home' }));
    await Promise.resolve();
    tracker.onStateChange(() => ({ name: 'Profile' }));
    await Promise.resolve();

    expect(observatory.trackScreen).toHaveBeenLastCalledWith(
      'Profile',
      expect.objectContaining({
        currentRoute: 'Profile',
        previousRoute: 'Home',
      })
    );
  });

  it('does nothing when disabled', async () => {
    const observatory = createReporter();
    const tracker = createNavigationObservatoryTracker(observatory, {
      enabled: false,
    });

    tracker.onReady(() => ({ name: 'Home' }));
    tracker.onStateChange(() => ({ name: 'Settings' }));
    await Promise.resolve();

    expect(observatory.trackScreen).not.toHaveBeenCalled();
  });

  it('supports disabling initial screen tracking', async () => {
    const observatory = createReporter();
    const tracker = createNavigationObservatoryTracker(observatory, {
      initialScreenTracking: false,
    });

    tracker.onReady(() => ({ name: 'Home' }));
    await Promise.resolve();

    tracker.onStateChange(() => ({ name: 'Settings' }));
    await Promise.resolve();

    expect(observatory.trackScreen).toHaveBeenCalledTimes(1);
    expect(observatory.trackScreen).toHaveBeenCalledWith(
      'Settings',
      expect.objectContaining({
        screen: 'Settings',
      })
    );
  });

  it('does not double-track when ready and state change race on the same screen', async () => {
    const deferred = createDeferred();
    const observatory = createReporter();
    vi.mocked(observatory.trackScreen).mockImplementation(async () => {
      await deferred.promise;
    });
    const tracker = createNavigationObservatoryTracker(observatory);

    tracker.onReady(() => ({ name: 'Home' }));
    tracker.onStateChange(() => ({ name: 'Home' }));
    await Promise.resolve();

    expect(observatory.trackScreen).toHaveBeenCalledTimes(1);

    deferred.resolve();
    await Promise.resolve();
  });
});
