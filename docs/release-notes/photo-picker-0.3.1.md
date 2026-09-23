# @gaozh1024/photo-picker 0.3.1 Release Notes

`0.3.1` is a maintenance release for the Android and iOS picker and crop flows. It focuses on resource ownership, cache safety, and the repository migration to the single supported photo picker package.

## Changes

- Harden Android and iOS cache cleanup path checks so cleanup cannot escape the picker cache directory or remove unrelated directories.
- Make picker and crop cleanup idempotent across cancellation, unmount, asynchronous crop completion, crop failures, and callback failures.
- Release unowned crop outputs in abandoned flows while preserving output files successfully delivered to the application callback.
- Safely reject oversized `maxSelection` values with `PICKER_INVALID_OPTIONS` instead of allowing native integer conversion to fail.
- Keep merged UI configuration available when navigating from the album screen to the crop screen.
- Remove the duplicate `photo-album-picker` package from workspace, release, AI artifact, and documentation references; `photo-picker` is now the only supported package.

## Upgrade

```bash
pnpm add @gaozh1024/photo-picker@^0.3.1
npx expo install --check
```

Because this package includes native Android and iOS code, rebuild the application after upgrading. On iOS, run `pod install` or `npx expo prebuild` before rebuilding.

## Verification

- 43 package tests pass.
- TypeScript lint and typecheck pass.
- CJS, ESM, and declaration builds pass.
- Real-device validation is still required for Android system/OEM pickers, Huawei gallery modes, iOS PHPicker, and physical cache deletion.
