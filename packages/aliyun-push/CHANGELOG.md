# Changelog

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
