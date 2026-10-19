# Changelog

## 0.3.0

### Minor Changes

- 放宽 peer 依赖以支持 Expo 57 / React Native 0.86（吾滴 SDK 55→57 升级前置，与 rn-kit 0.7.0 同一轮兼容性扩展）：
  - aliyun-push：`expo` 放宽至 `>=54 <58`，`react-native` 放宽至 `>=0.81 <0.87`，依赖 `@expo/config-plugins` 放宽至 `>=54 <58`
  - hot-updater：`react-native` 放宽至 `>=0.81 <0.87`
  - photo-picker：`expo-modules-core` 放宽至 `>=55 <58`，`expo-image` / `expo-image-manipulator` 放宽至 `<58`，`react-native` 放宽至 `>=0.81 <0.87`

  仅 peer/依赖范围扩展，无运行时代码变更；SDK 57 真机验证随吾滴侧 M2/M3 里程碑进行。

## 0.2.0

- Add Expo SDK 55 compatibility while preserving React Native 0.81 / Expo SDK 54 project support.
- Move the package development baseline to React 19.2 and React Native 0.83.
- Update `@hot-updater/expo` and peer compatibility to the current SDK 55-compatible line.

## 0.1.1

- Honor `release.disabled` in OTA manifests so paused releases are treated as no update.
- Default missing `release.force` values to non-force updates.
- Allow launch update checks to retry after returned or thrown startup check failures.
- Add Vitest regression coverage for manifest decisions and launch retry behavior.
- Align release script documentation, AI metadata, and native integration guidance with the current runtime behavior.

## 0.1.0

- Initial release for migrating the internal hot updater package into the framework monorepo.
- Includes OTA manifest helpers, runtime/provider wrappers, default fallback UI, and local release scripts.
