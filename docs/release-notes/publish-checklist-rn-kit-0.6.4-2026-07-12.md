# rn-kit 0.6.4 Publish Checklist

Date: 2026-07-12

## Package

- Package: `@gaozh1024/rn-kit`
- Version: `0.6.4`
- Access: public
- Publish order: single-package patch release

## Release Scope

- Fix Native `Picker` selected-row text being covered by the opaque selection highlight.
- Apply the same correction to Native `DatePicker`, which reuses `Picker`.
- Add a render-order regression test without changing the public Picker API.

## Version Checklist

- [x] `packages/rn-kit/package.json` version is `0.6.4`.
- [x] `packages/rn-kit/CHANGELOG.md` includes `0.6.4`.
- [x] `docs/release-notes/rn-kit-0.6.4.md` exists.
- [x] `docs/README.md` links this release note and checklist.
- [x] `packages/rn-kit/ai-manifest.json` is regenerated with version `0.6.4`.

## Verification

- [x] `../../node_modules/.bin/vitest run src/ui/__tests__/form/Picker.test.tsx src/ui/__tests__/form/DatePicker.test.tsx`
- [x] `../../node_modules/.bin/vitest run`
- [x] `./node_modules/.bin/tsc --noEmit -p packages/rn-kit/tsconfig.json`
- [x] `node scripts/check-ai-artifacts.mjs`
- [x] `git diff --check`
- [x] `../../node_modules/.bin/tsup --config tsup.config.ts`
- [x] `npm_config_cache=/tmp/rn-kit-npm-cache npm pack --dry-run --json`

## Verification Evidence

- Focused Picker and DatePicker tests passed: 2 files, 15 tests.
- Full rn-kit test suite passed: 103 files, 507 tests.
- Dry-run package: `@gaozh1024/rn-kit@0.6.4`, 21 files, shasum `94f3b6585258571ff6df27e2356f48dd17d5ddce`.
- Pre-publish registry check: `npm view @gaozh1024/rn-kit@0.6.4 version` returns `E404`, so `0.6.4` is available for publish.

## Publish Command

```bash
cd packages/rn-kit
npm publish --access public
```

## Post-publish Verification

```bash
npm view @gaozh1024/rn-kit@0.6.4 version
npm view @gaozh1024/rn-kit@0.6.4 peerDependencies --json
```
