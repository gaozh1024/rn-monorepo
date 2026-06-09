# @gaozh1024/aliyun-push

> Expo / React Native 阿里云移动推送能力包

提供三层能力：

- **runtime service**：初始化、账号绑定、deviceId 获取、回调注册
- **React Provider**：自动初始化 + 自动绑定登录账号 + 统一回调分发
- **Expo Config Plugin**：自动注入 Android / iOS 所需原生配置

## 📦 安装

```bash
pnpm add @gaozh1024/aliyun-push aliyun-react-native-push
```

或：

```bash
npm install @gaozh1024/aliyun-push aliyun-react-native-push
```

### 当前兼容基线

当前 npm 包版本：`0.2.0`

- Expo SDK：`>=54 <56`
- React Native：`>=0.81 <0.84`
- React：`>=19.1.0 <20`
- `@expo/config-plugins`：`>=54 <56`（由本包依赖声明提供）

Expo SDK 54 老项目可以升级到本包 `0.2.x`，但应继续保留 SDK 54 对应的宿主原生依赖；Expo SDK 55 项目使用 SDK 55 依赖线并重新构建 development build。

## 必需依赖

### 运行时必需

- `react`
- `react-native`
- `aliyun-react-native-push`

### 使用 Expo Config Plugin 时必需

- `expo`

> `@expo/config-plugins` 无需单独安装。本包已声明兼容 Expo SDK 54/55 的插件依赖，常规项目只需安装 `expo` 即可。

## 适用场景

推荐用于 **Expo prebuild / development build** 项目。

如果你是纯 React Native 裸工程，也可以继续使用本包的 runtime / provider 能力，但需要你自行完成原生侧配置。

## ✨ 相比原项目整理过的点

- 去掉了和业务项目耦合的 `@gaozh1024/rn-kit` 日志依赖
- 去掉了源插件里针对特定录音库的 AndroidManifest 修补逻辑
- 增加了初始化并发复用，避免重复 `initPush`
- 暴露独立 logger 注入能力，便于接入你自己的日志系统

## 1. app.json / app.config.ts 配置插件

```json
{
  "expo": {
    "plugins": [
      [
        "@gaozh1024/aliyun-push/plugin",
        {
          "configFile": "./aliyunPush.config.js"
        }
      ]
    ]
  }
}
```

> 插件会在被配置后始终注入 Android Maven 仓库和 iOS Pod source，用于解析
> `aliyun-react-native-push` 的原生依赖；`aliyunPush.config.js` 中的
> `enabled: true` 只控制权限、receiver、厂商通道、APNs entitlement、AppDelegate
> 等完整推送能力配置。

## 2. 新建 `aliyunPush.config.js`

> 建议加入 `.gitignore`，避免提交敏感密钥。
> 如果文件不存在或 `enabled` 不是 `true`，插件仍会注入依赖仓库，但不会注入完整推送原生配置。

```js
/** @type {import('@gaozh1024/aliyun-push').AliyunPushRuntimeConfig} */
module.exports = {
  enabled: true,
  debug: true,
  autoBindAccount: true,
  autoInitThirdPush: true,
  requestAndroidNotificationPermission: true,
  showNoticeWhenForeground: true,
  ios: {
    appKey: 'your-ios-app-key',
    appSecret: 'your-ios-app-secret',
    apsEnvironment: 'development',
    enableBackgroundRemoteNotifications: true,
  },
  android: {
    appKey: 'your-android-app-key',
    appSecret: 'your-android-app-secret',
  },
  vendors: {
    huaweiAppId: '',
    vivoAppId: '',
    vivoApiKey: '',
    honorAppId: '',
    oppoKey: '',
    oppoSecret: '',
    xiaomiAppId: '',
    xiaomiAppKey: '',
    meizuAppId: '',
    meizuAppKey: '',
    fcmSenderId: '',
    fcmAppId: '',
    fcmProjectId: '',
    fcmApiKey: '',
  },
  androidChannel: {
    id: 'default',
    name: '默认通知',
    importance: 4,
    desc: '默认消息通知通道',
    showBadge: true,
  },
};
```

## 3. 执行 prebuild / pod install

```bash
npx expo prebuild
```

如 iOS 原生目录已存在，建议再执行：

```bash
cd ios && pod install
```

## 4. Provider 接入

```tsx
import React, { useMemo } from 'react';
import { AliyunPushProvider, normalizeAliyunPushConfig } from '@gaozh1024/aliyun-push';

const pushConfig = normalizeAliyunPushConfig({
  enabled: true,
  ios: {
    appKey: 'your-ios-app-key',
    appSecret: 'your-ios-app-secret',
    apsEnvironment: 'development',
  },
  android: {
    appKey: 'your-android-app-key',
    appSecret: 'your-android-app-secret',
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => pushConfig, []);
  const user = { id: 'u_123' };

  return (
    <AliyunPushProvider
      config={config}
      user={user}
      isLoggedIn={true}
      accountResolver={currentUser => currentUser?.id ?? null}
      openNotificationTarget={event => {
        console.log('open from notification', event);
        return null;
      }}
      onNotificationReceive={event => {
        console.log('notification', event);
      }}
      onMessage={event => {
        console.log('message', event);
      }}
    >
      {children}
    </AliyunPushProvider>
  );
}
```

## 5. Hook 获取初始化状态

```tsx
import { useAliyunPush } from '@gaozh1024/aliyun-push';

function PushDebugPanel() {
  const { isConfigured, isInitialized, deviceId, apnsDeviceToken, error, refresh } =
    useAliyunPush();

  return null;
}
```

## 6. 只使用 service API

如果你不想引入 Provider，也可以手动调用：

```ts
import {
  initAliyunPush,
  bindAliyunPushAccount,
  registerAliyunPushCallbacks,
  normalizeAliyunPushConfig,
} from '@gaozh1024/aliyun-push';

const config = normalizeAliyunPushConfig({
  enabled: true,
  android: { appKey: 'a', appSecret: 'b' },
  ios: { appKey: 'c', appSecret: 'd' },
});

await initAliyunPush(config);
await bindAliyunPushAccount('user-id', config);

registerAliyunPushCallbacks({
  onNotification: event => console.log(event),
});
```

## 7. 可选：接入自定义 logger

```ts
import { setAliyunPushLogger } from '@gaozh1024/aliyun-push';

setAliyunPushLogger({
  debug: (message, data, namespace) => console.debug(namespace, message, data),
  info: (message, data, namespace) => console.info(namespace, message, data),
  warn: (message, data, namespace) => console.warn(namespace, message, data),
  error: (message, data, namespace) => console.error(namespace, message, data),
});
```

## 导出能力

### 配置

- `defaultAliyunPushConfig`
- `normalizeAliyunPushConfig`
- `hasVendorPushConfig`
- `getCurrentPlatformCredentials`

### Provider / Hook

- `AliyunPushProvider`
- `useAliyunPush`

### Service

- `initAliyunPush`
- `registerAliyunPushCallbacks`
- `removeAliyunPushCallbacks`
- `bindAliyunPushAccount`
- `unbindAliyunPushAccount`
- `getAliyunPushDeviceId`
- `getAliyunPushApnsDeviceToken`
- `isAliyunPushInitialized`
- `isAliyunPushConfigured`
- `resetAliyunPushRuntime`

### Logger

- `pushLogger`
- `setAliyunPushLogger`
- `getAliyunPushLogger`

## 注意事项

1. `aliyunPush.config.js` 建议本地维护，不要提交真实密钥
2. Android 13+ 通知权限由包内自动请求，但前提是插件已写入权限
3. iOS 的 `aps-environment`、前台通知展示、远程通知后台模式都依赖插件写入原生配置
4. 厂商通道参数不是必填；只有配置了对应字段，插件才会注入对应 metadata
5. 如果修改了 `aliyunPush.config.js`，记得重新执行 `expo prebuild` / `pod install`
6. 只安装依赖但暂不启用推送时，也应保留 `@gaozh1024/aliyun-push/plugin`，否则 Gradle/CocoaPods 可能找不到阿里云原生依赖仓库
7. 阿里云原生 SDK 返回 `PUSH_20110` 表示已经注册过，包内会按幂等初始化成功继续获取 deviceId 和执行账号绑定

## 🛠️ 本地开发

```bash
pnpm --filter @gaozh1024/aliyun-push typecheck
pnpm --filter @gaozh1024/aliyun-push build
```
