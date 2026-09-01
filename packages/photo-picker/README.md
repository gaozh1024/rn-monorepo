# @gaozh1024/photo-picker

Permissionless Android system media selection for Expo and React Native.

## Android behavior

The native module selects the backend before launching the activity:

| Android/device capability                                       | Backend                                                         | User-visible UI                                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Android 13+ with the OS Photo Picker available                  | `android-photo-picker` / `android.provider.action.PICK_IMAGES`  | Android Photo Picker, including the `所有照片` / `相册` layout shown in the reference image |
| Android 12 and below, or a device without a usable Photo Picker | `android-open-document` / `android.intent.action.OPEN_DOCUMENT` | Android DocumentsUI file picker                                                             |

The Photo Picker is provided by the OS or OEM. Its colors, labels, tabs, privacy banner, album presentation, and exact layout are not controlled by this package. The reference image is therefore a device smoke-test target, not a drawable screen that the library can reproduce pixel-for-pixel.

The package does not declare or request `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, or `READ_MEDIA_VISUAL_USER_SELECTED`. It returns the URIs selected in the current picker session and copies them into the app cache. It does not enumerate the device media library.

The Android 14 limited-library permission flow is intentionally out of scope for this API. A future library-access capability must be a separate permission and MediaStore API; it must not change the meaning of `pickMedia()`.

## Usage

```tsx
import { PhotoAlbumScreen } from '@gaozh1024/photo-picker';

// Keep the existing route name if migrating from photo-album-picker.
<Stack.Screen name="PhotoAlbum" component={PhotoAlbumScreen} />;
```

`PhotoAlbumScreen` preserves the existing selection, crop, callback, and upload flow. For custom flows, use the exported `pickMedia` API, the callback registry, and `PhotoCropScreen`.

`maxSelection` must be a positive integer after normalization. The JavaScript flow does not impose the old arbitrary limit of `100`. The Android Photo Picker may reject a request above the OS-supported multi-select limit with `PICKER_SELECTION_LIMIT_UNSUPPORTED`; the caller should reduce the requested limit or use a compatible device/backend. Crop mode always selects one image.

## Result and diagnostics

`pickMedia()` resolves with:

```ts
{
  cancelled: boolean;
  assets: PhotoAlbumItem[];
  source?: 'android-photo-picker' | 'android-open-document';
  action?: string;
}
```

`source` and `action` describe the backend that actually handled the request. A cancellation is still a successful result and should be checked through `cancelled`; it may include the same backend diagnostics. For selected assets, `source` is also retained on each asset.

Native failures expose a stable `code` recognized by `isPhotoPickerNativeError`:

- `PICKER_BUSY`: another picker request is already in flight; allow it to finish before retrying.
- `PICKER_LAUNCH_FAILED`: the resolved activity could not be started; report the error and inspect the device/provider configuration.
- `PICKER_SELECTION_LIMIT_UNSUPPORTED`: the requested multi-select limit exceeds the Photo Picker capability; reduce `maxSelection`.

Unknown native/provider failures remain ordinary `Error` values. A failed selection/materialization must not be treated as a successful asset result.

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
4. The app's merged manifest contains no media-read permission added by this package, and no runtime media permission prompt appears.

Record the device model, Android version, selected backend, action, and error code for every failure. Do not use the appearance of a limited-library banner as proof of this package's `pickMedia()` behavior; limited-library support is a separate future capability.
