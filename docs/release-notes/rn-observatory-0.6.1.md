# @gaozh1024/rn-observatory 0.6.1 Release Notes

`0.6.1` is a compatibility patch for the Expo SDK 55 framework upgrade.

## Changes

- React Native peer compatibility now covers `>=0.81 <0.84`, allowing Expo SDK 54 and SDK 55 apps to use the same SDK line.
- The development baseline moves to React `19.2.0` and React Native `0.83.6` for Expo SDK 55 validation.
- Android packaging removes the deprecated manifest `package` attribute and relies on the Gradle namespace.
- SDK metadata tests now read the package version directly so future patch releases do not drift from hard-coded expectations.

## Compatibility

Existing Expo SDK 54 projects can upgrade to `@gaozh1024/rn-observatory ^0.6.1` without moving their app to Expo SDK 55. Expo SDK 55 projects should use the refreshed React Native 0.83 dependency line.
