# @gaozh1024/aliyun-push 0.1.3 Release Notes

发布日期：2026-05-10

## 修复

- 修复阿里云推送重复初始化返回 `PUSH_20110` 时被误判为初始化失败的问题。
- `PUSH_20110` 现在会被视为原生 SDK 已完成注册的幂等成功结果，初始化流程会继续执行：
  - Android 厂商通道初始化
  - Android 通知通道创建
  - iOS 前台通知展示配置
  - deviceId / APNs token 获取
  - Provider `onInitSuccess`
  - 登录账号自动绑定

## 验证

- 新增 `service.test.ts` 覆盖 `PUSH_20110` 幂等成功场景。
- 保留未知初始化错误的失败路径测试，避免误吞真实初始化失败。

## 升级建议

- 升级到 `@gaozh1024/aliyun-push@0.1.3`。
- 如果已经接入 `AliyunPushProvider`，无需改业务代码。
- 升级后重启 App，日志应能继续看到“获取 deviceId 成功”“推送初始化完成”“账号绑定成功”。
