# @gaozh1024/rn-kit 0.6.0 Release Notes

`0.6.0` adds Expo SDK 55 / React Native 0.83 support while keeping Expo SDK 54 / React Native 0.81 projects on the latest framework line.

## What Changed

- `rn-kit` peer dependencies now cover Expo `>=54 <56` and React Native `>=0.81 <0.84`.
- The framework development baseline moves to Expo SDK 55.
- `react-native-svg` is now treated as an Expo-managed peer dependency to avoid duplicate native package versions in SDK 55 projects.
- `react-native-worklets` guidance now distinguishes SDK 54 `0.5.x` from SDK 55 `0.7.x`.
- `expo-starter` moves to Expo SDK 55 as the new-project template baseline.
- Same-repo companion packages have widened compatibility ranges where they are part of the starter ecosystem.

## Upgrade Guidance

For Expo SDK 55 projects, use the refreshed starter or run:

```bash
npx expo install --fix
npx expo-doctor
```

For Expo SDK 54 projects, upgrade `rn-kit` but keep SDK 54 native packages:

```bash
pnpm add @gaozh1024/rn-kit@^0.6.0
npx expo install --check
```

Do not mix Expo SDK 54 apps with Expo SDK 55 native package lines.
