# @gaozh1024/aliyun-push AI Usage

## What It Is

Aliyun mobile push integration package with runtime service APIs, React provider, and Expo config plugin support.

## When To Use

- Use this package when the app needs Aliyun mobile push integration with a reusable React-facing runtime layer.
- Prefer the Expo config plugin path in Expo prebuild or dev build projects.
- Use the provider when the app wants automatic init, account binding, and unified callback dispatch.

## When Not To Use

- Do not assume this package fully configures a bare React Native project's native setup.
- Do not store production push secrets in committed source files.
- Do not use the Expo config plugin path for projects that are not using Expo plugin workflows.

## Recommended Entry

- In Expo projects, start with the config plugin and a local aliyunPush.config.js file.
- Use AliyunPushProvider for app-level integration when login state and notification routing are already managed in React.
- Use the lower-level service API only when the app intentionally does not want the provider abstraction.

## Install Prerequisites

- Install command: pnpm add @gaozh1024/aliyun-push
- Peer dependencies: aliyun-react-native-push, expo, react, react-native

## Required Project Setup

- Install aliyun-react-native-push alongside this package.
- If using Expo, configure the @gaozh1024/aliyun-push/plugin entry in app.json or app.config.ts.
- Run expo prebuild and install iOS pods after plugin setup when native projects are involved.
- Keep the Expo config plugin configured even before runtime push is enabled so native dependency repositories are injected.

## Minimal Working Example

- push-provider: packages/aliyun-push/src/provider.tsx
- push-service-api: packages/aliyun-push/src/service.ts

## Canonical Patterns

- Prefer the stable public API `normalizeAliyunPushConfig` when it matches the use case.
- Prefer the stable public API `AliyunPushProvider` when it matches the use case.
- Prefer the stable public API `useAliyunPush` when it matches the use case.
- Prefer the stable public API `initAliyunPush` when it matches the use case.
- Prefer the stable public API `bindAliyunPushAccount` when it matches the use case.
- Prefer the stable public API `registerAliyunPushCallbacks` when it matches the use case.
- Prefer the stable public API `setAliyunPushLogger` when it matches the use case.

## Anti-Patterns

- Committing push vendor secrets directly into repository-tracked config files.
- Expecting the package runtime to replace all native configuration work in non-Expo bare apps.
- Mixing provider-managed account binding with unrelated custom binding logic without a clear source of truth.

## Common Failure Cases

- Push initialization never completes because the native plugin/prebuild step was skipped.
- Android build cannot resolve com.aliyun.ams artifacts when native dependency repositories were not injected by the plugin/prebuild step.
- Aliyun native SDK duplicate-registration code PUSH_20110 should be treated as idempotent initialization success, not as a fatal init failure.
- Notification callbacks appear inconsistent because callback registration and provider usage were mixed carelessly.
- Expo plugin users forget to rerun prebuild or pod install after config changes.

## Compatibility Baseline

- The recommended path targets Expo prebuild or development build projects.
- The package separates three layers: runtime service, React provider, and Expo config plugin.
- Expo is optional only when the consuming app is willing to manage native setup manually.

## See Also

- README.md
- AI_USAGE.md
