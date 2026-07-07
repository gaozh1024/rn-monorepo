# rn-kit 0.6.3 Publish Checklist

Date: 2026-07-07

## Package

- Package: `@gaozh1024/rn-kit`
- Version: `0.6.3`
- Access: public
- Publish order: single-package patch release

## Release Scope

- `AppTextarea` adds a semantic multiline text-entry component for notes, comments, descriptions, and chat drafts.
- `AppInput textarea` adds an explicit lower-level textarea mode without changing legacy `multiline` behavior.
- AppInput focus styling now keeps border width stable across focus and blur.
- README, public API docs, changelog, release notes, and AI usage guidance are updated for textarea usage.

## Version Checklist

- [x] `packages/rn-kit/package.json` version is `0.6.3`.
- [x] `packages/rn-kit/CHANGELOG.md` includes `0.6.3`.
- [x] `docs/release-notes/rn-kit-0.6.3.md` exists.
- [x] `docs/README.md` links this release note and checklist.
- [x] `packages/rn-kit/README.md` documents `AppTextarea` and `AppInput textarea`.
- [x] `docs/02-架构设计/公共API清单.md` includes `AppTextarea` and `AppTextareaProps`.
- [x] `packages/rn-kit/AI_USAGE.md` and `packages/rn-kit/ai-manifest.json` are regenerated from `ai/overrides/rn-kit.json`.

## Verification

- [x] `../../node_modules/.bin/vitest run src/ui/__tests__/form/AppInput.test.tsx src/ui/__tests__/form/AppTextarea.test.tsx`
- [x] `../../node_modules/.bin/vitest run`
- [x] `./node_modules/.bin/tsc --noEmit -p packages/rn-kit/tsconfig.json`
- [x] `node scripts/check-ai-artifacts.mjs`
- [x] `git diff --check`
- [x] `../../node_modules/.bin/tsup --config tsup.config.ts`
- [x] `npm_config_cache=/tmp/rn-kit-npm-cache npm pack --dry-run --json`

## Dry-run Evidence

- `@gaozh1024/rn-kit@0.6.3` dry-run completed with `21` files.
- The dry-run package includes generated `dist/index.d.ts`, `dist/index.d.mts`, CJS/ESM bundles, Web bundles, README, AI usage, and manifest artifacts.
- Pre-publish registry check: `npm view @gaozh1024/rn-kit version` returns `0.6.2`; `npm view @gaozh1024/rn-kit@0.6.3 version` returns `E404`, so `0.6.3` is available for publish.

## Publish Command

```bash
cd packages/rn-kit
npm publish --access public
```

## Post-publish Verification

```bash
npm view @gaozh1024/rn-kit@0.6.3 version
npm view @gaozh1024/rn-kit@0.6.3 peerDependencies --json
```

Expected results:

- `@gaozh1024/rn-kit@0.6.3` resolves to `0.6.3`.
- Peer dependency ranges remain compatible with Expo SDK 54 and SDK 55.
