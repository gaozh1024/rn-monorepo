# @gaozh1024/photo-picker 0.4.0 Release Notes

`0.4.0` widens the peer dependency ranges to cover Expo SDK 57 / React Native 0.86 (same compatibility round as `rn-kit 0.7.0`; prerequisite of the Wudi Expo SDK 55 → 57 upgrade, see wudi `docs/开发设计/38-Expo-SDK57升级设计方案.md` §4.2/§6.1). This release also clears the `release/holds.json` entry that deferred the package line.

## Breaking Changes

**None.** Minor release: no public API was removed, renamed, or changed. Peer range widening is a compatibility extension — existing Expo SDK 55 projects keep working without code changes.

## What Changed

- Peer dependencies widened (upper bounds only; lower bounds unchanged):
  - `expo-modules-core`: `>=55 <56` → `>=55 <58`
  - `expo-image`: `>=3 <56` → `>=3 <58`
  - `expo-image-manipulator`: `>=14 <56` → `>=14 <58`
  - `react-native`: `>=0.81 <0.84` → `>=0.81 <0.87`
- No runtime code changes.

## Verification Baseline

- Package-level: `typecheck` / `vitest` / `tsup` build all green on the SDK 55 devDependencies in this repo.
- SDK 57 / RN 0.86.3 native compatibility (Android Photo Picker / iOS PHPicker module) is verified on the Wudi side at milestones M2 / M3 — no real-device evidence at publish time.

## Upgrade

Wudi mobile consumes this package via `yalc` (`file:.yalc/@gaozh1024/photo-picker`); after this publish, run `yalc push` from this repo and reinstall in the app.
