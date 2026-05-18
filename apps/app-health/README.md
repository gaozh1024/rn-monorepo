# App Health

`apps/app-health` is the self-hosted backend surface for `@gaozh1024/rn-health`.

It is intentionally split into two deployable applications:

- `service/` — Go API service. This is the only backend that receives mobile app events, writes data, aggregates issues, and serves admin APIs.
- `admin/` — React/Vite management UI. It never talks to PostgreSQL directly; it only calls the Go service APIs.

Shared API contracts live in `contracts/openapi.yaml`.

For mobile app configuration, see `docs/app-integration.md`.

## Directory layout

```text
apps/app-health/
  contracts/                  # OpenAPI contract and sample ingest payloads
  service/                    # Go API + migrations
    cmd/app-health-service/   # HTTP service entrypoint
    cmd/app-health-migrate/   # PostgreSQL migration runner
    cmd/app-health-retention/ # Event retention cleanup runner
    internal/db/migrations/   # Goose SQL migrations
  admin/                      # Static React/Vite admin console
```

## Environment variables

### Service

| Variable                             | Default                 | Description                                                                               |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------- |
| `APP_HEALTH_ADDR`                    | `:8080`                 | HTTP listen address.                                                                      |
| `APP_HEALTH_DATABASE_URL`            | empty                   | PostgreSQL DSN. Empty means in-memory development repository. Production should set this. |
| `APP_HEALTH_INGEST_TOKEN`            | `ingest_dev`            | Bearer token for mobile SDK event ingestion.                                              |
| `APP_HEALTH_ADMIN_TOKEN`             | `admin_dev`             | Bearer token for admin APIs. Keep it different from the ingest token.                     |
| `APP_HEALTH_CORS_ORIGINS`            | `http://localhost:5173` | Comma-separated allowed admin origins.                                                    |
| `APP_HEALTH_ENV`                     | `development`           | Logger mode.                                                                              |
| `APP_HEALTH_MAX_BODY_BYTES`          | `1048576`               | Maximum ingest request body size in bytes. Set `0` to disable this service-level guard.   |
| `APP_HEALTH_INGEST_RATE_LIMIT_RPS`   | `0`                     | Per-process ingest token-bucket refill rate. `0` disables service-level rate limiting.    |
| `APP_HEALTH_INGEST_RATE_LIMIT_BURST` | `0`                     | Per-process ingest token-bucket burst capacity. `0` disables service-level rate limiting. |
| `APP_HEALTH_ALERT_WEBHOOK_URL`       | empty                   | Optional generic HTTP/HTTPS webhook URL for urgent issue alerts. Keep tokens in secrets.  |
| `APP_HEALTH_ALERT_MIN_LEVEL`         | `fatal`                 | Minimum event level that can trigger alerts: `info`, `warning`, `error`, or `fatal`.      |
| `APP_HEALTH_ALERT_COOLDOWN_SECONDS`  | `300`                   | Per `appId + fingerprint + level` alert cooldown window in seconds.                       |
| `APP_HEALTH_ALERT_TIMEOUT_SECONDS`   | `5`                     | Webhook request timeout in seconds.                                                       |
| `APP_HEALTH_EVENT_RETENTION_DAYS`    | `30`                    | Number of days to retain historical events for the retention runner.                      |
| `APP_HEALTH_RETENTION_DRY_RUN`       | `true`                  | Default dry-run mode used by `app-health-retention env`.                                  |
| `APP_HEALTH_ADMIN_EMAIL`             | `admin@example.com`     | Owner admin email used by password login.                                                 |
| `APP_HEALTH_ADMIN_PASSWORD_HASH`     | empty                   | Bcrypt hash for the owner admin password. Empty disables password login.                  |
| `APP_HEALTH_SESSION_SECRET`          | empty                   | HMAC session-cookie secret. Must be at least 32 characters.                               |
| `APP_HEALTH_COOKIE_SECURE`           | `false`                 | Set `true` when serving over HTTPS so the admin cookie is marked Secure.                  |
| `APP_HEALTH_SESSION_TTL_HOURS`       | `168`                   | Admin session lifetime in hours.                                                          |

### Admin

| Variable                       | Default                 | Description                                                             |
| ------------------------------ | ----------------------- | ----------------------------------------------------------------------- |
| `VITE_APP_HEALTH_API_BASE_URL` | `http://localhost:8080` | Go service API base URL.                                                |
| `VITE_APP_HEALTH_ADMIN_TOKEN`  | empty                   | Optional legacy bearer token fallback. Leave empty to use cookie login. |

## Local service: in-memory mode

Useful for fast API checks without PostgreSQL. Data is lost on restart.

```bash
cd apps/app-health/service
go test ./...
go build -o bin/app-health-service ./cmd/app-health-service
go run ./cmd/app-health-password 'replace_me_password'

APP_HEALTH_ADDR=:8080 \
APP_HEALTH_INGEST_TOKEN=ingest_dev \
APP_HEALTH_ADMIN_TOKEN=admin_dev \
APP_HEALTH_ADMIN_EMAIL=admin@example.com \
APP_HEALTH_ADMIN_PASSWORD_HASH='replace_with_bcrypt_hash' \
APP_HEALTH_SESSION_SECRET='replace_with_at_least_32_random_chars' \
./bin/app-health-service
```

## Local service: PostgreSQL mode

Start PostgreSQL:

```bash
cd apps/app-health
docker compose up -d postgres
```

Run migrations:

```bash
cd apps/app-health/service
APP_HEALTH_DATABASE_URL='postgres://postgres:postgres@localhost:15432/app_health?sslmode=disable' \
go run ./cmd/app-health-migrate up
```

Start the API service:

```bash
APP_HEALTH_DATABASE_URL='postgres://postgres:postgres@localhost:15432/app_health?sslmode=disable' \
APP_HEALTH_ADDR=:8080 \
APP_HEALTH_INGEST_TOKEN=ingest_dev \
APP_HEALTH_ADMIN_TOKEN=admin_dev \
APP_HEALTH_ADMIN_EMAIL=admin@example.com \
APP_HEALTH_ADMIN_PASSWORD_HASH='replace_with_bcrypt_hash' \
APP_HEALTH_SESSION_SECRET='replace_with_at_least_32_random_chars' \
go run ./cmd/app-health-service
```

Health check:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
```

Admin login smoke test:

```bash
curl -i -X POST http://localhost:8080/api/app-health/auth/login \
  -H 'content-type: application/json' \
  --data '{"email":"admin@example.com","password":"replace_me_password"}'
```

Auth notes:

- Password login uses `APP_HEALTH_ADMIN_EMAIL` + bcrypt `APP_HEALTH_ADMIN_PASSWORD_HASH`. Generate a hash with `go run ./cmd/app-health-password '<password>'`.
- Session cookies are signed with `APP_HEALTH_SESSION_SECRET`; production should use a random secret of at least 32 characters.
- The old `APP_HEALTH_ADMIN_TOKEN` bearer mode remains as a compatibility fallback for scripts and private deployments, but the admin UI now prefers HttpOnly cookie login.
- Set `APP_HEALTH_COOKIE_SECURE=true` behind HTTPS. Keep it `false` for plain `http://localhost` development.

Ingest example:

```bash
curl -X POST http://localhost:8080/api/app-health/events \
  -H 'authorization: Bearer ingest_dev' \
  -H 'content-type: application/json' \
  --data @../contracts/examples/ingest-events.json
```

Ingest safety behavior:

- A batch can contain at most 100 events.
- Invalid events are counted as `rejected` and do not block valid events in the same batch.
- Duplicate event IDs are counted as `duplicated` and are ignored without increasing issue counts.
- Duplicate event IDs do not trigger alert webhooks again.
- Event `level` must be one of `info`, `warning`, `error`, or `fatal`.
- A single event can include at most 100 breadcrumbs, 50 tag keys, and 64 KiB of JSON-encoded `extra` data.

## Alert routing

The service can send a generic JSON webhook after an ingested event has been persisted, grouped into an issue, and linked back to that issue. Webhook delivery is best-effort: a webhook timeout or non-2xx response never rejects the ingest request.

Enable it with:

```bash
APP_HEALTH_ALERT_WEBHOOK_URL='https://example.internal/app-health-webhook?token=replace_me' \
APP_HEALTH_ALERT_MIN_LEVEL=fatal \
APP_HEALTH_ALERT_COOLDOWN_SECONDS=300 \
APP_HEALTH_ALERT_TIMEOUT_SECONDS=5 \
go run ./cmd/app-health-service
```

Alert payload shape:

```json
{
  "title": "App Health fatal: TypeError: boom",
  "appId": "com.example.app",
  "level": "fatal",
  "fingerprint": "fp_test",
  "eventId": "event_1",
  "issueId": "issue_1",
  "timestamp": "2026-05-17T00:00:00Z",
  "event": {},
  "issue": {}
}
```

Alert notes:

- Default `APP_HEALTH_ALERT_MIN_LEVEL=fatal` means `error`, `warning`, and `info` are stored but do not alert.
- Set `APP_HEALTH_ALERT_MIN_LEVEL=error` if JavaScript/API errors should alert too.
- Cooldown is keyed by `appId + fingerprint + level`, so one crash storm sends at most one alert per cooldown window.
- Do not commit webhook URLs containing tokens. Put them in your runtime secret manager.
- Service config logs only whether alerting is enabled; it does not log the webhook URL.

Admin API examples:

```bash
curl http://localhost:8080/api/app-health/issues \
  -H 'authorization: Bearer admin_dev'

curl 'http://localhost:8080/api/app-health/issues?status=open&level=error&platform=ios' \
  -H 'authorization: Bearer admin_dev'

curl 'http://localhost:8080/api/app-health/issues?appVersion=1.0.0&fingerprint=fp_test&message=TypeError' \
  -H 'authorization: Bearer admin_dev'

curl 'http://localhost:8080/api/app-health/events?appId=mobile-app&level=error' \
  -H 'authorization: Bearer admin_dev'

curl 'http://localhost:8080/api/app-health/events?appVersion=1.0.0&platform=ios&type=js_error&message=boom' \
  -H 'authorization: Bearer admin_dev'
```

Query notes:

- `page` and `pageSize` are supported on issue and event lists. `pageSize` is capped at 100.
- `from` and `to` use RFC3339 timestamps, for example `2026-05-17T00:00:00Z`.
- Event list filters include `appId`, `issueId`, `userId`, `level`, `type`, `from`, `to`, `appVersion`, `buildNumber`, `environment`, `platform`, `osVersion`, `sessionId`, `fingerprint`, and `message`.
- Issue list filters include `appId`, `status`, `level`, `platform`, `from`, `to`, `appVersion`, `buildNumber`, `fingerprint`, and `message`.
- Current rn-health event types are `app_start`, `app_ready`, `app_background`, `app_foreground`, `js_error`, `react_error`, `unhandled_rejection`, `previous_session_crash`, `native_crash`, `api_error`, and `custom`.

## Local admin

```bash
cd apps/app-health/admin
pnpm typecheck
VITE_APP_HEALTH_API_BASE_URL=http://localhost:8080 \
pnpm dev
```

## Local service-only Docker deploy

If you only need to publish the Go service locally, use the standalone deploy directory:

```bash
cd apps/app-health/deploy-service
cp .env.example .env
./deploy-service.sh
```

This starts the local `app-health` stack: `app-health-postgres` plus `app-health-service`, runs migrations, and exposes the API at `http://localhost:8080`.
The default `.env.example` uses PostgreSQL persistence through the `app-health-postgres-data` Docker volume; `/readyz` should report `databaseConfigured=true`.

## Local full stack with Docker

The Docker workflow starts PostgreSQL, runs migrations explicitly, then serves the Go service and the nginx-hosted admin UI.

Build and start PostgreSQL first:

```bash
cd apps/app-health
docker compose up -d --build postgres
```

Run database migrations explicitly:

```bash
docker compose --profile tools run --rm migrate up
```

Start the service and admin UI:

```bash
docker compose up -d --build service admin
```

Health checks:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
curl http://localhost:5173/healthz
```

Ingest smoke test:

```bash
curl -X POST http://localhost:8080/api/app-health/events \
  -H 'authorization: Bearer ingest_dev' \
  -H 'content-type: application/json' \
  --data @contracts/examples/ingest-events.json
```

Open the admin UI:

```text
http://localhost:5173
```

Docker development credentials:

```text
email: admin@example.com
password: admin_dev
```

The Docker password is only for local development. Replace the bcrypt hash and session secret before exposing the service.

Docker notes:

- `migrate` is intentionally explicit. Do not auto-run migrations from the service container in production.
- `retention` is also explicit and lives under the `tools` profile. Run `dry-run` before `run`.
- Leave `VITE_APP_HEALTH_ADMIN_TOKEN` empty for cookie login. If you set it, it is compiled into the static admin bundle and should only be used for local/internal trials.
- Replace `ingest_dev`, `admin_dev`, the bcrypt hash, and the session secret with strong runtime secrets outside local development.
- The compose service exposes PostgreSQL on `localhost:15432`, the API on `localhost:8080`, and admin on `localhost:5173`.

Run retention from Docker Compose:

```bash
docker compose --profile tools run --rm retention dry-run
docker compose --profile tools run --rm retention run
```

## Event retention

`app-health-retention` keeps long-running deployments bounded by deleting old event rows while preserving issue summaries.

Local PostgreSQL dry-run:

```bash
cd apps/app-health/service
APP_HEALTH_DATABASE_URL='postgres://postgres:postgres@localhost:15432/app_health?sslmode=disable' \
APP_HEALTH_EVENT_RETENTION_DAYS=30 \
go run ./cmd/app-health-retention dry-run
```

Actual cleanup:

```bash
APP_HEALTH_DATABASE_URL='postgres://postgres:postgres@localhost:15432/app_health?sslmode=disable' \
APP_HEALTH_EVENT_RETENTION_DAYS=30 \
go run ./cmd/app-health-retention run
```

Retention behavior:

- `dry-run` returns the number of events that would be deleted and does not change data.
- `run` deletes events whose `created_at` is older than `now - APP_HEALTH_EVENT_RETENTION_DAYS`.
- Issue rows are not deleted by this job.
- Event IDs referenced by issue `sample_event_id` or `last_event_id` are protected from deletion.
- `APP_HEALTH_DATABASE_URL` is required so the runner cannot accidentally report success against an empty in-memory repository.

Example cron:

```cron
15 3 * * * /app/app-health-retention dry-run >> /var/log/app-health-retention.log 2>&1
30 3 * * 0 /app/app-health-retention run >> /var/log/app-health-retention.log 2>&1
```

Current admin capabilities:

- overview cards for open issues, today events, affected users, and fatal events;
- app-scoped overview filtering;
- issue list with app/status/level/platform/time/version/fingerprint/message filters and pagination;
- event list with app/issue/user/level/type/time/version/platform/session/fingerprint/message filters and pagination;
- issue detail with status transitions, stack trace, breadcrumbs, recent events, and raw sample event JSON;
- loading, empty, retry, and error states for each page.

## Verification

From the repository root:

```bash
pnpm verify:app-health
```

This runs:

- Go unit tests for `apps/app-health/service`;
- Go builds for `app-health-service`, `app-health-migrate`, and `app-health-retention`;
- admin TypeScript check;
- admin production build.

## Production shape

- Use PostgreSQL and run `app-health-migrate up` before deploying a new service version.
- Set a strong `APP_HEALTH_INGEST_TOKEN`, bcrypt admin password hash, and random `APP_HEALTH_SESSION_SECRET`; keep `APP_HEALTH_ADMIN_TOKEN` only for script/back-compat access if you still need it.
- Terminate TLS and rate-limit ingestion at your gateway or load balancer. The service also has a per-process ingest token bucket for a first local guard.
- Keep `APP_HEALTH_MAX_BODY_BYTES` enabled so malformed or oversized ingest requests cannot consume unbounded memory.
- Configure `APP_HEALTH_ALERT_WEBHOOK_URL` for fatal/error alert routing, and keep the URL in a secret manager.
- Schedule `app-health-retention dry-run` and then `app-health-retention run` after backup/operational review.
- Use `/healthz` for process liveness and `/readyz` for dependency readiness checks.
- Deploy `admin/` as static assets with `VITE_APP_HEALTH_API_BASE_URL` pointing at the service.
- Keep admin access private; the admin token is intended as a first deployable guard, not a full multi-user RBAC system.

## Current limitations / next milestones

- No source-map symbolication yet.
- No alert retry/outbox yet; webhook delivery is best-effort.
- No archival export before retention yet.
- Admin auth is token-based only; add SSO/RBAC before exposing it to a wider internal audience.
