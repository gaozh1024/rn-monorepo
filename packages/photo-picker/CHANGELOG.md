# Changelog

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
