# `@gaozh1024/hot-updater`

面向业务 App 的 OTA 热更新封装，基于 `@hot-updater/react-native`。

## 文档导航

- 接入说明: `./docs/integration.md`
- Manifest 规范: `./docs/manifest-spec.md`
- OSS 发布流程: `./docs/oss-release-guide.md`
- 发布脚本: `./docs/release-scripts.md`
- Manifest 示例: `./docs/manifest.example.json`

## 当前兼容基线

当前 npm 包版本：`0.2.0`

- React Native：`>=0.81 <0.84`
- React：`>=19.1.0 <20`
- `@hot-updater/react-native`：`>=0.28 <0.31`
- `@hot-updater/expo`：`^0.30.5`（由本包依赖声明提供）
- Expo SDK：覆盖 SDK 54 / SDK 55 宿主项目；升级原生热更新集成后需要重新构建 development build 或 native app。

Expo SDK 54 老项目可以升级到本包 `0.2.x`，但应继续保留 RN 0.81 对应的宿主原生依赖；Expo SDK 55 项目使用 RN 0.83 依赖线。

## 当前推荐流程

推荐把 OTA 分成两层：

- 框架层：
  - 负责 manifest 拉取
  - 负责版本判定
  - 负责下载、重启、日志
  - 提供 Provider / hook / 发布脚本
- 项目层：
  - 在启动页调用 `startLaunchUpdateCheck()`
  - 决定使用什么弹窗组件
  - 决定启动页、登录页、首页这些业务页面怎么跳转

当前推荐的用户体验：

- 启动页进入后并行做会话恢复和 OTA 检查
- JSON 获取慢或失败时，不阻塞主流程进入 App
- 非强更：
  - 后台静默下载
  - 下载完成时可接业务弹窗
  - 如果用户稍后处理，下次打开自动应用
- 强更：
  - 不需要单独强更页面
  - 直接下载并重启

## 最小接入

```ts
import { createOssHotUpdater, createHotUpdaterContext } from '@gaozh1024/hot-updater';

export const hotUpdater = createOssHotUpdater({
  manifestBaseURL: 'https://ota-cdn.xxx.com/manifest',
});

export const { HotUpdaterProvider, useHotUpdaterContext } = createHotUpdaterContext(hotUpdater);
```

入口必须保留 `wrapApp`：

```ts
const AppWithHotUpdater = hotUpdater.wrapApp(App);

export default AppWithHotUpdater;
```

这里不只是 UI 建议：底层 `HotUpdater.checkForUpdate(...)` 依赖 `HotUpdater.wrap(...)` 注册 resolver。没有这一层，`checkForUpdates()` / `startLaunchUpdateCheck()` 这类运行时检查会无法使用底层 resolver。真正的启动检查仍建议放到业务启动页，而不是依赖默认全屏更新页。

## Android 额外要求

底层 `@hot-updater/react-native` plugin 会尝试自动 patch Android 原生入口，但不同 RN / Expo / New Architecture 模板差异较大，业务项目必须核对最终 `MainApplication.kt`。
如果最终原生入口没有接上 OTA bundle 路径，可能会出现“下载成功但冷启动不生效”。

Android 侧至少需要确认这两类接入已经存在：

```kotlin
import com.hotupdater.HotUpdater

override fun getJSBundleFile(): String =
  HotUpdater.getJSBundleFile(applicationContext)

override val reactHost: ReactHost
  get() = getDefaultReactHost(applicationContext, reactNativeHost).also {
    HotUpdater.setReactHost(it)
  }
```

`@hot-updater/react-native` 的 plugin 负责尝试基础接入；如果模板没有被命中，仍需要业务项目手动补齐。

## iOS 额外要求

iOS 这边更接近“由底层 plugin 自动接入”。

我本地检查了已安装的 `@hot-updater/react-native` plugin，它会尝试：

- 给 `AppDelegate.swift` 增加 `import HotUpdater`
- 把 release 下的 `Bundle.main.url(...main.jsbundle)` 替换成 `HotUpdater.bundleURL()`

所以：

- `@gaozh1024/hot-updater` 本身不会自动 patch iOS
- 但底层 `@hot-updater/react-native` plugin 理论上会处理这一步

不过仍建议业务项目手动核对一次 `AppDelegate.swift` 是否已经是：

```swift
import HotUpdater

override func bundleURL() -> URL? {
#if DEBUG
  return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
  return HotUpdater.bundleURL()
#endif
}
```

## Provider 能力

`createHotUpdaterContext(hotUpdater, options)` 提供：

- `HotUpdaterProvider`
- `useHotUpdaterContext()`

context 内可消费：

- `summary`
- `manifest`
- `refreshManifest()`
- `checkForUpdates()`
- `startLaunchUpdateCheck()`
- `launchUpdateState`
- `reload()`

## 自定义提示框

框架默认仍然支持原生 `Alert`，但推荐项目侧注入自己的弹窗实现。

```ts
import React from 'react';
import { useAlert } from '@gaozh1024/rn-kit';
import { createHotUpdaterContext, createOssHotUpdater } from '@gaozh1024/hot-updater';

export const hotUpdater = createOssHotUpdater({
  manifestBaseURL: 'https://ota-cdn.xxx.com/manifest',
});

const { HotUpdaterProvider: BaseHotUpdaterProvider, useHotUpdaterContext } =
  createHotUpdaterContext(hotUpdater);

export function HotUpdaterProvider({ children }: { children: React.ReactNode }) {
  const { alert, confirm } = useAlert();

  return (
    <BaseHotUpdaterProvider
      manualPromptHandler={({ result, titles, actions }) => {
        if (result.status === 'up-to-date') {
          alert({
            title: titles.upToDateTitle,
            message: titles.upToDateMessage ?? result.message,
          });
          return;
        }

        if (result.status === 'error') {
          alert({
            title: titles.errorTitle,
            message: result.message,
          });
          return;
        }

        if (!result.shouldReload) {
          alert({
            title: titles.downloadedTitle,
            message: result.message,
          });
          return;
        }

        confirm({
          title: titles.downloadedTitle,
          message: result.message,
          cancelText: titles.restartLaterText,
          confirmText: titles.restartNowText,
          onConfirm: () => {
            void actions.reload();
          },
        });
      }}
      optionalUpdatePromptHandler={({ message, titles, actions }) => {
        actions.markPending();
        confirm({
          title: titles.downloadedTitle,
          message,
          cancelText: titles.restartLaterText,
          confirmText: titles.restartNowText,
          onConfirm: () => {
            void actions.reload();
          },
        });
      }}
    >
      {children}
    </BaseHotUpdaterProvider>
  );
}
```

## 文案配置

创建实例时传 `texts` 即可统一覆盖：

```ts
export const hotUpdater = createOssHotUpdater({
  manifestBaseURL: 'https://ota-cdn.xxx.com/manifest',
  texts: {
    preparingTitle: '正在准备应用',
    checkingTitle: '正在检查版本',
    updatingTitle: '正在下载更新',
    forceUpdatingTitle: '正在应用关键更新',
    upToDateTitle: '已是最新版本',
    upToDateMessage: '当前已经是最新版本。',
    checkFailedTitle: '检查更新失败',
    checkFailedMessage: '检查更新失败，请稍后重试。',
    downloadedReadyTitle: '更新已就绪',
    downloadedCompletedTitle: '更新完成',
    downloadedMessage: '更新包已下载完成，重启应用后即可生效。',
    forceUpdateCompletedMessage: '强制更新已完成，应用正在重启。',
    updateDownloadFailedMessage: '更新包下载失败，请稍后重试。',
    releaseOnlyMessage: '热更新仅在 Release 包中生效，请使用发布包验证。',
    restartNowText: '立即重启',
    restartLaterText: '稍后重启',
    launchPreparingMessage: '正在准备应用配置…',
    launchForceUpdatingMessage: '检测到关键更新，正在完成更新…',
    launchForceUpdateFailedMessage: '强制更新下载失败，请稍后重试。',
    launchForceUpdateCompletedMessage: '强制更新已完成，应用正在重启。',
    launchOptionalUpdateReadyMessage: '新版本已准备完成，重启应用后即可生效。',
    launchBackgroundUpdateFailedMessage: '后台更新失败，请稍后重试。',
    launchCheckFailedMessage: '启动时检查更新失败，请稍后重试。',
  },
});
```

## 默认行为

- 自动识别平台 `ios` / `android`
- 默认渠道优先读取 `HotUpdater.getChannel()`
- manifest 地址规则：
  - `{manifestBaseURL}/{platform}/{channel}.json`
- manifest 请求建议加 cache-buster，避免固定路径 JSON 被缓存
- `release.disabled === true` 时客户端不会下载该 release，可用于临时下线异常 OTA
- 日志统一走 `hot-updater` namespace，可刷入业务 logger 浮层

## 框架负责

- 版本比较与更新判定
- 启动阶段检查与后台下载
- 手动检查更新
- 渠道、bundleId、manifest 诊断日志
- 本地 OTA 发布脚本

## 框架不负责

- OSS 上传
- CDN 刷新
- 业务弹窗样式
- 业务埋点
- 启动页、登录页、首页的业务跳转逻辑

## Release 验证 Checklist

发布 OTA 前至少验证：

- Release 包可以正常启动，Dev 模式不作为 OTA 生效依据
- manifest 404 / 网络失败时不会阻塞进入 App
- 非强更可以后台下载，下载完成后按业务弹窗提示
- 强更可以下载并触发 reload
- Android 冷启动后 `bundleId` 发生预期变化，确认 `MainApplication.kt` 原生入口已生效
- 回滚或临时下线时，manifest 设置 `release.disabled: true` 后客户端不会继续下载该 release
