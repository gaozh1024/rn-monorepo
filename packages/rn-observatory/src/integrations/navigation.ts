import type { AppObservatoryReporter } from '../core/types';

export interface NavigationRouteLike {
  name: string;
  params?: unknown;
  state?: unknown;
}

export interface NavigationObservatoryTrackerOptions {
  enabled?: boolean;
  initialScreenTracking?: boolean;
  mapRouteName?: (route: NavigationRouteLike) => string;
  buildProperties?: (args: {
    current: NavigationRouteLike;
    previous?: NavigationRouteLike;
  }) => Record<string, unknown> | undefined;
}

export interface NavigationObservatoryTracker {
  onReady: (getCurrentRoute: () => NavigationRouteLike | undefined) => void;
  onStateChange: (getCurrentRoute: () => NavigationRouteLike | undefined) => void;
  reset: () => void;
}

function defaultMapRouteName(route: NavigationRouteLike) {
  return route.name;
}

export function createNavigationObservatoryTracker(
  observatory: AppObservatoryReporter,
  options: NavigationObservatoryTrackerOptions = {}
): NavigationObservatoryTracker {
  const enabled = options.enabled ?? true;
  const initialScreenTracking = options.initialScreenTracking ?? true;
  const mapRouteName = options.mapRouteName ?? defaultMapRouteName;

  let lastTrackedScreen: string | undefined;
  let lastTrackedRoute: NavigationRouteLike | undefined;
  let hasTrackedInitial = false;

  async function track(route: NavigationRouteLike | undefined, force = false) {
    if (!enabled || !route) return;

    const screen = mapRouteName(route);
    if (!screen) return;

    if (!force && screen === lastTrackedScreen) {
      return;
    }

    const properties = options.buildProperties?.({
      current: route,
      previous: lastTrackedRoute,
    });
    const previousScreen = lastTrackedScreen;

    lastTrackedScreen = screen;
    lastTrackedRoute = route;

    await observatory.trackScreen(screen, {
      screen,
      routeName: route.name,
      fromScreen: previousScreen,
      ...properties,
    });
  }

  return {
    onReady(getCurrentRoute) {
      if (!initialScreenTracking || hasTrackedInitial) return;
      hasTrackedInitial = true;
      void track(getCurrentRoute(), true);
    },
    onStateChange(getCurrentRoute) {
      void track(getCurrentRoute());
    },
    reset() {
      lastTrackedScreen = undefined;
      lastTrackedRoute = undefined;
      hasTrackedInitial = false;
    },
  };
}
