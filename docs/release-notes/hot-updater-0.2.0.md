# @gaozh1024/hot-updater 0.2.0 Release Notes

`0.2.0` aligns the hot updater package with the Expo SDK 55 framework upgrade.

## Changes

- React Native peer compatibility now covers `>=0.81 <0.84`.
- Development dependencies move to React `19.2.0` and React Native `0.83.6`.
- `@hot-updater/expo` is updated to the current SDK 55-compatible line.

## Compatibility

Existing Expo SDK 54 / React Native 0.81 projects can remain on their app baseline while adopting this package version. Expo SDK 55 apps should rebuild their native runtime after updating hot update native integration packages.
