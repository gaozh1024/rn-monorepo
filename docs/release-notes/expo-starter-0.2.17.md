# @gaozh1024/expo-starter 0.2.17 Release Notes

发布日期：2026-05-23

`0.2.17` updates the starter template to the latest `rn-kit` baseline and refreshes the template guidance so new apps follow the current recommended root wiring.

## Changes

- Upgrade template dependency from `@gaozh1024/rn-kit ^0.5.0` to `@gaozh1024/rn-kit ^0.5.4`.
- Refresh the template README to document the current Expo SDK 54 / React Native 0.81 baseline together with the latest `AppProvider` usage guidance.
- Clarify that the template already follows the current root composition pattern: `AppProvider -> AppProviders -> RootApp`.

## Verification

- `pnpm --dir templates/expo-starter lint`
- `npm pack --dry-run` in `templates/expo-starter`
