# @gaozh1024/hot-updater AI Usage

## What It Is

OTA hot update helper package for business apps, built around manifest fetch, update orchestration, provider hooks, and release helpers.

## When To Use

- Use this package when the app needs an app-owned OTA update flow rather than a one-size-fits-all update page.
- Use it when the project wants to separate framework responsibilities like manifest resolution and download from business responsibilities like startup UX and prompts.
- Use the provider/context layer when the app needs update state inside React.

## When Not To Use

- Do not use this package if the team expects a complete hosted OTA platform with upload, CDN, and release governance included.
- Do not assume the framework should decide the app's startup navigation or prompt UX.
- Do not assume Android integration is finished just because the package is installed or the plugin ran; verify the generated MainApplication.kt.

## Recommended Entry

- Create a hotUpdater instance and context once, then call startup checks from the business launch flow.
- Keep wrapApp as a required resolver/native integration step, but prefer launch-page-driven update checks over a default full-screen update flow.
- Inject the app's own dialog components through provider prompt handlers when product UX matters.

## Install Prerequisites

- Install command: pnpm add @gaozh1024/hot-updater
- Peer dependencies: @gaozh1024/rn-kit, @hot-updater/react-native, react, react-native

## Required Project Setup

- Configure a manifestBaseURL and a manifest hosting strategy.
- For Android, verify the underlying plugin patched MainApplication.kt, or patch it manually when the app template is not matched.
- For iOS, verify AppDelegate.swift uses HotUpdater.bundleURL() on release builds when the underlying plugin expects it.

## Minimal Working Example

- hot-updater-provider: packages/hot-updater/src/provider.tsx
- hot-updater-runtime: packages/hot-updater/src/runtime.ts

## Canonical Patterns

- Prefer the stable public API `createOssHotUpdater` when it matches the use case.
- Prefer the stable public API `createHotUpdaterContext` when it matches the use case.
- Prefer the stable public API `HotUpdaterProvider` when it matches the use case.
- Prefer the stable public API `useHotUpdaterContext` when it matches the use case.
- Prefer the stable public API `startLaunchUpdateCheck` when it matches the use case.
- Prefer the stable public API `checkForUpdates` when it matches the use case.

## Anti-Patterns

- Treating this package as responsible for OSS upload, CDN refresh, analytics, or business-page routing.
- Blocking the entire app startup on optional update checks or slow manifest fetches.
- Skipping verification of required Android native entry changes and assuming downloaded bundles will apply correctly.

## Common Failure Cases

- Android downloads succeed but the updated bundle is not used on cold start because MainApplication.kt was not patched or the generated patch was not verified.
- Teams expect the library to provide business-specific update dialogs and startup routing out of the box.
- Manifest requests are cached too aggressively because the host project did not include cache-busting or release discipline.

## Compatibility Baseline

- This package is built on top of @hot-updater/react-native and related tooling.
- Current compatibility guidance targets React Native >=0.81 <0.84 and @hot-updater/react-native >=0.28 <0.31.
- The framework layer handles update orchestration, but business projects still own startup UX and product decisions.
- iOS native wiring may be mostly handled by the underlying plugin, but the resulting AppDelegate.swift should still be verified.
- A disabled manifest release (`release.disabled: true`) is treated as no update and can be used to pause a bad OTA.

## See Also

- README.md
- AI_USAGE.md
- docs/integration.md
- docs/manifest-spec.md
