# Publish Checklist — 2026-05-19

Scope:

- `@gaozh1024/rn-kit@0.5.3`
- `@gaozh1024/rn-health@0.2.0`
- `apps/app-health` self-hosted service/admin stack, documented as App Health 0.2.0

## Registry status

- npm registry currently has `@gaozh1024/rn-kit@0.5.2`; local `0.5.3` is the next publish candidate.
- npm registry does not currently have `@gaozh1024/rn-health`; local `0.2.0` is a first-publish candidate.

## Required local verification

Run before publishing:

```bash
pnpm ai:check
pnpm verify:release
pnpm verify:app-health
pnpm smoke:app-health
```

Already completed in this workspace on 2026-05-19:

- [x] `pnpm ai:check`
- [x] `pnpm verify:release`
- [x] `pnpm verify:app-health`
- [x] `pnpm smoke:app-health`
- [x] OpenAPI YAML parse: `paths=29 schemas=56`
- [x] `git diff --check`
- [x] `npm pack --dry-run` for `@gaozh1024/rn-kit@0.5.3`
- [x] `npm pack --dry-run` for `@gaozh1024/rn-health@0.2.0`

## Package dry-run commands

```bash
cd packages/rn-kit
npm pack --dry-run

cd ../rn-health
npm pack --dry-run
```

Expected:

- `rn-kit` includes `dist`, `bin`, `init-ai`, docs, README, AI artifacts, and license.
- `rn-health` includes `dist`, README, AI artifacts, changelog, and license.

## Publish commands

Only run after final review/commit/tag decision:

```bash
cd packages/rn-kit
npm publish --access public

cd ../rn-health
npm publish --access public
```

Alternative workspace release command exists:

```bash
pnpm release
```

Use with care because it runs workspace build and `changeset publish` across publishable packages.

## App Health deploy reminder

`apps/app-health` is not an npm package. Release it by deploying service/admin artifacts:

1. Build service image/binary.
2. Run `app-health-migrate up` against PostgreSQL.
3. Deploy `app-health-service`.
4. Deploy `admin/` static assets with `VITE_APP_HEALTH_API_BASE_URL` set to the service URL.
5. Run `/healthz`, `/readyz`, login, and at least one ingest smoke in the target environment.

## Known non-blocking gaps

- Source-map symbolication.
- Alert retry/outbox.
- Retention archive/export before deletion.
- RBAC/SSO.
- Retention scheduler.
