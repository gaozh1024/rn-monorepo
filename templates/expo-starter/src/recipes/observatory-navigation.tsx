import React from 'react';
import { AppProvider, type AppHealthReporter } from '@gaozh1024/rn-kit';
import {
  AppObservatoryProvider,
  type AppObservatoryBreadcrumb,
  createNavigationObservatoryTracker,
  type AppObservatoryReporter,
  type NavigationRouteLike,
} from '@gaozh1024/rn-observatory';
import { darkTheme, lightTheme } from '../bootstrap/theme';

export interface ObservatoryNavigationRecipeProps {
  children: React.ReactNode;
  getCurrentRoute: () => { name: string; params?: unknown } | undefined;
  isDark?: boolean;
}

function isObservatoryBreadcrumb(value: unknown): value is AppObservatoryBreadcrumb {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message?: unknown }).message === 'string'
  );
}

function createHealthReporterBridge(observatory: AppObservatoryReporter): AppHealthReporter {
  return {
    captureException: observatory.captureException,
    captureMessage: observatory.captureMessage,
    addBreadcrumb: breadcrumb => {
      if (isObservatoryBreadcrumb(breadcrumb)) {
        observatory.addBreadcrumb(breadcrumb);
      }
    },
  };
}

/**
 * Observatory + navigation recipe.
 * Use this when the app wants automatic screen tracking on top of rn-kit AppProvider.
 */
export function ObservatoryNavigationRecipe({
  children,
  getCurrentRoute,
  isDark = false,
}: ObservatoryNavigationRecipeProps) {
  return (
    <AppObservatoryProvider
      enabled={!__DEV__}
      endpoint="https://your-domain.com/api/app-observatory/events"
      ingestToken="your-ingest-token"
      consent={{
        crash: true,
        analytics: true,
        device: true,
      }}
      identity={{ autoInstallId: true }}
    >
      {(observatory: AppObservatoryReporter) => {
        const tracker = createNavigationObservatoryTracker(observatory, {
          mapRouteName: (route: NavigationRouteLike) => route.name,
        });
        const healthReporter = createHealthReporterBridge(observatory);

        return (
          <AppProvider
            lightTheme={lightTheme}
            darkTheme={darkTheme}
            isDark={isDark}
            onReady={() => tracker.onReady(getCurrentRoute)}
            onStateChange={() => tracker.onStateChange(getCurrentRoute)}
            healthReporter={healthReporter}
          >
            {children}
          </AppProvider>
        );
      }}
    </AppObservatoryProvider>
  );
}
