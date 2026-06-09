# @gaozh1024/photo-album-picker

## 0.4.0

### Minor Changes

- Add Expo SDK 55 package-line compatibility while preserving Expo SDK 54 support through `expo install`.
- Expand peer dependency ranges for Expo media packages, React Native, and Reanimated.
- Treat `@shopify/flash-list` as an Expo-managed native dependency in docs and development baseline.
- Update the development baseline to Expo SDK 55 and document SDK-specific `expo-image-manipulator` guidance.

## 0.3.0

### Minor Changes

- 新增 `uiConfig` 统一 UI 配置入口，支持覆盖权限页“允许访问”按钮背景色。
- 新增完整多语言文案配置，覆盖按钮入口、权限页、相册页、预览页、裁剪页和用户可见错误提示。
- 导出默认中文文案与 UI 配置工具，便于业务侧按需复用和二次封装。

## 0.2.0

### Minor Changes

- 644e7c8: 新增独立的相册选择包，提供相册按钮入口、网格选择、预览与裁剪页面，并补齐安装与接入文档。

### Patch Changes

- 修正 `@gaozh1024/photo-album-picker` 的 Expo peer 兼容范围，收敛到 Expo SDK 54，并将 `expo-image-manipulator` 约束改为与 Expo 54 匹配的 `14.x`，避免安装到不兼容的 `55.x` 后在裁剪流程触发原生崩溃。

## 0.1.0

### Minor Changes

- 初始版本发布。
- 提供相册网格选择、预览、裁剪页面、按钮入口与底层 hook。
- 适配 Expo / React Native + React Navigation 场景。
