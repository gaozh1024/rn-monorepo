# @gaozh1024/photo-picker

Permissionless Android system media selection for Expo and React Native.

## 0.2.1 split-entry notes

Implements `docs/photo-picker-split-framework-plan.md`: the app chooses photo or video first
(the framework adds no type-selection dialog), then calls with `mediaType: 'photo' | 'video'`,
the remaining quota as `maxSelection`, and `android.preference: 'gallery'`.

- Vendor capabilities are now registered per mode: `photo-single`, `photo-multiple`,
  `video-single`, `video-multiple`. Only verified (SUPPORTED) modes become candidates.
  当前华为四种模式均临时设为 SUPPORTED，供本地 yalc 验收使用；此状态用于开放路由，
  不代表本次真机验收已通过。照片多选、视频单选和视频多选须完成 App 回传、读取与缓存验证后才能正式交付。
- A multi-select request whose vendor mode is unverified skips the vendor adapter and tries
  the standard backend supporting that type and mode — never a silent downgrade to
  single-select or a different media type.
- `maxSelection=1` normalizes to single-select even when the caller passes
  `allowsMultipleSelection: true`.
- "Supports multi-select" and "can limit the picker UI to N items" are reported separately:
  a mode with an unknown native limit is `selectionLimit: 'post-validation'` and the business
  limit is enforced after return. `verifiedMaxSelection` never caps a different mode.
- Bounded launch fallback: each candidate launches at most once; only synchronous
  pre-display failures move to the next candidate. User cancellation or post-display errors
  terminate the request.

## 0.2.0 upgrade notes

This release implements the backend strategy described in
`docs/photo-picker-upgrade-design.md` (phases A + B). Compatibility-sensitive changes:

- `PickerSource` adds `android-system-fallback`, `android-vendor-gallery`, and `ios-phpicker`
  (the iOS value is reserved; no iOS backend ships yet). Classify by the backend that
  actually handled the request, not the requested one.
- New error codes join the contract: `PICKER_INVALID_OPTIONS`, `PICKER_UNAVAILABLE`,
  `PICKER_SELECTION_LIMIT_EXCEEDED`, `PICKER_UNSUPPORTED_MEDIA`, `PICKER_READ_FAILED`,
  `PICKER_CACHE_FAILED`, `PICKER_INTERRUPTED`.
- Behavior changes:
  - A requested multi-select limit above the system maximum is now **clamped** and reported
    via `effectiveMaxSelection` instead of failing with `PICKER_SELECTION_LIMIT_UNSUPPORTED`
    (the error code is retained for compatibility).
  - Results are never silently truncated. An over-limit return is `PICKER_SELECTION_LIMIT_EXCEEDED`.
  - `maxSelection` must be a positive integer in `pickMedia()`; `NaN`, fractions, `0`, and
    negatives reject with `PICKER_INVALID_OPTIONS` on the JS side.
  - When `android.allowDocumentFallback` is `false`, the document picker never serves the
    request (`PICKER_UNAVAILABLE` if no photo-type candidate exists). User cancellation never
    triggers a fallback.
- New API:
  - `pickMedia(options)` accepts `android.preference` (`auto` default / `system` / `gallery`),
    `android.allowDocumentFallback` (default `true`), and `nativeUi` (`accentColor` `#RRGGBB`
    with luminance >= 0.5, `defaultTab`, `orderedSelection`).
  - `getCapabilities(options)` probes available backends without opening UI or requesting
    permissions.
  - Results (including cancellations) may include `backend: PickerBackendInfo` with
    `selectionLimit`, `effectiveMaxSelection`, `orderedSelectionGuaranteed`,
    `appliedUiOptions`, and `ignoredUiOptions`.

## Android behavior

The native module probes capabilities and picks the backend before launching the activity:

| Android/device capability                                                                         | Backend                                                         | User-visible UI                                                                             |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Standard photo picker available (Android 13+, R extension 2+ on 30–32, or an OEM fallback picker) | `android-photo-picker` / `android-system-fallback`              | Android Photo Picker, including the `所有照片` / `相册` layout shown in the reference image |
| Huawei gallery validation build (`com.huawei.photos`, separate photo/video requests)              | `android-vendor-gallery` (adapter `huawei-gallery`)             | Vendor gallery material-selection page                                                      |
| No photo-type candidate                                                                           | `android-open-document` / `android.intent.action.OPEN_DOCUMENT` | Android DocumentsUI file picker                                                             |

Candidate order follows `android.preference`:

- `auto` (default): standard photo picker -> verified vendor gallery -> document picker.
- `system`: AndroidX standard chain only; vendor adapters are never inserted.
- `gallery`: verified vendor gallery -> standard photo picker -> document picker.

The standard chain delegates Intent construction to the AndroidX Activity contracts
(`activity-ktx` 1.11.0), so platform picker / system fallback / document fallback selection
matches the AndroidX rules; `source` reflects the Intent action that was actually created.

华为适配器使用限定 `com.huawei.photos` 的 `ACTION_PICK`，按当前请求选择图片或视频集合、
对应 MIME 和多选参数。检测与启动使用同一构造函数，并检查 Activity 启用、可导出及应用启用状态。
不硬编码内部 Activity 类名，`all` 混选不进入此适配器。

本地待验收版本临时开放四种模式。历史 DCO-AL00（API 31）报告包含照片回传验证，视频仅有
ADB 界面验证；这些历史结果不代表本次构建通过。多选的 `verifiedMaxSelection` 为 null，
使用 `post-validation`，业务数量不会固定为 2 或图库显示的 50。正式发布前必须分别验证各模式。

The Photo Picker is provided by the OS or OEM. Its colors, labels, tabs, privacy banner, album presentation, and exact layout are not controlled by this package. The reference image is therefore a device smoke-test target, not a drawable screen that the library can reproduce pixel-for-pixel.

The package does not declare or request `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, or `READ_MEDIA_VISUAL_USER_SELECTED`, and adds no `QUERY_ALL_PACKAGES`. It returns the URIs selected in the current picker session and copies them into the app cache. It does not enumerate the device media library.

The Android 14 limited-library permission flow is intentionally out of scope for this API. A future library-access capability must be a separate permission and MediaStore API; it must not change the meaning of `pickMedia()`.

## Usage

```tsx
import { PhotoAlbumScreen } from '@gaozh1024/photo-picker';

// Keep the existing route name if migrating from photo-album-picker.
<Stack.Screen name="PhotoAlbum" component={PhotoAlbumScreen} />;
```

`PhotoAlbumScreen` preserves the existing selection, crop, callback, and upload flow. For custom flows, use the exported `pickMedia` API, the callback registry, and `PhotoCropScreen`.

`maxSelection` must be a positive integer after normalization. The JavaScript flow does not impose the old arbitrary limit of `100`. A multi-select request above the OS-supported limit is clamped to `effectiveMaxSelection` and the applied value is reported back. Crop mode always selects one image.

## Result and diagnostics

`pickMedia()` resolves with:

```ts
{
  cancelled: boolean;
  assets: PhotoAlbumItem[];
  source?: PickerSource;
  action?: string;
  backend?: {
    source: PickerSource;
    action?: string;
    vendorAdapterId?: string;
    selectionLimit: 'native' | 'post-validation';
    requestedMaxSelection: number;
    effectiveMaxSelection: number;
    orderedSelectionGuaranteed: boolean;
    appliedUiOptions: string[];
    ignoredUiOptions: string[];
  };
}
```

`source` and `action` describe the backend that actually handled the request; `backend` adds observability (including on cancellations). For selected assets, `source` is also retained on each asset.

Native failures expose a stable `code` recognized by `isPhotoPickerNativeError`:

- `PICKER_BUSY`: another picker request is already in flight; allow it to finish before retrying.
- `PICKER_LAUNCH_FAILED`: the resolved activity could not be started; report the error and inspect the device/provider configuration.
- `PICKER_SELECTION_LIMIT_UNSUPPORTED`: retained for compatibility; over-limit requests are now clamped.
- `PICKER_INVALID_OPTIONS`: malformed options (bad `maxSelection`, `mediaType`, `preference`, `accentColor` format, ...).
- `PICKER_UNAVAILABLE`: no candidate can serve the request (e.g. fallback disabled and no photo-type backend).
- `PICKER_SELECTION_LIMIT_EXCEEDED`: the picker returned more items than the effective limit; nothing is truncated or copied.
- `PICKER_UNSUPPORTED_MEDIA`: the picker returned media outside the requested type; not silently filtered.
- `PICKER_READ_FAILED`: a returned URI/provider file could not be read; retryable.
- `PICKER_CACHE_FAILED`: disk or copy failure; the partial cache files of the request are cleaned up.
- `PICKER_INTERRUPTED`: the request could not be delivered (host destroyed); the module never stays busy.

A failed selection/materialization is all-or-nothing: the request never resolves with a partial asset list, and cache files created by the failed request are removed.

## Native rebuild requirement

The package contains native Android code. After installing or updating it, rebuild and reinstall the Android application; an OTA JavaScript update cannot install or replace the native module.

```sh
pnpm --dir packages/photo-picker test
pnpm --dir packages/photo-picker typecheck
pnpm --dir packages/photo-picker build
```

For local Yalc development:

```sh
pnpm build
pnpm exec yalc publish --push
```

Then, in the consuming application:

```sh
pnpm exec yalc add @gaozh1024/photo-picker
```

## Device smoke gate

The TypeScript tests cover option normalization, crop/single-select behavior, result source/action shape, cancellation semantics, and native error-code discrimination. They cannot prove which Android activity an OEM launches.

Before release, verify on real devices:

1. Android 13 and 14/15 devices with Photo Picker: the picker opens as the OS Photo Picker, `source` is `android-photo-picker`, and `action` is `android.provider.action.PICK_IMAGES`.
2. Android 12 or a device without a usable Photo Picker: the UI is DocumentsUI, `source` is `android-open-document`, and `action` is `android.intent.action.OPEN_DOCUMENT`.
3. Single-select, mixed image/video, multi-select, crop, cancel, an over-limit request, repeated taps, and a provider launch failure.
4. `getCapabilities()` matches the backend that actually opens on each device, and `android.preference="system"` bypasses vendor adapters.
5. 华为：分别验证照片单选/多选、视频单选/多选，确认实际组件属于 `com.huawei.photos`，返回 `source=android-vendor-gallery`、`vendorAdapterId=huawei-gallery`；检查数量、MIME、读取、缓存、视频时长和预览。另测上限为 2 时选择 3 项、取消、图库不可用和 `all` 混选。
6. The app's merged manifest contains no media-read permission added by this package, and no runtime media permission prompt appears.

Record the device model, Android version, selected backend, action, and error code for every failure. Do not use the appearance of a limited-library banner as proof of this package's `pickMedia()` behavior; limited-library support is a separate future capability.
