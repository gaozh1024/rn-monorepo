# @gaozh1024/rn-observatory

## 0.5.2

### Patch Changes

- Stop auto-requiring `expo-constants` from the SDK runtime so non-Expo React Native apps can install `rn-observatory` without Metro failing on an optional Expo-only module.
- Keep `resolveExpoAppMetadata(constants)` available for Expo apps that want to pass Expo Constants explicitly.
- Clarify docs: automatic metadata comes from the bundled React Native native metadata module; Expo metadata must be provided by the app or replaced with explicit `appId`, `appVersion`, and `buildNumber` props.

## 0.5.1

### Patch Changes

- Ship automatic app metadata resolution through Expo metadata and the bundled React Native native metadata module, while keeping `appId`, `appVersion`, and `buildNumber` as compatibility overrides.
- Include the native metadata bridge, podspec, and React Native config in the published package files.
- Refresh integration docs so production setup examples no longer require hand-maintained provider metadata props.

## 0.5.0

### Minor Changes

- Promote the event taxonomy to a public, typed SDK contract with exported lifecycle, error, analytics, custom, and combined event type constants.
- Add maintainer taxonomy sync and verification scripts so SDK event types can stay aligned with the `app-observatory` admin and OpenAPI surfaces.
- Formalize release metadata, source map artifact upload, and release helper CLI documentation for the Release / Symbolication lane.
- Expand production integration docs to read app id, version, and build number from app metadata instead of hand-maintained constants.
- Add maintainer governance docs that define the official Analytics, Release / Symbolication, and Crash / Alerts product lanes.

## 0.4.0

### Minor Changes

- Rename the package from `@gaozh1024/rn-health` to `@gaozh1024/rn-observatory`.
- Rename the public API surface from `AppHealth*` to `AppObservatory*`, including provider, hook, client, queue, storage, transport, sanitizer, and axios helper exports.
- Update README, AI usage, manifests, release notes, and rn-kit integration examples to use the new observatory naming.

## 0.3.0

### Minor Changes

- Add consent-gated behavior analytics with `trackEvent` and `trackScreen`.
- Add anonymous install identity helpers through `identity.autoInstallId` and `getOrCreateInstallId`.
- Add analytics event payloads for `analytics_event` and `screen_view`.
- Add `deviceInfoProvider` plus `consent.device` so apps can explicitly control extended device model / brand collection.
- Keep existing crash capture APIs compatible while allowing `consent.crash` to disable diagnostics capture.

## 0.2.0

### Minor Changes

- Add `createAsyncStorageObservatoryStorage` so React Native apps can wire `@react-native-async-storage/async-storage` without hand-writing the storage adapter.
- Add upload timeout support through `transportTimeoutMs`; the built-in fetch transport now defaults to a 10s timeout and supports `0` to disable aborts.
- Expand unhandled rejection capture to React Native-style `globalThis.onunhandledrejection` runtimes when DOM event targets are unavailable.
- Add `createMonitoredFetch` for dependency-free API error capture around `fetch`, with safe default URL sanitization and opt-in 4xx capture.
- Add `installAxiosObservatoryInterceptor` using structural axios types so apps can monitor axios API failures without adding axios as an SDK dependency.

## 0.1.1

### Patch Changes

- Align the documented App Observatory ingest endpoint with the current self-hosted service path: `POST /api/app-observatory/events`.
- Add `ingestToken` so apps can configure bearer authentication without hand-writing transport headers.
- Add `flushOnFatal` with a default immediate flush for fatal events while preserving queued events when transport fails.
- Expand production setup guidance for persistent storage, rn-kit ErrorBoundary reporting, native crash adapters, and source map limitations.

## 0.1.0

### Minor Changes

- Add the first app observability SDK for Expo / React Native apps.
- Provide `AppObservatoryProvider`, `useAppObservatory`, `createAppObservatoryClient`, local queueing, sanitized event capture, fetch transport uploads, breadcrumbs, session tracking, global JS error handlers, Web unhandled rejection capture, and previous-session abnormal-exit detection.
- Keep native crash capture adapter-based so apps can later bridge Sentry, Firebase Crashlytics, or a self-hosted native crash module without coupling the core package to a vendor SDK.
