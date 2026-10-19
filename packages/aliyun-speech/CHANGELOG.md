# @gaozh1024/aliyun-speech

## 0.3.0

### Minor Changes

- Widen Expo, expo-audio, and React Native peer ranges to cover Expo SDK 57 / React Native 0.86 (same compatibility round as rn-kit 0.7.0, aliyun-push 0.3.0, hot-updater 0.3.0, and photo-picker 0.4.0).
- Upper bounds only: `expo` `>=54 <56` → `>=54 <58`, `expo-audio` `>=1 <56` → `>=1 <58`, `react-native` `>=0.81 <0.84` → `>=0.81 <0.87`. No runtime code changes.

## 0.2.0

### Minor Changes

- Add Expo SDK 55 compatibility while preserving Expo SDK 54 support.
- Widen Expo, React, and React Native peer ranges to cover the dual SDK 54/55 support window.
- Move the package development baseline to Expo SDK 55, React 19.2, and React Native 0.83.

## 0.1.0

### Minor Changes

- 初始版本发布。
- 提供阿里云实时语音转文字协议封装、headless hook 与可选默认 UI。
- 默认集成 `@siteed/audio-studio` 录音适配与 `expo-audio` 权限实现。
