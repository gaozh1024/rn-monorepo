# @gaozh1024/rn-observatory 0.2.0 Release Notes

发布日期：2026-05-19

`0.2.0` focuses on reliable production capture: persistent storage ergonomics, bounded upload time, React Native unhandled rejection coverage, and API error monitoring helpers.

## Changes

- Added `createAsyncStorageObservatoryStorage(AsyncStorage)` to simplify production queue persistence.
- Added `transportTimeoutMs` for the built-in fetch transport; default timeout is `10_000ms`, and `0` disables timeout aborts.
- Added a React Native-style unhandled rejection fallback through `globalThis.onunhandledrejection` when DOM event targets are unavailable.
- Added `createMonitoredFetch` to capture fetch network errors and 5xx responses without changing response semantics.
- Added `installAxiosObservatoryInterceptor` using structural axios types; axios remains app-provided and is not a dependency of `rn-observatory`.
- API helpers sanitize URLs by default and avoid uploading request bodies, response bodies, or headers.

## Verification

- `pnpm --dir packages/rn-observatory typecheck`
- `pnpm --dir packages/rn-observatory test`
- `pnpm --dir packages/rn-observatory build`
- `pnpm ai:check`
- `npm_config_cache=/tmp/rn-observatory-npm-cache npm pack --dry-run`（在 `packages/rn-observatory` 目录）

## App Observatory Service Compatibility

- Built-in fetch transport targets `POST /api/app-observatory/events` when `endpoint` is configured with the self-hosted App Observatory service URL.
- Use `ingestToken` for bearer authentication; application-level tokens are created from the App Observatory admin console and are shown only once.
- The admin/service stack now lives in the standalone `app-observatory` repository.

## Notes

- Native process crashes still require a `nativeCrashAdapter`.
- Source map symbolication is still a follow-up capability.
- 4xx API capture is opt-in through `capture4xx` to avoid noisy user-input and validation errors.
