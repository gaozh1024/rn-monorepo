# Manifest 规范

## 文件路径约定

默认路径规则：

```text
{manifestBaseURL}/{platform}/{channel}/{appVersion}.json

旧客户端可继续使用 `{manifestBaseURL}/{platform}/{channel}.json`；新客户端只在该路径 404 时回退，并校验 appVersion 一致。
```

示例：

```text
https://ota-cdn.xxx.com/manifest/android/production.json
https://ota-cdn.xxx.com/manifest/android/staging.json
https://ota-cdn.xxx.com/manifest/ios/production.json
https://ota-cdn.xxx.com/manifest/ios/staging.json
```

说明：

- Android 和 iOS 必须请求不同的 manifest 地址
- `channel` 也是路径的一部分，`staging` 和 `production` 必须分开
- 同一个 App 只会请求“当前平台 + 当前 channel”对应的 manifest

## JSON 结构

```json
{
  "schemaVersion": 1,
  "platform": "android",
  "channel": "production",
  "updatedAt": "2026-04-01T12:00:00Z",
  "release": {
    "bundleId": "android-prod-20260401-1200-abcd1234",
    "appVersion": "0.2.1",
    "minNativeVersion": "0.2.1",
    "force": false,
    "disabled": false,
    "notes": "修复聊天页崩溃并优化登录态恢复",
    "url": "https://ota-cdn.xxx.com/bundles/android/production/android-prod-20260401-1200-abcd1234.zip",
    "sha256": "replace-with-real-sha256",
    "size": 18273645
  }
}
```

## 顶层字段

- `schemaVersion`: manifest 版本号，当前固定为 `1`
- `platform`: `android` 或 `ios`
- `channel`: 渠道名，通常是 `production` 或 `staging`
- `updatedAt`: manifest 更新时间，ISO 8601 字符串
- `release`: 当前要下发的更新信息；没有更新时可为 `null`

## `release` 字段

- `bundleId`: 本次 OTA 唯一标识，必须比当前 bundle 新
- `appVersion`: 目标底包版本，必须与当前原生版本一致
- `minNativeVersion`: 最低支持的原生版本
- `force`: 是否强更；缺省时按 `false` 处理
- `disabled`: 是否临时下线该 release；为 `true` 时客户端不会下载该更新，可选，缺省为 `false`
- `notes`: 更新说明，可选
- `url`: OTA zip 包下载地址
- `sha256`: OTA zip 包哈希，可选但强烈建议提供
- `size`: 包大小，单位字节，可选

## 客户端判断规则

客户端收到 manifest 后，会按以下规则判断是否更新：

1. `release` 不存在则不更新
2. `release.disabled === true` 则不更新
3. `platform` 不匹配则不更新
4. `channel` 不匹配则不更新
5. `release.appVersion !== 当前原生版本` 则不更新
6. `当前原生版本 < minNativeVersion` 则不更新
7. `release.bundleId === 当前 bundleId` 则不更新

满足以上条件后，才会进入下载流程。

## 建议

- `manifest` 文件设置短缓存
- OTA zip 文件设置长缓存
- `bundleId` 保证全局唯一，建议带时间戳
- 生产和测试渠道分开存储
