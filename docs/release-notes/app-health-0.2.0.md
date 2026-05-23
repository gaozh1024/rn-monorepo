# App Health 0.2.0 Release Notes

发布日期：2026-05-19

`App Health 0.2.0` turns the self-hosted backend for `@gaozh1024/rn-observatory` into a usable admin/operations console. The release focuses on application-scoped ingest tokens, password-session admin login, alert rule management, settings visibility, retention safety, and full-stack smoke coverage.

## Highlights

- Added admin password login with signed HttpOnly session cookies while keeping bearer-token compatibility for scripts/private deployments.
- Added application registry and application-scoped ingest tokens. Tokens are shown in plaintext only once at creation time.
- Added application lifecycle controls: create/update/enable/disable/delete registration and explicit app-data deletion with confirmation.
- Added database-backed alert rules with masked webhook URLs, rule CRUD, test delivery, enable/disable, and delivery history.
- Added Settings summary API and UI for service health, redacted runtime configuration, admin/session status, alert status, and retention defaults.
- Added retention dry-run/run APIs, operation history, and a guarded destructive run flow requiring recent dry-run, matching retention days, backup acknowledgement, dry-run acknowledgement, and `DELETE_OLD_EVENTS` confirmation.
- Added full-stack smoke script covering PostgreSQL, migrations, service/admin startup, login/session, app/token flow, ingest, events/issues/stats, alert rules, settings summary, retention dry-run, destructive-run rejection, and logout.

## Backend / Service

- OpenAPI contract now exposes 29 paths and 56 schemas.
- New migrations:
  - `004_create_app_health_alerts.sql`
  - `005_create_app_health_retention_runs.sql`
- New admin APIs:
  - `/api/app-observatory/applications*`
  - `/api/app-observatory/tokens*`
  - `/api/app-observatory/alert-rules*`
  - `/api/app-observatory/alert-deliveries`
  - `/api/app-observatory/settings/summary`
  - `/api/app-observatory/retention/dry-run`
  - `/api/app-observatory/retention/run`
  - `/api/app-observatory/retention/runs`

## Admin UI

- Applications page now supports application registration, scoped token management, lifecycle actions, and explicit app-data deletion.
- Alerts page now supports rule creation/editing, masked webhook display, test delivery, enable/disable/delete, and delivery history.
- Settings page now supports health/config summary, retention dry-run/run safety flow, retention history, and security warnings.
- Login page uses password-session auth; `VITE_APP_HEALTH_ADMIN_TOKEN` remains an optional local/internal fallback.

## Operations

Recommended pre-deploy sequence:

Run the matching verification and smoke commands from the standalone `app-observatory` repository.

Production rollout notes:

- Run `app-health-migrate up` before deploying the new service binary/container.
- Keep PostgreSQL enabled for persistence; in-memory mode is development-only.
- Configure strong `APP_HEALTH_INGEST_TOKEN`, bcrypt `APP_HEALTH_ADMIN_PASSWORD_HASH`, and random `APP_HEALTH_SESSION_SECRET`.
- Prefer database alert rules from the admin UI; use `APP_HEALTH_ALERT_WEBHOOK_URL` only as a compatibility fallback.
- Run retention in dry-run mode first. Use the Settings UI for manual audited cleanup, or CLI for scheduled automation after backup/operational review.

## Verification completed locally

- `git diff --check`
- OpenAPI YAML parse: `paths=29 schemas=56`
- `pnpm ai:check`
- Run the equivalent `verify` and `smoke` commands inside `app-observatory`.
- `pnpm verify:release`

## Known limitations

- No source-map symbolication yet.
- No alert retry/outbox yet; webhook delivery is best-effort and delivery history is recorded.
- No archival export before retention deletion yet.
- No multi-user RBAC/SSO yet; admin auth is password session plus bearer-token compatibility.
- No built-in retention scheduler; use cron/Compose tools or manual Settings UI execution.
