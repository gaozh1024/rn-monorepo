# OSS 发布流程

## 适用范围

这个流程适用于：

- 客户端已经接入 `@gaozh1024/hot-updater`
- OTA 文件存放在阿里云 OSS
- manifest 也是静态 JSON 文件

## 推荐目录

```text
manifest/
  android/
    production.json
    staging.json
  ios/
    production.json
    staging.json

bundles/
  android/
    production/
    staging/
  ios/
    production/
    staging/
```

## 平台与渠道说明

- Android 和 iOS 的 manifest 地址必须分开
- `channel` 也必须分开，通常至少区分 `staging` 和 `production`
- 客户端最终请求的地址规则固定为：

```text
{manifestBaseURL}/{platform}/{channel}/{appVersion}.json

旧路径 `{manifestBaseURL}/{platform}/{channel}.json` 仅作为兼容回退。
```

示例：

```text
https://ota-cdn.xxx.com/manifest/android/staging.json
https://ota-cdn.xxx.com/manifest/android/production.json
https://ota-cdn.xxx.com/manifest/ios/staging.json
https://ota-cdn.xxx.com/manifest/ios/production.json
```

## 完整发布步骤

1. 修改 JS/TS/图片等非原生内容
2. 用 Release 包验证功能
3. 生成新的 OTA zip 包
4. 推荐直接使用 `release-scripts.md` 中的 `ota:prepare` 生成待发布目录
5. 上传 zip 到 OSS
6. 上传对应平台/渠道的 manifest JSON
7. 刷新 CDN 缓存或等待 manifest 短缓存过期

## 推荐命令

先按 `release-scripts.md` 在业务项目配置 `ota:*` scripts，或直接执行 `node node_modules/@gaozh1024/hot-updater/scripts/prepare-release.mjs`。配置 scripts 后可运行：

```bash
npm run ota:prepare -- \
  --platform android \
  --channel production \
  --app-version 0.2.1 \
  --manifest-base-url https://ota-cdn.xxx.com/manifest \
  --notes "修复聊天页崩溃"
```

脚本会在当前项目根目录产出：

```text
ota-releases/
  bundles/
    android/
      production/
        <actualBundleId>.zip
  manifest/
    android/
      production.json
```

这套结构就是按 OSS 路径镜像出来的，可以直接按目录同步上传。

对应关系：

```text
本地:
ota-releases/bundles/android/production/<actualBundleId>.zip
OSS:
bundles/android/production/<actualBundleId>.zip

本地:
ota-releases/manifest/android/production.json
OSS:
manifest/android/production.json
```

## 什么时候不能走 OTA

以下变更必须重新发原生底包：

- 新增或修改原生依赖
- `app.json` plugin 变化
- Pod / Gradle 变化
- 推送、语音、支付等原生能力变化
- 任何需要重新编译 iOS / Android 工程的变更

## Release 验证

`hot-updater` 在 Dev 模式不会真正工作，必须使用 Release 包验证：

```bash
npx expo run:ios --configuration Release
npx expo run:android --variant release
```

## 缓存建议

- `manifest/<platform>/<channel>/<appVersion>.json`
  - 建议 `no-cache`
  - 客户端请求建议追加 cache-buster
- `bundles/<platform>/<channel>/<actualBundleId>.zip`
  - 建议长缓存
  - 因为文件名天然不可变

## 回滚方式

最简单的回滚方法不是重新发客户端代码，而是把 manifest 改回旧的稳定 bundle：

1. 找到上一个稳定的 zip
2. 修改对应 manifest 的 `release`
3. 刷新 manifest 缓存

这样客户端下次启动时就会拿到旧版本。
