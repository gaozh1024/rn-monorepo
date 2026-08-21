# @gaozh1024/photo-picker

Permissionless Android media selection for Expo and React Native.

The package opens the Android system picker instead of enumerating the media library. It does not declare `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, or `READ_MEDIA_*` permissions.

## Usage

```tsx
import { PhotoAlbumScreen } from '@gaozh1024/photo-picker';

// Keep the existing route name if migrating from photo-album-picker.
<Stack.Screen name="PhotoAlbum" component={PhotoAlbumScreen} />;
```

`PhotoAlbumScreen` keeps the existing selection, crop, callback, and upload flow while the picker UI is provided by the operating system. The exported `openPhotoPicker`, callback registry, and `PhotoCropScreen` APIs are available for custom flows.

## Local Yalc development

From this package directory:

```sh
pnpm build
pnpm exec yalc publish --push
```

In the application:

```sh
pnpm exec yalc add @gaozh1024/photo-picker
```

Because the package contains native Android code, reinstall/rebuild the application after updating the Yalc package. An OTA JavaScript update is not enough to install the native module.
