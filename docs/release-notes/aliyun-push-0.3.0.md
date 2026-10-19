# @gaozh1024/aliyun-push 0.3.0 Release Notes

`0.3.0` widens the peer dependency ranges to cover Expo SDK 57 / React Native 0.86 (same compatibility round as `rn-kit 0.7.0`; prerequisite of the Wudi Expo SDK 55 → 57 upgrade, see wudi `docs/开发设计/38-Expo-SDK57升级设计方案.md` §4.2/§6.1).

## Breaking Changes

**None.** Minor release: no public API was removed, renamed, or changed. Peer range widening is a compatibility extension — existing Expo SDK 54 / 55 projects keep working without code changes.

## What Changed

- Peer dependencies widened (upper bounds only; lower bounds unchanged):
  - `expo`: `>=54 <56` → `>=54 <58`
  - `react-native`: `>=0.81 <0.84` → `>=0.81 <0.87`
- Dependency widened:
  - `@expo/config-plugins`: `>=54 <56` → `>=54 <58`
- No runtime code changes.

## Verification Baseline

- Package-level: `typecheck` / `vitest` / `tsup` build all green on the SDK 55 devDependencies in this repo.
- SDK 57 / RN 0.86.3 native compatibility (AliyunPush pod + plugin) is verified on the Wudi side at milestones M2 (native build) / M3 (device regression) — no real-device evidence at publish time.

## Upgrade

```bash
npm install @gaozh1024/aliyun-push@^0.3.0
```
