# @gaozh1024/rn-observatory 0.4.0 Release Notes

发布日期：2026-05-23

`0.4.0` is the naming-alignment release that promotes the SDK from `rn-health` to `rn-observatory` before public rollout.

## Breaking Changes

- Package name changed from `@gaozh1024/rn-health` to `@gaozh1024/rn-observatory`.
- Public API names changed from the `AppHealth*` family to the `AppObservatory*` family.
- Queue, storage, transport, sanitizer, and axios helper exports now use `Observatory` naming as well.

## What To Update

- Replace imports such as `@gaozh1024/rn-health` with `@gaozh1024/rn-observatory`.
- Replace `AppHealthProvider` with `AppObservatoryProvider`.
- Replace `useAppHealth` with `useAppObservatory`.
- Replace `createAppHealthClient` / `createAppHealthQueue` / `createAsyncStorageHealthStorage` with their `AppObservatory` equivalents.
- Replace `installAxiosHealthInterceptor` with `installAxiosObservatoryInterceptor`.

## Notes

- The current self-hosted ingest route remains `POST /api/app-observatory/events`.
- The SDK behavior stays the same; this release focuses on package and API naming consistency before external adoption.

## Verification

- `pnpm --dir packages/rn-observatory typecheck`
- `pnpm --dir packages/rn-observatory test`
- `pnpm --dir packages/rn-observatory build`
