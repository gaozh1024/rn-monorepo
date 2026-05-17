# @gaozh1024/rn-health AI Usage

## What It Is
App health and error monitoring SDK for Expo or React Native apps with event capture, breadcrumbs, local queueing, sanitized transports, and rn-kit integration.

## When To Use
- Use this package when a mobile app needs production error monitoring without coupling UI framework code to a vendor SDK.
- Use AppHealthProvider to create a health reporter that can be passed into rn-kit AppProvider.healthReporter.
- Use captureGlobalErrors and captureUnhandledRejections defaults for lightweight JavaScript error monitoring.
- Use captureException and captureMessage for manual business error reporting.
- Use addBreadcrumb to attach navigation, logger, API, and user-action context to later error events.
- Use createFetchHealthTransport or endpoint configuration to send batches to an app-owned collector.

## When Not To Use
- Do not expect pure JavaScript monitoring to capture native process crashes directly; use a NativeCrashAdapter or vendor-native SDK for that layer.
- Do not upload sensitive request bodies, headers, or personally identifiable data without a sanitizer and product privacy review.
- Do not block user flows on health transport success; failed uploads should remain queued and retried later.

## Recommended Entry
- Prefer importing AppHealthProvider and useAppHealth from @gaozh1024/rn-health.
- Pass the provider client into rn-kit AppProvider.healthReporter when the app uses rn-kit.
- Inject a persistent storage adapter such as AsyncStorage in production so queued events and previous-session detection survive app restarts.

## Install Prerequisites
- Install command: pnpm add @gaozh1024/rn-health
- Peer dependencies: react, react-native

## Required Project Setup
- Install react and react-native peer dependencies through the app's existing Expo or React Native setup.
- Provide endpoint or transports for production uploads; without a transport, events are captured but not sent.
- Provide a persistent storage adapter in real apps if event retry and previous-session crash detection must survive process restarts.

## Minimal Working Example
- health-provider-rn-kit-bridge: packages/rn-health/README.md
- health-client-core: packages/rn-health/src/core/client.ts

## Canonical Patterns
- Prefer the stable public API `AppHealthProvider` when it matches the use case.
- Prefer the stable public API `useAppHealth` when it matches the use case.
- Prefer the stable public API `createAppHealthClient` when it matches the use case.
- Prefer the stable public API `createAppHealthQueue` when it matches the use case.
- Prefer the stable public API `createFetchHealthTransport` when it matches the use case.
- Prefer the stable public API `defaultAppHealthSanitizer` when it matches the use case.
- Prefer the stable public API `MemoryHealthStorage` when it matches the use case.
- Prefer the stable public API `installGlobalErrorHandlers` when it matches the use case.

## Anti-Patterns
- Calling fetch directly from scattered catch blocks instead of routing errors through captureException or a transport.
- Treating previous_session_crash as a precise native crash signal; it is an inferred abnormal-exit health signal.
- Disabling sanitization in production or uploading authorization headers and tokens inside breadcrumbs.

## Common Failure Cases
- No events arrive because endpoint/transports are omitted or enabled is false.
- Queued events disappear after restart because the default MemoryHealthStorage was used instead of persistent app storage.
- Native crashes are not visible because no NativeCrashAdapter or vendor-native crash reporter has been installed.
- Health reports are too noisy because breadcrumbs are added for high-frequency UI events without throttling.

## Compatibility Baseline
- Current compatibility guidance targets React Native >=0.79 <0.82.
- Expo apps can use this package without a config plugin for the JavaScript monitoring layer.
- Native crash capture is intentionally adapter-based and not bundled into the core package.

## See Also
- README.md
- AI_USAGE.md
