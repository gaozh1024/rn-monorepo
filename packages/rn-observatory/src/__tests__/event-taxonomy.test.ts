import { describe, expect, it } from 'vitest';
import {
  appObservatoryAnalyticsEventTypes,
  appObservatoryCustomEventTypes,
  appObservatoryErrorEventTypes,
  appObservatoryEventTypes,
  appObservatoryLifecycleEventTypes,
} from '..';

describe('event taxonomy exports', () => {
  it('includes analytics event types in the public taxonomy', () => {
    expect(appObservatoryAnalyticsEventTypes).toEqual(['analytics_event', 'screen_view']);
    expect(appObservatoryEventTypes).toEqual(
      expect.arrayContaining(['analytics_event', 'screen_view'])
    );
  });

  it('keeps lifecycle and error categories available as public subsets', () => {
    expect(appObservatoryLifecycleEventTypes).toEqual(
      expect.arrayContaining(['app_start', 'app_ready', 'app_background', 'app_foreground'])
    );
    expect(appObservatoryErrorEventTypes).toEqual(
      expect.arrayContaining([
        'js_error',
        'react_error',
        'unhandled_rejection',
        'previous_session_crash',
        'native_crash',
        'api_error',
      ])
    );
    expect(appObservatoryCustomEventTypes).toEqual(['custom']);
    expect(appObservatoryEventTypes).toEqual(expect.arrayContaining(['custom']));
  });
});
