# @gaozh1024/aliyun-speech

> Expo / React Native 阿里云实时语音转文字能力包

提供三层能力：

- **core 协议层**：`AliyunSpeechTranscriber`
- **headless hook**：`useAliyunVoiceToText`
- **可选默认 UI**：`VoiceToTextInput`

适合在聊天输入框、语音速记、语音命令输入等场景复用。

## 📦 安装

```bash
pnpm add @gaozh1024/aliyun-speech
pnpm add @siteed/audio-studio expo-audio
```

或：

```bash
npm install @gaozh1024/aliyun-speech @siteed/audio-studio expo-audio
```

### 当前兼容基线

当前 npm 包版本：`0.2.0`

- Expo SDK：`>=54 <56`
- React Native：`>=0.81 <0.84`
- React：`>=19.1.0 <20`
- `expo-audio`：`>=1 <56`（建议用 `npx expo install expo-audio` 让 Expo 按宿主 SDK 选择版本）
- `@siteed/audio-studio`：`>=3 <4`

Expo SDK 54 老项目可以升级到本包 `0.2.x`，但应继续保留 SDK 54 对应的录音/音频原生依赖；Expo SDK 55 项目使用 SDK 55 依赖线并重新构建 development build。

## 前置依赖与配置

本包默认录音实现基于：

- `@siteed/audio-studio`
- `expo-audio`

### Expo app.json 插件配置

```json
{
  "expo": {
    "plugins": [
      [
        "@siteed/audio-studio",
        {
          "enableNotifications": false,
          "enableBackgroundAudio": false,
          "enablePhoneStateHandling": false,
          "enableDeviceDetection": false,
          "iosConfig": {
            "microphoneUsageDescription": "需要麦克风权限用于语音转文字"
          }
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "需要麦克风权限用于语音转文字"
      }
    },
    "android": {
      "permissions": ["RECORD_AUDIO"]
    }
  }
}
```

> 如果你的 App 已经配置过麦克风权限和 `@siteed/audio-studio` 插件，可直接复用。

## ✨ 设计目标

- **headless 优先**：业务状态机和协议层不依赖具体 UI
- **UI 可选**：内置一个默认语音输入组件，但不是强制入口
- **token 外部提供**：支持手动设置、按需刷新、自动刷新
- **录音器可替换**：默认适配 `@siteed/audio-studio`
- **权限实现可替换**：默认使用 `expo-audio`，也支持外部注入

## 🚀 初始化

```ts
import { initializeAliyunSpeech } from '@gaozh1024/aliyun-speech';

initializeAliyunSpeech({
  appKey: 'your-app-key',
  url: 'wss://nls-gateway-cn-beijing.aliyuncs.com/ws/v1',
  format: 'pcm',
  sampleRate: 16000,
  intervalMs: 100,
  tokenRefreshBufferMs: 60_000,
  refreshToken: async () => {
    return {
      token: await fetchAliyunTokenFromServer(),
      ttlMs: 30 * 60 * 1000,
    };
  },
});
```

## 🔐 token 管理

### 主动设置 token

```ts
import { setAliyunSpeechToken } from '@gaozh1024/aliyun-speech';

setAliyunSpeechToken(token, {
  ttlMs: 30 * 60 * 1000,
});
```

### 即将连接前自动刷新

```ts
import { refreshAliyunSpeechTokenIfNeeded } from '@gaozh1024/aliyun-speech';

await refreshAliyunSpeechTokenIfNeeded();
```

### 强制刷新

```ts
import { refreshAliyunSpeechToken } from '@gaozh1024/aliyun-speech';

await refreshAliyunSpeechToken();
```

## 🪝 推荐接入方式

### 1. headless hook

```ts
import { useAliyunVoiceToText } from '@gaozh1024/aliyun-speech';

const voice = useAliyunVoiceToText({
  onSendText,
  onEditText,
  onError: showError,
});
```

### 2. 默认 UI

```tsx
import { VoiceToTextInput } from '@gaozh1024/aliyun-speech';

<VoiceToTextInput
  onSendText={onSendText}
  onEditText={onEditText}
  texts={{ idle: '按住说话' }}
  theme={{ triggerIdleBackground: '#111827' }}
/>;
```

## 📚 导出能力

### 配置与 token

- `initializeAliyunSpeech`
- `setAliyunSpeechToken`
- `clearAliyunSpeechToken`
- `getAliyunSpeechConfig`
- `getAliyunSpeechToken`
- `getAliyunSpeechTokenState`
- `refreshAliyunSpeechToken`
- `refreshAliyunSpeechTokenIfNeeded`
- `resolveAliyunSpeechConfig`

### 协议层 / hook / 组件

- `AliyunSpeechTranscriber`
- `useAliyunVoiceToText`
- `VoiceToTextInput`
- `useAudioStudioRecorder`
- `ensureMicrophonePermission`

## 🧩 自定义能力边界

如果你不想使用默认实现，可以自行注入：

- `recorder`
- `ensurePermission`
- `speechConfig`

这样可以保留协议层和编排层，同时替换录音器或权限来源。

## ⚠️ 注意事项

1. 不要在包内写死明文 token / appKey
2. 生产环境 token 应由服务端签发
3. 建议在进入语音页面前先调用 `refreshAliyunSpeechTokenIfNeeded()`
4. 当前默认录音实现依赖 Expo 生态，更适合 Expo / prebuild 项目

## 🛠️ 本地开发

```bash
pnpm --filter @gaozh1024/aliyun-speech typecheck
pnpm --filter @gaozh1024/aliyun-speech build
```
