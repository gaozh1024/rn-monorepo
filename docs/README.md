# 📚 Panther Expo Framework 文档

## 📦 包文档

| 包                            | 描述               | 链接                                               |
| ----------------------------- | ------------------ | -------------------------------------------------- |
| @gaozh1024/rn-kit             | 统一框架包         | [README](../packages/rn-kit/README.md)             |
| @gaozh1024/rn-observatory     | 应用观测 SDK       | [README](../packages/rn-observatory/README.md)     |
| @gaozh1024/aliyun-speech      | 阿里云语音转文字包 | [README](../packages/aliyun-speech/README.md)      |
| @gaozh1024/photo-album-picker | 相册选择包         | [README](../packages/photo-album-picker/README.md) |
| @gaozh1024/aliyun-push        | 阿里云移动推送包   | [README](../packages/aliyun-push/README.md)        |
| @gaozh1024/hot-updater        | OTA 热更新包       | [README](../packages/hot-updater/README.md)        |

---

## 📖 文档导航

### 01-入门指南

必看的基础配置说明：

- [移动端软件开发架构说明](./01-入门指南/移动端软件开发架构说明.md) - 如何初始化项目、理解推荐架构并接入框架
- [Tailwind CSS 配置指南](./01-入门指南/TailwindCSS配置指南.md) ⚠️ **必看：框架样式配置说明**
  - 如果 `AppHeader` / `AppView` / `AppButton` 没样式，先看这篇

### 02-架构设计

框架架构相关的设计文档：

- [AI 可消费产物与初始化设计](./02-架构设计/AI可消费产物与初始化设计.md) - AI_USAGE、llms、manifest、init-ai 与 recipe 的整体方案
- [公共 API 清单](./02-架构设计/公共API清单.md) - 框架所有稳定 API 的详细说明
- [单包边界说明](./02-架构设计/单包边界说明.md) - 单包内部模块边界和依赖规则
- [单包验证策略](./02-架构设计/单包验证策略.md) - 验证方法和拆包触发条件
- [三方库导出策略](./02-架构设计/三方库导出策略.md) - 第三方库二次导出的决策依据

### 03-项目模板

项目模板相关文档：

- [项目模板蓝图](./03-项目模板/项目模板蓝图.md) - 基于框架启动真实业务 App 的项目结构
- [API 错误处理指南](./03-项目模板/API错误处理指南.md) - 全局错误监听和业务域 API 的推荐写法

### 04-开发规范

开发规范和维护说明：

- [测试基础设施说明](./04-开发规范/测试基础设施说明.md) - 测试架构和编写规范
- [开发态可观测性说明](./04-开发规范/开发态可观测性说明.md) - Logger、错误边界、API 自动打点与日志面板使用说明

### 05-发布说明

版本发布记录：

- [rn-observatory 0.5.2 Release Notes](./release-notes/rn-observatory-0.5.2.md)
- [rn-observatory 0.5.1 Release Notes](./release-notes/rn-observatory-0.5.1.md)
- [rn-observatory 0.5.0 Release Notes](./release-notes/rn-observatory-0.5.0.md)
- [rn-observatory 0.5.0 Publish Checklist](./release-notes/publish-checklist-rn-observatory-0.5.0-2026-05-29.md)
- [rn-observatory 0.4.0 Release Notes](./release-notes/rn-observatory-0.4.0.md)
- [rn-observatory 0.3.0 Release Notes](./release-notes/rn-observatory-0.3.0.md)
- [rn-observatory 0.2.0 Release Notes](./release-notes/rn-observatory-0.2.0.md)
- [rn-observatory 0.1.1 Release Notes](./release-notes/rn-observatory-0.1.1.md)
- [rn-observatory 0.1.0 Release Notes](./release-notes/rn-observatory-0.1.0.md)
- [expo-starter 0.2.17 Release Notes](./release-notes/expo-starter-0.2.17.md)
- [rn-kit 0.5.6 Release Notes](./release-notes/rn-kit-0.5.6.md)
- [rn-kit 0.5.6 Publish Checklist](./release-notes/publish-checklist-rn-kit-0.5.6-2026-05-30.md)
- [rn-kit 0.5.5 Release Notes](./release-notes/rn-kit-0.5.5.md)
- [rn-kit 0.5.3 Release Notes](./release-notes/rn-kit-0.5.3.md)
- [rn-kit 0.5.2 Release Notes](./release-notes/rn-kit-0.5.2.md)
- [aliyun-push 0.1.3 Release Notes](./release-notes/aliyun-push-0.1.3.md)
- [aliyun-push 0.1.2 Release Notes](./release-notes/aliyun-push-0.1.2.md)
- [rn-kit 0.5.1 Release Notes](./release-notes/rn-kit-0.5.1.md)
- [rn-kit 0.5.0 Release Notes](./release-notes/rn-kit-0.5.0.md)
- [expo-starter 0.2.16 Release Notes](./release-notes/expo-starter-0.2.16.md)
- [rn-kit 0.4.20 Release Notes](./release-notes/rn-kit-0.4.20.md)
- [rn-kit 0.4.19 Release Notes](./release-notes/rn-kit-0.4.19.md)
- [rn-kit 0.4.18 Release Notes](./release-notes/rn-kit-0.4.18.md)
- [expo-starter 0.2.15 Release Notes](./release-notes/expo-starter-0.2.15.md)
- [photo-album-picker 0.3.0 Release Notes](./release-notes/photo-album-picker-0.3.0.md)
- [hot-updater 0.1.1 Release Notes](./release-notes/hot-updater-0.1.1.md)
- [hot-updater 0.1.0 Release Notes](./release-notes/hot-updater-0.1.0.md)
- [aliyun-push 0.1.1 Release Notes](./release-notes/aliyun-push-0.1.1.md)
- [expo-starter 0.2.14 Release Notes](./release-notes/expo-starter-0.2.14.md)
- [photo-album-picker 0.2.0 Release Notes](./release-notes/photo-album-picker-0.2.0.md)
- [aliyun-push 0.1.0 Release Notes](./release-notes/aliyun-push-0.1.0.md)
- [aliyun-speech 0.1.0 Release Notes](./release-notes/aliyun-speech-0.1.0.md)
- [photo-album-picker 0.1.0 Release Notes](./release-notes/photo-album-picker-0.1.0.md)
- [expo-starter 0.2.13 Release Notes](./release-notes/expo-starter-0.2.13.md)
- [expo-starter 0.2.12 Release Notes](./release-notes/expo-starter-0.2.12.md)
- [expo-starter 0.2.11 Release Notes](./release-notes/expo-starter-0.2.11.md)
- [expo-starter 0.2.10 Release Notes](./release-notes/expo-starter-0.2.10.md)
- [expo-starter 0.2.9 Release Notes](./release-notes/expo-starter-0.2.9.md)
- [expo-starter 0.2.8 Release Notes](./release-notes/expo-starter-0.2.8.md)
- [expo-starter 0.2.7 Release Notes](./release-notes/expo-starter-0.2.7.md)
- [expo-starter 0.2.6 Release Notes](./release-notes/expo-starter-0.2.6.md)
- [rn-kit 0.4.16 Release Notes](./release-notes/rn-kit-0.4.16.md)
- [rn-kit 0.4.15 Release Notes](./release-notes/rn-kit-0.4.15.md)
- [rn-kit 0.4.10 Release Notes](./release-notes/rn-kit-0.4.10.md)
- [rn-kit 0.4.9 Release Notes](./release-notes/rn-kit-0.4.9.md)
- [rn-kit 0.4.7 Release Notes](./release-notes/rn-kit-0.4.7.md)
- [rn-kit 0.4.6 Release Notes](./release-notes/rn-kit-0.4.6.md)
- [rn-kit 0.4.5 Release Notes](./release-notes/rn-kit-0.4.5.md)
- [rn-kit 0.4.4 Release Notes](./release-notes/rn-kit-0.4.4.md)
- [rn-kit 0.4.3 Release Notes](./release-notes/rn-kit-0.4.3.md)
- [rn-kit 0.4.2 Release Notes](./release-notes/rn-kit-0.4.2.md)
- [rn-kit 0.4.1 Release Notes](./release-notes/rn-kit-0.4.1.md)
- [rn-kit 0.4.0 Release Notes](./release-notes/rn-kit-0.4.0.md)
- [rn-kit 0.3.4 Release Notes](./release-notes/rn-kit-0.3.4.md)
- [rn-kit 0.3.3 Release Notes](./release-notes/rn-kit-0.3.3.md)
- [rn-kit 0.3.2 Release Notes](./release-notes/rn-kit-0.3.2.md)
- [rn-kit 0.3.1 Release Notes](./release-notes/rn-kit-0.3.1.md)
- [rn-kit 0.3.0 Release Notes](./release-notes/rn-kit-0.3.0.md)
- [rn-kit 0.2.0 Release Notes](./release-notes/rn-kit-0.2.0.md)

---

## 🚀 其他指南

- [初始化指南](../SETUP.md)
- [发布指南](../PUBLISH.md)
- [Ignore 配置指南](../IGNORE_GUIDE.md)

---

## 🧭 维护建议

- API 以 [公共 API 清单](./02-架构设计/公共API清单.md) 为唯一准入文档
- 组件使用说明以 [@gaozh1024/rn-kit README](../packages/rn-kit/README.md) 为主
- 发布内容以 [release-notes](./release-notes/) 为准
