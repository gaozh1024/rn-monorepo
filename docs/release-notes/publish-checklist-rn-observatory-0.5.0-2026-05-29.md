# rn-observatory 0.5.0 Publish Checklist

Date: 2026-05-29

## Package

- Package: `@gaozh1024/rn-observatory`
- Version: `0.5.0`
- Access: public

## Release Scope

- Public event taxonomy exports
- Taxonomy sync / verification scripts
- Release metadata and source map workflow docs
- App metadata guidance for `appId`, `appVersion`, and `buildNumber`
- Maintainer governance for Analytics, Release / Symbolication, and Crash / Alerts

## Completed Verification

- [x] `pnpm ai:check`
- [x] `pnpm --dir packages/rn-observatory verify:taxonomy`
- [x] `pnpm --dir packages/rn-observatory test`
- [x] `pnpm --dir packages/rn-observatory typecheck`
- [x] `pnpm --dir packages/rn-observatory build`
- [x] `npm_config_cache=/tmp/rn-observatory-npm-cache npm pack --dry-run`

## Notes

- `verify:taxonomy` verified the local SDK contract and skipped cross-repo `app-observatory` verification because `/Users/gzh/Projects/framework/app-observatory` was not available in this workspace.
- `npm pack --dry-run` produced `gaozh1024-rn-observatory-0.5.0.tgz`.
- Dry-run package size: `73.2 kB`.
- Dry-run unpacked size: `316.7 kB`.
- Dry-run file count: `30`.

## Publish Command

```bash
pnpm --dir packages/rn-observatory publish --access public
```

If publishing through Changesets instead, confirm only intended packages are versioned, then run:

```bash
pnpm changeset status
pnpm release
```
