# App Health

`apps/app-health` is the self-hosted backend surface for `@gaozh1024/rn-health`.

It is intentionally split into two deployable applications:

- `service/` — Go API service. This is the only backend that receives mobile app events, writes data, aggregates issues, and serves admin APIs.
- `admin/` — React/Vite management UI. It never talks to PostgreSQL directly; it only calls the Go service APIs.

Shared API contracts live in `contracts/openapi.yaml`.

## Directory layout

```text
apps/app-health/
  contracts/                  # OpenAPI contract and sample ingest payloads
  service/                    # Go API + migrations
    cmd/app-health-service/   # HTTP service entrypoint
    cmd/app-health-migrate/   # PostgreSQL migration runner
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

### Admin

| Variable                       | Default                 | Description                                    |
| ------------------------------ | ----------------------- | ---------------------------------------------- |
| `VITE_APP_HEALTH_API_BASE_URL` | `http://localhost:8080` | Go service API base URL.                       |
| `VITE_APP_HEALTH_ADMIN_TOKEN`  | `admin_dev`             | Admin bearer token used by the local admin UI. |

## Local service: in-memory mode

Useful for fast API checks without PostgreSQL. Data is lost on restart.

```bash
cd apps/app-health/service
go test ./...
go build -o bin/app-health-service ./cmd/app-health-service

APP_HEALTH_ADDR=:8080 \
APP_HEALTH_INGEST_TOKEN=ingest_dev \
APP_HEALTH_ADMIN_TOKEN=admin_dev \
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
go run ./cmd/app-health-service
```

Health check:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
```

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
- Event `level` must be one of `info`, `warning`, `error`, or `fatal`.
- A single event can include at most 100 breadcrumbs, 50 tag keys, and 64 KiB of JSON-encoded `extra` data.

Admin API examples:

```bash
curl http://localhost:8080/api/app-health/issues \
  -H 'authorization: Bearer admin_dev'

curl 'http://localhost:8080/api/app-health/issues?status=open&level=error&platform=ios' \
  -H 'authorization: Bearer admin_dev'

curl 'http://localhost:8080/api/app-health/events?appId=mobile-app&level=error' \
  -H 'authorization: Bearer admin_dev'
```

## Local admin

```bash
cd apps/app-health/admin
pnpm typecheck
VITE_APP_HEALTH_API_BASE_URL=http://localhost:8080 \
VITE_APP_HEALTH_ADMIN_TOKEN=admin_dev \
pnpm dev
```

Current admin capabilities:

- overview cards for open issues, today events, affected users, and fatal events;
- issue list with app/status/level/platform filters;
- event list with app/issue/user/level/type filters;
- issue detail with status transitions, stack trace, breadcrumbs, recent events, and raw sample event JSON;
- loading, empty, retry, and error states for each page.

## Verification

From the repository root:

```bash
pnpm verify:app-health
```

This runs:

- Go unit tests for `apps/app-health/service`;
- Go builds for `app-health-service` and `app-health-migrate`;
- admin TypeScript check;
- admin production build.

## Production shape

- Use PostgreSQL and run `app-health-migrate up` before deploying a new service version.
- Set strong, different `APP_HEALTH_INGEST_TOKEN` and `APP_HEALTH_ADMIN_TOKEN` values.
- Terminate TLS and rate-limit ingestion at your gateway or load balancer. The service also has a per-process ingest token bucket for a first local guard.
- Keep `APP_HEALTH_MAX_BODY_BYTES` enabled so malformed or oversized ingest requests cannot consume unbounded memory.
- Use `/healthz` for process liveness and `/readyz` for dependency readiness checks.
- Deploy `admin/` as static assets with `VITE_APP_HEALTH_API_BASE_URL` pointing at the service.
- Keep admin access private; the admin token is intended as a first deployable guard, not a full multi-user RBAC system.

## Current limitations / next milestones

- No source-map symbolication yet.
- No alert routing yet.
- No retention/archival job yet.
- Admin auth is token-based only; add SSO/RBAC before exposing it to a wider internal audience.
