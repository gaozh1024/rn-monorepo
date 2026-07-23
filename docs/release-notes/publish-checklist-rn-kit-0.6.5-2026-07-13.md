# rn-kit 0.6.5 Publish Checklist

Date: 2026-07-13

## Package

- Package: `@gaozh1024/rn-kit`
- Version: `0.6.5`
- Access: public
- Publish order: single-package patch release

## Release Scope

- Fix Native `dismissKeyboardOnPressOutside` focus cancellation by removing the native full-screen `TouchableWithoutFeedback` wrapper path.
- Preserve Web outside-press keyboard dismissal and editable-target focus protection.
- Preserve Native scroll/list keyboard tap handling through `keyboardShouldPersistTaps="handled"`.
- Update README, changelog, release notes, and AI manifest artifacts for `0.6.5`.

## Version Checklist

- [x] `packages/rn-kit/package.json` version is `0.6.5`.
- [x] `packages/rn-kit/CHANGELOG.md` includes `0.6.5`.
- [x] `docs/release-notes/rn-kit-0.6.5.md` exists.
- [x] `docs/README.md` links this release note and checklist.
- [x] `packages/rn-kit/ai-manifest.json` is regenerated with version `0.6.5`.

## Verification

- [x] `pnpm --filter @gaozh1024/rn-kit test -- src/ui/__tests__/layout/SafeScreen.test.tsx src/ui/__tests__/primitives/KeyboardDismissView.test.tsx src/ui/__tests__/primitives/AppScrollView.test.tsx src/ui/__tests__/primitives/AppFlatList.test.tsx src/ui/__tests__/components/AppList.test.tsx`
- [x] `pnpm --filter @gaozh1024/rn-kit test`
- [x] `pnpm --filter @gaozh1024/rn-kit typecheck`
- [x] `pnpm ai:check`
- [x] `git diff --check`
- [x] `pnpm --filter @gaozh1024/rn-kit build`
- [x] `npm_config_cache=/tmp/rn-kit-npm-cache npm pack --dry-run --json`
- [x] `npm view @gaozh1024/rn-kit@0.6.5 version`

## Verification Evidence

- Focused keyboard-dismiss command passed and, under the current pnpm/vitest argument handling, executed the full rn-kit suite: 103 files, 509 tests.
- Full rn-kit test suite passed: 103 files, 509 tests.
- Typecheck passed: `tsc --noEmit`.
- AI artifact check passed: `AI artifacts are up to date.`
- `git diff --check` passed with no whitespace errors.
- Build passed: CJS, ESM, Web bundles, and DTS generated successfully.
- Dry-run package: `@gaozh1024/rn-kit@0.6.5`, 21 files, shasum `3786d17d03aa02b31b4569f526e931ed3bc84c63`.
- Pre-publish registry check: `npm view @gaozh1024/rn-kit@0.6.5 version` returns `E404`, so `0.6.5` is available for publish.
- Ralph post-deslop regression passed: full rn-kit tests, typecheck, AI artifact check, build, `git diff --check`, and pack dry-run were rerun successfully after the scoped cleanup review.

## Publish Command

```bash
cd packages/rn-kit
npm publish --access public
```

## Post-publish Verification

```bash
npm view @gaozh1024/rn-kit@0.6.5 version
npm view @gaozh1024/rn-kit@0.6.5 peerDependencies --json
```
