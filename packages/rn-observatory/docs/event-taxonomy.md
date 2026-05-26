# Event Taxonomy

This is the maintained event taxonomy for `rn-observatory` when the app uploads data into `app-observatory`.

The purpose of this file is to keep the SDK, backend, admin console, and documentation aligned around one canonical event vocabulary.

The SDK also exports the taxonomy as public constants:

- `appObservatoryEventTypes`
- `appObservatoryLifecycleEventTypes`
- `appObservatoryErrorEventTypes`
- `appObservatoryAnalyticsEventTypes`

Maintainers can verify cross-repo alignment with:

```bash
pnpm --dir packages/rn-observatory verify:taxonomy
```

Maintainers can also synchronize the current canonical taxonomy into `app-observatory` surfaces with:

```bash
pnpm --dir packages/rn-observatory sync:taxonomy
```

Current sync targets:

- `app-observatory/admin/src/api/constants.ts`
- `app-observatory/contracts/openapi.yaml`

## Core event types

### Lifecycle

- `app_start`
- `app_ready`
- `app_background`
- `app_foreground`

### Errors and crashes

- `js_error`
- `react_error`
- `unhandled_rejection`
- `previous_session_crash`
- `native_crash`
- `api_error`

### Analytics

- `analytics_event`
- `screen_view`

### Escape hatch

- `custom`

## Semantics

### `app_start`

Emitted by the SDK during startup initialization.

### `app_ready`

Reserved for app-shell readiness when the app explicitly emits it.

The core SDK currently defines this event type but does not emit it automatically. Apps can use:

```ts
await observatory.captureMessage('App ready', {
  type: 'app_ready',
  level: 'info',
  source: 'app_shell',
});
```

Use it only when the app has a meaningful “ready” milestone beyond startup.

### `app_background` / `app_foreground`

Lifecycle analytics events emitted through app state monitoring.

### `js_error`

General JavaScript error capture from manual exceptions or global error handlers.

### `react_error`

Reserved for React render / boundary errors when the app shell or integration chooses to label them explicitly.

### `unhandled_rejection`

Unhandled promise rejection capture.

### `previous_session_crash`

An inferred abnormal-exit event, not a guaranteed native crash report.

### `native_crash`

Pending native crash report replayed through `nativeCrashAdapter`.

### `api_error`

Network / transport / monitored API failure.

### `analytics_event`

Business analytics event from `trackEvent()`.

### `screen_view`

Page or route analytics event from `trackScreen()` or navigation auto tracking.

### `custom`

Fallback event type for app-owned telemetry that does not fit the built-in taxonomy.

## Recommended usage rules

- Prefer `trackScreen()` for screen/page analytics
- Prefer `trackEvent()` for business actions
- Prefer `captureException()` for caught failures
- Prefer `captureMessage(... type: 'custom')` only for app-owned observability signals that do not fit an existing category
- Use `app_ready` only when the app intentionally defines and documents its own readiness milestone

## Related docs

- `docs/analytics-schema.md`
- `docs/app-usage-guide.md`
- `docs/release-integration.md`
- `docs/native-crash-adapters.md`
