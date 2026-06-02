# @gaozh1024/rn-observatory 0.5.2 Release Notes

## Summary

`0.5.2` fixes a Metro runtime failure in React Native apps that do not install Expo modules.

The SDK no longer auto-requires `expo-constants`. This keeps `expo-constants` optional instead of making Metro resolve it from `rn-observatory` internals.

## What Changed

- Removed the SDK runtime fallback that attempted `require('expo-constants')`.
- Kept `resolveExpoAppMetadata(constants)` for apps that explicitly import and pass Expo Constants.
- Kept automatic metadata resolution through the bundled React Native native metadata module.
- Updated docs to avoid implying that Expo Constants are read automatically by the SDK package.

## Upgrade Notes

Apps using Expo can choose one of these approaches:

1. Pass `appId`, `appVersion`, and `buildNumber` directly to `AppObservatoryProvider`.
2. Import `expo-constants` in app code and pass it to `resolveExpoAppMetadata(Constants)` before configuring the provider.

Non-Expo React Native apps do not need to install `expo-constants`.

## Verification

Validated with:

```bash
pnpm --dir packages/rn-observatory test
pnpm --dir packages/rn-observatory typecheck
pnpm --dir packages/rn-observatory build
```
