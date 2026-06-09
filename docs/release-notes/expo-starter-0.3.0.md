# @gaozh1024/expo-starter 0.3.0 Release Notes

`0.3.0` moves the starter template to Expo SDK 55 / React Native 0.83 for new Panther apps.

## What Changed

- Expo baseline moves to `~55.0.26`.
- React moves to `19.2.0`.
- React Native moves to the SDK 55 RN 0.83 line.
- Expo SDK packages such as `expo-image`, `expo-linear-gradient`, `expo-secure-store`, and `expo-status-bar` move to the SDK 55 package line.
- Reanimated and Worklets move to SDK 55-compatible versions.
- `@gaozh1024/hot-updater` is included so OTA helper scripts work out of the box.
- Default scripts now cover env switching, `expo run`, Android release builds, web export builds, OTA manifest generation, and rn-observatory sourcemap publishing.
- Placeholder `.env.local.dev`, `.env.local.server`, and `.env.production` files are included for script discoverability.
- Android template package identity is aligned with `app.json`.

## Existing Apps

Existing Expo SDK 54 apps do not need to adopt this starter baseline just to upgrade `rn-kit`. They should keep SDK 54 native dependencies and validate with:

```bash
npx expo install --check
```
