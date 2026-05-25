# Navigation Integration

Use `createNavigationObservatoryTracker(...)` when the app already uses React Navigation and wants automatic `screen_view` events.

## Recommended flow

1. Create the tracker with the current observability reporter
2. Call `onReady(...)` once after navigation is ready
3. Call `onStateChange(...)` whenever navigation state changes

```ts
import { createNavigationObservatoryTracker } from '@gaozh1024/rn-observatory';

const tracker = createNavigationObservatoryTracker(observatory, {
  mapRouteName: route => route.name,
});

tracker.onReady(() => getCurrentRoute());
tracker.onStateChange(() => getCurrentRoute());
```

## Default behavior

- the initial screen is tracked once
- route changes are tracked only when the mapped screen name changes
- `screen`, `routeName`, and `fromScreen` are attached automatically

## Custom mapping

```ts
const tracker = createNavigationObservatoryTracker(observatory, {
  mapRouteName: route => `screen:${route.name}`,
});
```

## Custom properties

```ts
const tracker = createNavigationObservatoryTracker(observatory, {
  buildProperties: ({ current, previous }) => ({
    currentRoute: current.name,
    previousRoute: previous?.name,
    module: 'main-navigation',
  }),
});
```

## Recommendation

If automatic navigation tracking is enabled, avoid also calling `trackScreen()` manually for the same transitions unless the app intentionally needs extra custom screen events.
