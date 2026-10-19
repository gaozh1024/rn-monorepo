# Changelog

## 0.3.0

### Minor Changes

- 放宽 peer 依赖以支持 Expo 57 / React Native 0.86（吾滴 SDK 55→57 升级前置，与 rn-kit 0.7.0 同一轮兼容性扩展）：
  - aliyun-push：`expo` 放宽至 `>=54 <58`，`react-native` 放宽至 `>=0.81 <0.87`，依赖 `@expo/config-plugins` 放宽至 `>=54 <58`
  - hot-updater：`react-native` 放宽至 `>=0.81 <0.87`
  - photo-picker：`expo-modules-core` 放宽至 `>=55 <58`，`expo-image` / `expo-image-manipulator` 放宽至 `<58`，`react-native` 放宽至 `>=0.81 <0.87`

  仅 peer/依赖范围扩展，无运行时代码变更；SDK 57 真机验证随吾滴侧 M2/M3 里程碑进行。

## 0.2.0

### Minor Changes

- Add Expo SDK 55 compatibility while preserving Expo SDK 54 support.
- Widen Expo, React, and React Native peer ranges to cover the dual SDK 54/55 support window.
- Move the package development baseline to Expo SDK 55, React 19.2, and React Native 0.83.
- Update the Expo config plugin run-once version to match the package release.

## 0.1.3

### Patch Changes

- Treat Aliyun Push `PUSH_20110` duplicate registration as an idempotent initialization success so startup can continue to third-party channel setup, Android channel creation, deviceId collection, and account binding.
- Add targeted Vitest coverage for duplicate-registration initialization and unknown initialization failures.

## 0.1.2

### Patch Changes

- Ensure the Expo config plugin injects Aliyun/Huawei/Honor Maven repositories and Aliyun iOS pod sources whenever the plugin is configured, even if `aliyunPush.config.js` is missing or push runtime is disabled.
- Clarify that `enabled: true` controls full push native configuration, not dependency repository injection.

## 0.1.1

### Patch Changes

- Fix Expo config plugin packaging for pnpm consumers and refresh release preparation docs.

## 0.1.0

- 初始版本
- 提供阿里云推送 runtime service、React Provider、Expo Config Plugin
- 去除业务项目耦合，适合独立发布到框架 monorepo
