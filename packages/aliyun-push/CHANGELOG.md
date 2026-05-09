# Changelog

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
