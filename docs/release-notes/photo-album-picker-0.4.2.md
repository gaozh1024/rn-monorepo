# @gaozh1024/photo-album-picker 0.4.2 Release Notes

`0.4.2` hardens the custom album picker for Android 14/15 limited photo and video access.

## Changes

- Treat `accessPrivileges: 'limited'` as valid media access and continue showing the custom album grid with the system-approved media set.
- Request only photo and video permissions, never audio.
- Add a non-blocking limited-access banner with a system `管理照片` action that lets users update their approved media set.
- Prevent a failed permission query or media-library request from continuing into `getAssetsAsync`.
- Keep individual unreadable thumbnails selectable and previewable by rendering a cell-level fallback instead of unmounting the album grid.
- Add `onError` to `PhotoAlbumGrid` for recoverable permission, access-management, and media-query failures.

## Upgrade

```bash
pnpm add @gaozh1024/photo-album-picker@^0.4.2
npx expo install --check
```

For Android 14/15 validation, test both full and limited photo/video access on a signed release build. The package preserves the custom grid, multi-select, video preview, and crop flows; it does not switch to the system Photo Picker.
