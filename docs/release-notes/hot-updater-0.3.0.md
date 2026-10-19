# @gaozh1024/hot-updater 0.3.0 Release Notes

`0.3.0` widens the peer dependency ranges to cover Expo SDK 57 / React Native 0.86 (same compatibility round as `rn-kit 0.7.0`; prerequisite of the Wudi Expo SDK 55 → 57 upgrade, see wudi `docs/开发设计/38-Expo-SDK57升级设计方案.md` §4.2/§6.1).

## Breaking Changes

**None.** Minor release: no public API was removed, renamed, or changed. Peer range widening is a compatibility extension — existing Expo SDK 54 / 55 projects keep working without code changes.

## What Changed

- Peer dependencies widened (upper bounds only; lower bounds unchanged):
  - `react-native`: `>=0.81 <0.84` → `>=0.81 <0.87`
- No runtime code changes. Upstream `@hot-updater/react-native` peer range (`>=0.28 <0.31`) is unchanged; upstream declares `react-native: *` so it does not block RN 0.86.

## Verification Baseline

- Package-level: `typecheck` / `vitest` / `tsup` build all green on the SDK 55 devDependencies in this repo.
- Fingerprint / OTA behaviour on the new native baseline is verified on the Wudi side (§6.4 item 9 and acceptance item 10 of the upgrade plan).

## Upgrade

```bash
npm install @gaozh1024/hot-updater@^0.3.0
```
