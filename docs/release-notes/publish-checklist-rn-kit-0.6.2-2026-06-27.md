# rn-kit 0.6.2 Publish Checklist

Date: 2026-06-27

## Package

- Package: `@gaozh1024/rn-kit`
- Version: `0.6.2`
- Access: public
- Publish order: single-package patch release

## Release Scope

- `AppButton` adds design-spec style hooks, icon slots, custom content rendering, and `surface` / `soft` variants.
- `AppInput` adds focus styling APIs, visual variants, fixed sizes, and `soft-login` / `surface` presets.
- Theme creation adds outline/surface/primary-fixed color tokens, `radii`, `shadows`, and typography tokens.
- `Icon` adds `IconName` typing and snake_case-to-kebab-case compatibility.
- Root and UI/theme barrel exports expose the new public types.
- README, public API docs, AI usage artifacts, changelog, and release notes are updated for the new component APIs.

## Version Checklist

- [x] `packages/rn-kit/package.json` version is `0.6.2`.
- [x] `packages/rn-kit/CHANGELOG.md` includes `0.6.2`.
- [x] `docs/release-notes/rn-kit-0.6.2.md` exists.
- [x] `docs/README.md` links this release note and checklist.
- [x] `packages/rn-kit/README.md` documents the new `AppButton`, `AppInput`, theme, and `Icon` APIs.
- [x] `docs/02-架构设计/公共API清单.md` includes the new stable public types.
- [x] `packages/rn-kit/AI_USAGE.md` and `packages/rn-kit/ai-manifest.json` are regenerated from `ai/overrides/rn-kit.json`.

## Verification

- [x] `../../node_modules/.bin/vitest run src/ui/__tests__/composables/AppButton.test.tsx src/ui/__tests__/form/AppInput.test.tsx src/ui/__tests__/components/Icon.test.tsx src/theme/__tests__/create-theme.test.ts src/theme/__tests__/tokens.test.ts`
- [x] `./node_modules/.bin/tsc --noEmit -p packages/rn-kit/tsconfig.json`
- [x] `node scripts/check-ai-artifacts.mjs`
- [x] `../../node_modules/.bin/tsup --config tsup.config.ts`
- [x] `git diff --check`
- [x] `npm_config_cache=/tmp/rn-kit-npm-cache npm pack --dry-run --json`

## Dry-run Evidence

- `@gaozh1024/rn-kit@0.6.2` dry-run completed with `21` files.
- The dry-run package includes generated `dist/index.d.ts`, `dist/index.d.mts`, CJS/ESM bundles, Web bundles, README, AI usage, and manifest artifacts.

## Publish Command

```bash
cd packages/rn-kit
npm publish --access public
```

## Post-publish Verification

```bash
npm view @gaozh1024/rn-kit@0.6.2 version
npm view @gaozh1024/rn-kit@0.6.2 peerDependencies --json
```

Expected results:

- `@gaozh1024/rn-kit@0.6.2` resolves to `0.6.2`.
- Peer dependency ranges remain compatible with Expo SDK 54 and SDK 55.

## Compatibility Notes

- `rn-kit 0.6.2` stays in the `0.6.x` line and supports both Expo SDK 54 and SDK 55 projects.
- Existing `AppButton` solid/outline/ghost usage remains compatible.
- Existing `AppInput` `containerStyle` / `inputStyle` usage remains compatible.
- New theme tokens are additive and do not require consuming apps to change existing theme configs.
