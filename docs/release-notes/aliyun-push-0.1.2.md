# @gaozh1024/aliyun-push 0.1.2 Release Notes

发布日期：2026-05-09

## 修复

- 修复 Expo Config Plugin 在缺少 `aliyunPush.config.js` 或 `enabled` 未开启时提前返回的问题。
- 插件现在只要被配置，就会注入 Android 侧 Aliyun / Huawei / Honor Maven 仓库，确保 Gradle 能解析 `aliyun-react-native-push` 依赖的 `com.aliyun.ams:*` 原生包。
- 插件现在只要被配置，也会注入 iOS 侧 Aliyun CocoaPods source，避免安装原生依赖时缺少 Aliyun spec 源。

## 行为说明

- `enabled: true` 现在只控制完整推送能力配置，包括 Android 权限、receiver、厂商通道 metadata、ProGuard、iOS APNs entitlement、后台远程通知和 AppDelegate 推送回调。
- 仓库 / Pod source 注入属于编译期依赖解析能力，不再受 `enabled` 或本地配置文件是否存在影响。

## 升级建议

- 升级到 `@gaozh1024/aliyun-push@0.1.2` 后，重新执行 `npx expo prebuild`。
- 如果 iOS 原生目录已存在，继续执行 `cd ios && pod install`。
- 已生成过 Android 原生目录的项目，需要确认 `android/build.gradle` 中已出现 Aliyun / Huawei / Honor Maven 仓库。
