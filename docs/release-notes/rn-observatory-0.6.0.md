# @gaozh1024/rn-observatory 0.6.0 Release Notes

## Summary

`0.6.0` is the event-type hardening release for `rn-observatory`.

This release turns the maintained taxonomy into a stricter runtime contract:

- public reporter APIs now fix their top-level event class
- system/framework event classes move to explicit APIs or internal emitters
- backend ingest now enforces the same canonical event allowlist that the SDK, Console, and OpenAPI expose

## What Changed

### 1. Public reporter contract is fixed by API semantics

The public reporter APIs now emit fixed event classes:

- `trackEvent()` -> `analytics_event`
- `trackScreen()` -> `screen_view`
- `captureException()` -> `js_error`
- `captureMessage()` -> `custom`

Apps should no longer set `type` manually through public capture contexts.

### 2. Explicit framework/system event APIs

Added explicit APIs for framework-owned semantics:

- `markAppReady()`
- `captureApiError()`
- `captureRenderException()`
- `captureUnhandledRejection()`

This keeps `app_ready`, `api_error`, `react_error`, and `unhandled_rejection` on explicit code paths instead of covert `type` overrides.

### 3. Internal lifecycle and crash paths hardened

The SDK now routes:

- `app_start`
- `app_background`
- `app_foreground`
- `previous_session_crash`
- `native_crash`

through internal emitters instead of public reporter override behavior.

### 4. rn-kit compatibility preserved

`rn-kit` ErrorBoundary now prefers `captureRenderException()` and falls back to `captureException()` for older health reporters, so render-error semantics stay aligned with `react_error`.

### 5. Runtime taxonomy enforcement

The backend ingest service now validates and persists only canonical event types. `verify:taxonomy` also checks the Go runtime allowlist in addition to Console constants and OpenAPI.

## Upgrade Notes

This release should be treated as an enforcement release for event-type behavior.

Recommended follow-up:

1. Remove any app-side code that manually sets `type` on observability calls.
2. Use `markAppReady()` instead of `captureMessage(..., { type: 'app_ready' })`.
3. Keep using `trackEvent()`, `trackScreen()`, and `captureException()` for business analytics and business error reporting.
4. If you maintain custom integrations, route system semantics through the new explicit APIs instead of custom `type` override behavior.

### Expo starter baseline

Recommended template baseline after this release:

- `@gaozh1024/rn-observatory ^0.6.0`

## Verification

Validated with:

```bash
pnpm --dir packages/rn-observatory typecheck
pnpm --dir packages/rn-observatory test
pnpm --dir packages/rn-observatory build
pnpm --dir packages/rn-observatory verify:taxonomy
pnpm --dir packages/rn-kit typecheck
pnpm --dir packages/rn-kit test
pnpm --dir packages/rn-kit build
pnpm --dir templates/expo-starter lint
go test ./... # in app-observatory/service
pnpm --dir /Users/gzh/Projects/framework/app-observatory/site typecheck
pnpm --dir /Users/gzh/Projects/framework/app-observatory/site build
```
