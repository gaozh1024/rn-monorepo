export const appHealthEventTypes = [
  'app_start',
  'app_ready',
  'app_background',
  'app_foreground',
  'js_error',
  'react_error',
  'unhandled_rejection',
  'previous_session_crash',
  'native_crash',
  'api_error',
  'custom',
] as const;

export type AppHealthEventType = (typeof appHealthEventTypes)[number];
