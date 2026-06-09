# @gaozh1024/photo-album-picker AI Usage

## What It Is

Photo album picker package for Expo or React Native apps with grid selection, fullscreen preview, and optional crop flow.

## When To Use

- Use this package when the app needs a reusable album selection flow for chat attachments, avatar cropping, or publishing flows.
- Use PhotoAlbumButton for fast integration when a single button entry is enough.
- Use the screen components and route constants when the app wants the full packaged album and crop experience.

## When Not To Use

- Do not use this package if the app only needs a trivial one-off media picker without shared album or crop flow.
- Do not assume the package handles media upload; it only manages selection, preview, and crop flow.
- Do not manually upgrade Expo media packages to versions outside the current Expo SDK baseline.

## Recommended Entry

- Register PhotoAlbumScreen and PhotoCropScreen in navigation before using the button entry.
- Prefer PhotoAlbumButton for standard business flows and route-level components for customized navigation control.
- Use routeNames override only when the consuming app cannot use MEDIA_PICKER_ROUTES.

## Install Prerequisites

- Install command: pnpm add @gaozh1024/photo-album-picker
- Peer dependencies: @gaozh1024/rn-kit, @react-navigation/native, @shopify/flash-list, expo, expo-image, expo-image-manipulator, expo-media-library, react, react-native, react-native-gesture-handler, react-native-reanimated, react-native-safe-area-context, react-native-zoom-toolkit

## Required Project Setup

- Install rn-kit, @react-navigation/native, react-native-zoom-toolkit, and the listed Expo media dependencies.
- Install Expo-managed native packages with expo install so versions match the current SDK, including @shopify/flash-list.
- Configure expo-media-library permissions in app.json or app.config.ts and regenerate native projects when using prebuild/dev build.

## Minimal Working Example

- album-button-entry: packages/photo-album-picker/src/components/PhotoAlbumButton.tsx
- album-screen: packages/photo-album-picker/src/screens/PhotoAlbumScreen.tsx

## Canonical Patterns

- Prefer the stable public API `MEDIA_PICKER_ROUTES` when it matches the use case.
- Prefer the stable public API `PhotoAlbumButton` when it matches the use case.
- Prefer the stable public API `PhotoAlbumGrid` when it matches the use case.
- Prefer the stable public API `usePhotoAlbum` when it matches the use case.
- Prefer the stable public API `PhotoAlbumScreen` when it matches the use case.
- Prefer the stable public API `PhotoCropScreen` when it matches the use case.
- Prefer the stable public API `normalizeOpenOptions` when it matches the use case.
- Prefer the stable public API `createCroppedPhotoAlbumItem` when it matches the use case.

## Anti-Patterns

- Using npm latest to install expo-image-manipulator or @shopify/flash-list in an Expo project instead of expo install.
- Opening crop flow without registering PhotoCropScreen.
- Expecting this package to upload or persist selected media on behalf of the business app.

## Common Failure Cases

- Crop flow fails when expo-image-manipulator drifts outside the host Expo SDK's compatible major.
- Album access fails because expo-media-library plugin permissions were not configured.
- Navigation-based flows break because album and crop routes were not registered in the app navigator.

## Compatibility Baseline

- Current package guidance covers Expo SDK 54 and 55 when Expo media packages are installed with expo install.
- Expo SDK 54 uses expo-image-manipulator 14.x; Expo SDK 55 uses the SDK 55 package line.
- FlashList is an Expo-managed native dependency; install it with expo install so SDK 54 and SDK 55 projects receive the bundled version.
- The package depends on rn-kit and React Navigation being present in the consuming app.
- Crop mode automatically constrains mediaType and selection count to a single photo.

## See Also

- README.md
- AI_USAGE.md
