# @gaozh1024/rn-health 0.1.1 Release Notes

`0.1.1` focuses on making the first rn-health SDK release harder to misconfigure and more reliable for fatal error delivery.

## Changes

- Fixed documentation to use the App Health service ingest route: `POST /api/app-health/events`.
- Added `ingestToken` to automatically send `authorization: Bearer <token>` for the built-in fetch transport.
- Preserved explicit header override behavior: user-provided `headers.authorization` wins over `ingestToken`.
- Added `flushOnFatal` with default `true`, so fatal events try to upload immediately after being queued.
- Kept fatal events in the local queue when immediate flush fails, allowing a later retry.
- Expanded README production guidance for persistent storage, rn-kit ErrorBoundary integration, native crash adapters, source map limitations, and privacy constraints.

## Verification

- `pnpm --dir packages/rn-health typecheck`
- `pnpm --dir packages/rn-health test`
- `pnpm --dir packages/rn-health build`
- `pnpm ai:check`
- `npm_config_cache=/tmp/rn-health-npm-cache npm pack --dry-run`（在 `packages/rn-health` 目录）

## Notes

- Native process crashes still require a `nativeCrashAdapter`.
- Source map symbolication is not included in `0.1.x`.
- Production apps should inject persistent storage such as AsyncStorage; the default memory storage is only for tests and demos.
