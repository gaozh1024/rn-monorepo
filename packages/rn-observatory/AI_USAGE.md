# @gaozh1024/rn-observatory AI Usage

## What It Is

Observability and product analytics SDK for Expo or React Native apps with error capture, breadcrumbs, local queueing, consent-aware analytics, and rn-kit integration.

## When To Use

- Use this package when a mobile app needs production error monitoring without coupling UI framework code to a vendor SDK.
- Use AppObservatoryProvider to create an observability reporter that can be passed into rn-kit AppProvider.healthReporter.
- Use captureGlobalErrors and captureUnhandledRejections defaults for lightweight JavaScript error monitoring.
- Use createMonitoredFetch or installAxiosObservatoryInterceptor when API failures should be reported as observability events.
- Use createAsyncStorageObservatoryStorage with app-provided AsyncStorage for production queue persistence.
- Use captureException and captureMessage for manual business error reporting.
- Use addBreadcrumb to attach navigation, logger, API, and user-action context to later error events.
- Use createFetchObservatoryTransport or endpoint configuration to send batches to an app-owned collector.
- Use it in Expo Web / React Native Web when the app still runs through react-native / react-native-web.

## When Not To Use

- Do not expect pure JavaScript monitoring to capture native process crashes directly; use a NativeCrashAdapter or vendor-native SDK for that layer.
- Do not upload sensitive request bodies, headers, or personally identifiable data without a sanitizer and product privacy review.
- Do not block user flows on observability transport success; failed uploads should remain queued and retried later.
- Do not treat this package as a generic browser SDK for plain React / Vite / Next.js projects that do not use react-native-web.

## Recommended Entry

- Prefer importing AppObservatoryProvider and useAppObservatory from @gaozh1024/rn-observatory.
- Pass the provider client into rn-kit AppProvider.healthReporter when the app uses rn-kit.
- In Expo apps, read Expo Constants in app code and pass appId, appVersion, and buildNumber explicitly; rn-observatory does not require expo-constants at runtime.
- Inject createAsyncStorageObservatoryStorage(AsyncStorage) in production so queued events and previous-session detection survive app restarts.
- Use createMonitoredFetch or installAxiosObservatoryInterceptor at API-client boundaries rather than in scattered catch blocks.

## Install Prerequisites

- Install command: pnpm add @gaozh1024/rn-observatory
- Peer dependencies: react, react-native

## Required Project Setup

- Install react and react-native peer dependencies through the app's existing Expo or React Native setup.
- Provide endpoint or transports for production uploads; without a transport, events are captured but not sent.
- Provide a persistent storage adapter in real apps if event retry and previous-session crash detection must survive process restarts.
- Configure transportTimeoutMs when the default 10s upload timeout is too short or too long for the app's network profile.

## Minimal Working Example

- observatory-provider-rn-kit-bridge: packages/rn-observatory/README.md
- observatory-client-core: packages/rn-observatory/src/core/client.ts

## Canonical Patterns

- Prefer the stable public API `AppObservatoryProvider` when it matches the use case.
- Prefer the stable public API `useAppObservatory` when it matches the use case.
- Prefer the stable public API `createAppObservatoryClient` when it matches the use case.
- Prefer the stable public API `appObservatoryEventTypes` when it matches the use case.
- Prefer the stable public API `appObservatoryLifecycleEventTypes` when it matches the use case.
- Prefer the stable public API `appObservatoryErrorEventTypes` when it matches the use case.
- Prefer the stable public API `appObservatoryAnalyticsEventTypes` when it matches the use case.
- Prefer the stable public API `appObservatoryCustomEventTypes` when it matches the use case.
- Prefer the stable public API `resolveExpoAppMetadata` when it matches the use case.
- Prefer the stable public API `createAppObservatoryQueue` when it matches the use case.
- Prefer the stable public API `createFetchObservatoryTransport` when it matches the use case.
- Prefer the stable public API `createAsyncStorageObservatoryStorage` when it matches the use case.
- Prefer the stable public API `createMonitoredFetch` when it matches the use case.
- Prefer the stable public API `installAxiosObservatoryInterceptor` when it matches the use case.
- Prefer the stable public API `defaultAppObservatorySanitizer` when it matches the use case.
- Prefer the stable public API `MemoryObservatoryStorage` when it matches the use case.
- Prefer the stable public API `installGlobalErrorHandlers` when it matches the use case.

## Anti-Patterns

- Calling fetch directly from scattered catch blocks instead of routing API-client boundaries through createMonitoredFetch or installAxiosObservatoryInterceptor.
- Treating previous_session_crash as a precise native crash signal; it is an inferred abnormal-exit health signal.
- Disabling sanitization in production or uploading authorization headers, bodies, and tokens inside breadcrumbs or API metadata.

## Common Failure Cases

- No events arrive because endpoint/transports are omitted or enabled is false.
- Queued events disappear after restart because the default MemoryObservatoryStorage was used instead of persistent app storage.
- API 4xx responses are not reported because capture4xx is intentionally opt-in.
- Native crashes are not visible because no NativeCrashAdapter or vendor-native crash reporter has been installed.
- Expo app metadata is missing because the app did not pass appId, appVersion, and buildNumber from its own Expo Constants setup.
- Observability reports are too noisy because breadcrumbs are added for high-frequency UI events without throttling.

## Compatibility Baseline

- Current compatibility guidance targets React Native >=0.81 <0.84.
- Expo Web / React Native Web are supported when the app still runs through the React Native runtime model.
- Expo apps can use this package without a config plugin for the JavaScript monitoring layer.
- Native crash capture is intentionally adapter-based and not bundled into the core package.

## See Also

- README.md
- AI_USAGE.md
- MOBILE_INTEGRATION.md
- docs/app-usage-guide.md
- docs/event-taxonomy.md
- docs/analytics-schema.md
- docs/analytics-tracking-template.md
- docs/device-info-recipes.md
- docs/native-crash-adapters.md
- docs/native-crash-bridge-template.md
- docs/release-integration.md
- docs/expo-eas-release-template.md
- docs/react-native-cli-release-template.md
- docs/maintainer-governance.md
