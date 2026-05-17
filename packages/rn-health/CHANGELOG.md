# @gaozh1024/rn-health

## 0.1.1

### Patch Changes

- Align the documented App Health ingest endpoint with the self-hosted service path: `POST /api/app-health/events`.
- Add `ingestToken` so apps can configure bearer authentication without hand-writing transport headers.
- Add `flushOnFatal` with a default immediate flush for fatal events while preserving queued events when transport fails.
- Expand production setup guidance for persistent storage, rn-kit ErrorBoundary reporting, native crash adapters, and source map limitations.

## 0.1.0

### Minor Changes

- Add the first App health monitoring SDK for Expo / React Native apps.
- Provide `AppHealthProvider`, `useAppHealth`, `createAppHealthClient`, local queueing, sanitized event capture, fetch transport uploads, breadcrumbs, session tracking, global JS error handlers, Web unhandled rejection capture, and previous-session abnormal-exit detection.
- Keep native crash capture adapter-based so apps can later bridge Sentry, Firebase Crashlytics, or a self-hosted native crash module without coupling the core package to a vendor SDK.
