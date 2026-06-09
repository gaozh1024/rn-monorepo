# @gaozh1024/photo-album-picker 0.4.0 Release Notes

`0.4.0` adds Expo SDK 55 compatibility while preserving the Expo SDK 54 integration path.

## Changes

- Peer dependencies now cover Expo `>=54 <56` and React Native `>=0.81 <0.84`.
- Development dependencies move to Expo SDK 55, React `19.2.0`, and React Native `0.83.6`.
- Expo media dependencies are validated against the SDK 55 package line.
- FlashList is documented as an Expo-managed native dependency and should be installed with `npx expo install`.
- README, AI usage, manifest, and changelog now document the SDK 54/55 split explicitly.

## Compatibility

Expo SDK 54 projects should keep SDK 54 native package versions and run `npx expo install --check` after upgrading. Expo SDK 55 projects should use the SDK 55 media package line selected by Expo.
