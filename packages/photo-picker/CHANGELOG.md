# Changelog

## 0.4.0

### Minor Changes

- 放宽 peer 依赖以支持 Expo 57 / React Native 0.86（吾滴 SDK 55→57 升级前置，与 rn-kit 0.7.0 同一轮兼容性扩展）：
  - aliyun-push：`expo` 放宽至 `>=54 <58`，`react-native` 放宽至 `>=0.81 <0.87`，依赖 `@expo/config-plugins` 放宽至 `>=54 <58`
  - hot-updater：`react-native` 放宽至 `>=0.81 <0.87`
  - photo-picker：`expo-modules-core` 放宽至 `>=55 <58`，`expo-image` / `expo-image-manipulator` 放宽至 `<58`，`react-native` 放宽至 `>=0.81 <0.87`

  仅 peer/依赖范围扩展，无运行时代码变更；SDK 57 真机验证随吾滴侧 M2/M3 里程碑进行。

## 0.3.1

### Patch Changes

- Fix Android and iOS cache cleanup boundaries and keep cleanup idempotent across picker and crop flows.
- Release unowned crop outputs on cancellation, unmount, late async results, crop failures, and callback failures while preserving successfully delivered output files.
- Validate oversized `maxSelection` values safely and keep crop-page UI configuration consistent with merged route options.
- Replace the removed duplicate `photo-album-picker` package with `photo-picker` in workspace, release, AI artifact, and documentation references.

## 0.3.0

### Minor Changes

- Add the iOS native backend: `PhotoPickerModule` in Swift on top of
  `PHPickerViewController` (iOS 14+; the pod targets iOS 15.1), matching the
  permissionless Android Photo Picker contract. No photo library permission or
  Info.plist usage description is required.
- iOS results report `source: 'ios-phpicker'` / `action: 'PHPickerViewController'`
  with the same `backend` diagnostics shape, asset keys, and `PICKER_*` error
  codes as Android; cancellation resolves `{cancelled: true, assets: []}`.
- Selected media is copied into `Library/Caches/photo-picker/<uuid>/` and
  returned as `file://` URIs; `releaseMedia` and `clearPickerCache` manage that
  directory on both platforms.
- `nativeUi.orderedSelection` is applied natively on iOS 15+ multi-select
  sessions; `nativeUi.accentColor` and `nativeUi.defaultTab` are Android-only
  hints and are reported under `ignoredUiOptions` on iOS.
- `pickMedia` now runs on Android and iOS; other platforms throw a
  platform-specific unsupported error, and `getCapabilities` keeps returning an
  honest `available: false` snapshot there.
