# @gaozh1024/rn-observatory 0.5.1 Release Notes

## Summary

`0.5.1` is a patch release for automatic app metadata. Apps no longer need to pass `appId`, `appVersion`, or `buildNumber` in normal Expo / React Native setups.

## Highlights

- Resolve app id, version, and build number from Expo metadata when available.
- Resolve the same metadata from the bundled React Native native metadata module in bare/native builds.
- Keep explicit `appId`, `appVersion`, and `buildNumber` provider props as compatibility overrides for custom runtimes or unusual build pipelines.
- Publish the native metadata bridge, podspec, and React Native config with the package.
- Update mobile integration examples to keep provider setup focused on endpoint, ingest token, storage, identity, consent, and release metadata.

## Upgrade Notes

No breaking runtime API changes are expected for apps already using `0.5.0`.

Recommended follow-up:

1. Remove hand-maintained `appId`, `appVersion`, and `buildNumber` props when the automatic metadata matches the App Observatory application slug and release metadata.
2. Keep explicit metadata props only when overriding the app framework metadata is intentional.
3. Upgrade template baselines to `@gaozh1024/rn-observatory ^0.5.1`.

## Verification

Validated for release with:

```bash
pnpm --dir packages/rn-observatory test
pnpm --dir packages/rn-observatory typecheck
pnpm --dir packages/rn-observatory build
```
