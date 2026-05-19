# @gaozh1024/rn-health 0.2.0 Release Notes

发布日期：2026-05-19

`0.2.0` focuses on reliable production capture: persistent storage ergonomics, bounded upload time, React Native unhandled rejection coverage, and API error monitoring helpers.

## Changes

- Added `createAsyncStorageHealthStorage(AsyncStorage)` to simplify production queue persistence.
- Added `transportTimeoutMs` for the built-in fetch transport; default timeout is `10_000ms`, and `0` disables timeout aborts.
- Added a React Native-style unhandled rejection fallback through `globalThis.onunhandledrejection` when DOM event targets are unavailable.
- Added `createMonitoredFetch` to capture fetch network errors and 5xx responses without changing response semantics.
- Added `installAxiosHealthInterceptor` using structural axios types; axios remains app-provided and is not a dependency of `rn-health`.
- API helpers sanitize URLs by default and avoid uploading request bodies, response bodies, or headers.

## Verification

- `pnpm --dir packages/rn-health typecheck`
- `pnpm --dir packages/rn-health test`
- `pnpm --dir packages/rn-health build`
- `pnpm ai:check`
- `npm_config_cache=/tmp/rn-health-npm-cache npm pack --dry-run`（在 `packages/rn-health` 目录）

## App Health Service Compatibility

- Built-in fetch transport targets `POST /api/app-health/events` when `endpoint` is configured with the self-hosted App Health service URL.
- Use `ingestToken` for bearer authentication; application-level tokens are created from the App Health admin console and are shown only once.
- The admin/service stack is validated separately with `pnpm verify:app-health`.

## Notes

- Native process crashes still require a `nativeCrashAdapter`.
- Source map symbolication is still a follow-up capability.
- 4xx API capture is opt-in through `capture4xx` to avoid noisy user-input and validation errors.
