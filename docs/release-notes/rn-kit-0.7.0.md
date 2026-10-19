# @gaozh1024/rn-kit 0.7.0 Release Notes

`0.7.0` widens the `rn-kit` peer dependency ranges to cover Expo SDK 57 / React Native 0.86, and folds the `runOnJS` gesture fix into the published bundles so consumers no longer need a patch file.

## Breaking Changes

**None.** This is a minor release: no public API was removed, renamed, or changed. The peer range widening is a compatibility extension — existing Expo SDK 54 / 55 projects keep working without code changes.

## What Changed

- Peer dependencies widened (upper bounds only; lower bounds unchanged):
  - `expo`: `>=54 <56` → `>=54 <58`
  - `react-native`: `>=0.81 <0.84` → `>=0.81 <0.87`
  - `expo-image`: `>=3 <56` → `>=3 <58`
  - `expo-linear-gradient`: `>=15 <56` → `>=15 <58`
- The `runOnJS(true)` gesture fix (`bf35abe`) is now part of the shipped CJS / ESM / Web bundles. Source behaviour is identical to `0.6.6` + the previous patch file, so consumers who patched `0.6.6` can drop `patches/@gaozh1024+rn-kit+0.6.6.patch`.
- No build configuration changes; `index.web.js` remains an intentionally built but unexported artifact.

## Upgrade

```bash
pnpm add @gaozh1024/rn-kit@^0.7.0
npx expo install --check
```

If you previously applied a local patch for the `runOnJS` gesture issue, remove it before installing:

```bash
git rm patches/@gaozh1024+rn-kit+0.6.6.patch   # adjust path to your repo layout
pnpm install
```

## Compatibility Notes

- **Verified — repository baseline: Expo SDK 55 / RN 0.83** (`react-native@0.83.6` is this repo's devDependency line). `typecheck`, the full test suite (108 files / 549 tests) and the `dist` build pass on that line.
- **Declared but not re-verified here: Expo SDK 54 / RN 0.81** — the lower bound is unchanged from `0.6.x`. Nothing was removed, so the range still holds it, but this release adds no new evidence for that line.
- **Range opened, device regression pending: Expo SDK 57 / RN 0.86** — this is the line `0.7.0` exists to unblock. The device regression (PageDrawer / BottomSheetModal dismiss, SwipeActionRow swipe, worklet warnings) runs on the consumer side **after** `0.7.0` is published; it is not a pre-publish proof. See the publish checklist, §mobile 侧联动.
- **Not verified: Expo SDK 56 / RN 0.85** falls inside the declared peer range but has no test evidence. Projects on that line upgrade at their own risk; report any issue and it will be handled in a follow-up patch.
- `@expo/vector-icons` / `react-native-svg` upper bounds are unchanged in this release. Their SDK 57 line will be confirmed after `expo install --fix` resolves actual versions on the consumer side.

## Verification

- `pnpm --filter @gaozh1024/rn-kit typecheck`
- `pnpm --filter @gaozh1024/rn-kit test` — 108 files / 549 tests pass on Expo SDK 55 / RN 0.83
- `pnpm --filter @gaozh1024/rn-kit build` — `runOnJS(true)` present ≥ 2 times in each of `dist/index.js`, `dist/index.mjs`, `dist/index.web.mjs`
