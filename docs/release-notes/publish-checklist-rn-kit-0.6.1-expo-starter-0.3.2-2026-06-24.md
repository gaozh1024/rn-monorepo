# rn-kit 0.6.1 + expo-starter 0.3.2 Publish Checklist

Date: 2026-06-24

## Packages

- Package: `@gaozh1024/rn-kit`
- Version: `0.6.1`
- Access: public
- Package: `@gaozh1024/expo-starter`
- Version: `0.3.2`
- Access: public
- Publish order: publish `rn-kit` first, then `expo-starter`

## Release Scope

- `rn-kit` fixes device-specific blank space above bottom tabs by separating tab content height from the bottom safe-area spacer.
- `rn-kit` exports `useAppSafeAreaInsets()`, `useBottomTabBarMetrics()`, `BottomTabBarMetrics`, `UseBottomTabBarMetricsOptions`, and `DEFAULT_BOTTOM_TAB_BAR_HEIGHT`.
- `rn-kit` ignores `style.height` on tab bar styles; apps should use `height` / `tabBarOptions.height` for the content row.
- `expo-starter` bumps its template version to `0.3.2`.
- `expo-starter` bumps its framework dependency to `@gaozh1024/rn-kit ^0.6.1`.
- `expo-starter` documents that tab root pages using `AppScreen` should pass `bottom={false}` because `BottomTabBar` owns the bottom safe area.
- `expo-starter` refreshes AI usage artifacts for the updated template guidance.

## Version Checklist

- [x] `packages/rn-kit/package.json` version is `0.6.1`.
- [x] `templates/expo-starter/package.json` version is `0.3.2`.
- [x] `templates/expo-starter/app.json` version is `0.3.2`.
- [x] `templates/expo-starter/package.json` depends on `@gaozh1024/rn-kit ^0.6.1`.
- [x] `pnpm-lock.yaml` template importer uses `@gaozh1024/rn-kit ^0.6.1`.
- [x] `docs/release-notes/rn-kit-0.6.1.md` exists.
- [x] `docs/release-notes/expo-starter-0.3.2.md` exists.
- [x] `docs/README.md` links this publish checklist.

## Completed Verification

- [x] `pnpm --dir packages/rn-kit exec vitest run src/navigation/__tests__/navigators.test.tsx --maxWorkers=1 --no-file-parallelism`
- [x] `pnpm --dir packages/rn-kit exec vitest run src/navigation/__tests__/BottomTabBar.test.tsx --maxWorkers=1 --no-file-parallelism`
- [x] `pnpm --dir packages/rn-kit exec vitest run src/ui/__tests__/layout/SafeScreen.test.tsx --maxWorkers=1 --no-file-parallelism`
- [x] `pnpm --dir packages/rn-kit lint`
- [x] `pnpm --dir packages/rn-kit build`
- [x] `pnpm --dir templates/expo-starter lint`
- [x] `pnpm ai:check`
- [x] `git diff --check`
- [x] `npm_config_cache=/tmp/rn-kit-npm-cache npm pack --dry-run --json`
- [x] `npm_config_cache=/tmp/expo-starter-npm-cache npm pack --dry-run --json`

## Dry-run Evidence

- `@gaozh1024/rn-kit@0.6.1` dry-run completed and includes generated `dist/index.d.ts` / `dist/index.d.mts` exports.
- `@gaozh1024/expo-starter@0.3.2` dry-run completed with `78` files, including `app.json`, `package.json`, README, AI artifacts, scripts, and template source.

## Publish Commands

Publish `rn-kit` first:

```bash
cd packages/rn-kit
npm publish --access public
```

Then publish the template:

```bash
cd ../../templates/expo-starter
npm publish --access public
```

## Post-publish Verification

```bash
npm view @gaozh1024/rn-kit@0.6.1 version
npm view @gaozh1024/expo-starter@0.3.2 version
npm view @gaozh1024/expo-starter@0.3.2 dependencies --json
```

Expected results:

- `@gaozh1024/rn-kit@0.6.1` resolves to `0.6.1`.
- `@gaozh1024/expo-starter@0.3.2` resolves to `0.3.2`.
- `@gaozh1024/expo-starter@0.3.2` depends on `@gaozh1024/rn-kit ^0.6.1`.

## Compatibility Notes

- `rn-kit 0.6.1` stays in the `0.6.x` line and supports both Expo SDK 54 and SDK 55 projects.
- `expo-starter 0.3.2` is the new-project template baseline for Expo SDK 55.
- Existing Expo SDK 54 apps can upgrade to `@gaozh1024/rn-kit ^0.6.1` without moving the app template to Expo SDK 55.
- The current template tab root screens do not wrap themselves in `AppScreen`, so no source change is needed there. If a tab root page later uses `AppScreen`, pass `bottom={false}`.
