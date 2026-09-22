# @gaozh1024/photo-picker 0.3.0 Release Notes

`0.3.0` makes `@gaozh1024/photo-picker` a true cross-platform picker: the iOS native backend ships alongside the existing Android Photo Picker, keeping the same permissionless contract on both platforms.

## Changes

- Add the iOS native backend: `PhotoPickerModule` in Swift on top of `PHPickerViewController` (iOS 14+; the pod targets iOS 15.1), matching the permissionless Android Photo Picker contract. No photo library permission or Info.plist usage description is required.
- iOS results report `source: 'ios-phpicker'` / `action: 'PHPickerViewController'` with the same `backend` diagnostics shape, asset keys, and `PICKER_*` error codes as Android; cancellation resolves `{cancelled: true, assets: []}`.
- Selected media is copied into `Library/Caches/photo-picker/<uuid>/` and returned as `file://` URIs; `releaseMedia` and `clearPickerCache` manage that directory on both platforms.
- `nativeUi.orderedSelection` is applied natively on iOS 15+ multi-select sessions; `nativeUi.accentColor` and `nativeUi.defaultTab` are Android-only hints and are reported under `ignoredUiOptions` on iOS.
- `pickMedia` now runs on Android and iOS; other platforms throw a platform-specific unsupported error, and `getCapabilities` keeps returning an honest `available: false` snapshot there.

## Upgrade

```bash
pnpm add @gaozh1024/photo-picker@^0.3.0
npx expo install --check
```

For iOS, run `pod install` (or `npx expo prebuild`) so the `Gaozh1024PhotoPicker` pod is linked. No Info.plist photo usage description is needed — `PHPickerViewController` runs out of process and requires no photo library permission. Validate multi-select ordering on iOS 15+ and confirm that Android-only `nativeUi` hints surface under `ignoredUiOptions` on iOS.
