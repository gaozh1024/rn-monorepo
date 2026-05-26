export const appObservatoryLifecycleEventTypes = [
  'app_start',
  'app_ready',
  'app_background',
  'app_foreground',
] as const;

export const appObservatoryErrorEventTypes = [
  'js_error',
  'react_error',
  'unhandled_rejection',
  'previous_session_crash',
  'native_crash',
  'api_error',
] as const;

export const appObservatoryAnalyticsEventTypes = ['analytics_event', 'screen_view'] as const;

export const appObservatoryCustomEventTypes = ['custom'] as const;

export const appObservatoryEventTypes = [
  ...appObservatoryLifecycleEventTypes,
  ...appObservatoryErrorEventTypes,
  ...appObservatoryAnalyticsEventTypes,
  ...appObservatoryCustomEventTypes,
] as const;

export type AppObservatoryLifecycleEventType = (typeof appObservatoryLifecycleEventTypes)[number];
export type AppObservatoryErrorEventType = (typeof appObservatoryErrorEventTypes)[number];
export type AppObservatoryAnalyticsEventType = (typeof appObservatoryAnalyticsEventTypes)[number];
export type AppObservatoryCustomEventType = (typeof appObservatoryCustomEventTypes)[number];
