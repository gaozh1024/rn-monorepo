#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
APP_HEALTH_DIR="$ROOT_DIR/apps/app-health"
COMPOSE_FILE="$APP_HEALTH_DIR/docker-compose.yml"

PROJECT_NAME="${APP_HEALTH_SMOKE_PROJECT:-app-health-smoke}"
MODE="${APP_HEALTH_SMOKE_MODE:-local}"
SERVICE_PORT="${APP_HEALTH_SMOKE_SERVICE_PORT:-18080}"
ADMIN_PORT="${APP_HEALTH_SMOKE_ADMIN_PORT:-15173}"
POSTGRES_PORT="${APP_HEALTH_SMOKE_POSTGRES_PORT:-15433}"
API_BASE_URL="${APP_HEALTH_SMOKE_API_BASE_URL:-http://localhost:$SERVICE_PORT}"
ADMIN_BASE_URL="${APP_HEALTH_SMOKE_ADMIN_BASE_URL:-http://localhost:$ADMIN_PORT}"
ADMIN_EMAIL="${APP_HEALTH_SMOKE_ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${APP_HEALTH_SMOKE_ADMIN_PASSWORD:-admin_dev}"
ADMIN_TOKEN="${APP_HEALTH_SMOKE_ADMIN_TOKEN:-admin_dev}"
RUN_ID="$(date +%s)"
APP_SLUG="${APP_HEALTH_SMOKE_APP_ID:-smoke-app-$RUN_ID}"
EVENT_ID="evt_smoke_$RUN_ID"
COOKIE_JAR="$(mktemp "${TMPDIR:-/tmp}/app-health-smoke-cookies.XXXXXX")"
SERVICE_LOG="$(mktemp "${TMPDIR:-/tmp}/app-health-smoke-service.XXXXXX.log")"
ADMIN_LOG="$(mktemp "${TMPDIR:-/tmp}/app-health-smoke-admin.XXXXXX.log")"
SERVICE_PID=""
ADMIN_PID=""

cleanup() {
  trap - SIGTERM
  if [[ -n "$ADMIN_PID" ]]; then
    kill "$ADMIN_PID" >/dev/null 2>&1 || true
    wait "$ADMIN_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$SERVICE_PID" ]]; then
    kill "$SERVICE_PID" >/dev/null 2>&1 || true
    wait "$SERVICE_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$COOKIE_JAR" "$SERVICE_LOG" "$ADMIN_LOG"
}
trap cleanup EXIT

log() {
  printf '[app-health-smoke] %s\n' "$*"
}

compose() {
  APP_HEALTH_SERVICE_PORT="$SERVICE_PORT" \
    APP_HEALTH_ADMIN_PORT="$ADMIN_PORT" \
    APP_HEALTH_POSTGRES_PORT="$POSTGRES_PORT" \
    APP_HEALTH_PUBLIC_API_BASE_URL="$API_BASE_URL" \
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
}

curl_json() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -fsS -X "$method" "$url" \
      -H 'content-type: application/json' \
      -H "authorization: Bearer $ADMIN_TOKEN" \
      --data "$data"
  else
    curl -fsS -X "$method" "$url" \
      -H "authorization: Bearer $ADMIN_TOKEN"
  fi
}

require_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if [[ "$haystack" != *"$needle"* ]]; then
    printf '[app-health-smoke] %s failed: expected %s in:\n%s\n' "$label" "$needle" "$haystack" >&2
    exit 1
  fi
}

require_equals() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    printf '[app-health-smoke] %s failed: expected %s, got %s\n' "$label" "$expected" "$actual" >&2
    exit 1
  fi
}

extract_json_string() {
  local json="$1"
  local key="$2"
  JSON_INPUT="$json" python3 - "$key" <<'PY'
import json
import os
import sys

key = sys.argv[1]
data = json.loads(os.environ["JSON_INPUT"])

def walk(value):
    if isinstance(value, dict):
        if key in value and isinstance(value[key], str):
            print(value[key])
            return True
        for child in value.values():
            if walk(child):
                return True
    elif isinstance(value, list):
        for child in value:
            if walk(child):
                return True
    return False

if not walk(data):
    sys.exit(1)
PY
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts="${3:-60}"
  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "$label is ready"
      return 0
    fi
    sleep 2
  done
  log "$label did not become ready"
  compose ps || true
  if [[ -s "$SERVICE_LOG" ]]; then
    printf '\n--- service log ---\n' >&2
    tail -120 "$SERVICE_LOG" >&2 || true
  fi
  if [[ -s "$ADMIN_LOG" ]]; then
    printf '\n--- admin log ---\n' >&2
    tail -120 "$ADMIN_LOG" >&2 || true
  fi
  compose logs --tail=120 service || true
  exit 1
}

log "validating compose config"
compose config >/dev/null

log "starting PostgreSQL"
compose up -d postgres

log "waiting for PostgreSQL"
for ((i = 1; i <= 60; i++)); do
  if compose exec -T postgres pg_isready -U postgres -d app_health >/dev/null 2>&1; then
    log "PostgreSQL is ready"
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    log "PostgreSQL did not become ready"
    compose logs --tail=120 postgres || true
    exit 1
  fi
  sleep 2
done

if [[ "$MODE" == "compose" ]]; then
  log "running migrations with Compose"
  compose run --rm migrate up

  log "starting service and admin with Compose"
  compose up -d service admin
else
  database_url="postgres://postgres:postgres@localhost:$POSTGRES_PORT/app_health?sslmode=disable"

  log "running migrations locally"
  (
    cd "$APP_HEALTH_DIR/service"
    APP_HEALTH_DATABASE_URL="$database_url" APP_HEALTH_ENV=development go run ./cmd/app-health-migrate up
  )

  log "starting service locally"
  (
    cd "$APP_HEALTH_DIR/service"
    APP_HEALTH_ADDR=":$SERVICE_PORT" \
      APP_HEALTH_DATABASE_URL="$database_url" \
      APP_HEALTH_INGEST_TOKEN=ingest_dev \
      APP_HEALTH_ADMIN_TOKEN="$ADMIN_TOKEN" \
      APP_HEALTH_CORS_ORIGINS="http://localhost:$ADMIN_PORT,http://127.0.0.1:$ADMIN_PORT" \
      APP_HEALTH_ENV=development \
      APP_HEALTH_MAX_BODY_BYTES=1048576 \
      APP_HEALTH_INGEST_RATE_LIMIT_RPS=20 \
      APP_HEALTH_INGEST_RATE_LIMIT_BURST=100 \
      APP_HEALTH_ALERT_MIN_LEVEL=fatal \
      APP_HEALTH_ALERT_COOLDOWN_SECONDS=300 \
      APP_HEALTH_ALERT_TIMEOUT_SECONDS=5 \
      APP_HEALTH_ADMIN_EMAIL="$ADMIN_EMAIL" \
      APP_HEALTH_ADMIN_PASSWORD_HASH='$2a$10$B76xdQ9IRhG8L4LmoGNZFeFR2CsCCXPdXOsh5jqfTSGWc9byFjTjW' \
      APP_HEALTH_SESSION_SECRET=development_session_secret_32_chars_minimum \
      APP_HEALTH_COOKIE_SECURE=false \
      APP_HEALTH_SESSION_TTL_HOURS=168 \
      go run ./cmd/app-health-service
  ) >"$SERVICE_LOG" 2>&1 &
  SERVICE_PID="$!"

  log "starting admin locally"
  (
    cd "$APP_HEALTH_DIR/admin"
    VITE_APP_HEALTH_API_BASE_URL="$API_BASE_URL" \
      VITE_APP_HEALTH_ADMIN_TOKEN= \
      pnpm dev --host 127.0.0.1 --port "$ADMIN_PORT"
  ) >"$ADMIN_LOG" 2>&1 &
  ADMIN_PID="$!"
fi

wait_for_url "$API_BASE_URL/healthz" "service healthz"
wait_for_url "$API_BASE_URL/readyz" "service readyz"
wait_for_url "$ADMIN_BASE_URL/" "admin UI"

log "checking password login and session cookie"
login_response="$(
  curl -fsS -i -c "$COOKIE_JAR" -X POST "$API_BASE_URL/api/app-health/auth/login" \
    -H 'content-type: application/json' \
    --data "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
)"
require_contains "$login_response" '"email":"admin@example.com"' 'login response'

me_response="$(curl -fsS -b "$COOKIE_JAR" "$API_BASE_URL/api/app-health/auth/me")"
require_contains "$me_response" '"email":"admin@example.com"' 'session me response'

log "creating smoke application"
create_response="$(
  curl_json POST "$API_BASE_URL/api/app-health/applications" \
    "{\"name\":\"Smoke App\",\"slug\":\"$APP_SLUG\",\"defaultEnvironment\":\"production\",\"platforms\":[\"ios\",\"android\"]}"
)"
require_contains "$create_response" "\"slug\":\"$APP_SLUG\"" 'create application response'
ingest_token="$(extract_json_string "$create_response" plainText)"
if [[ -z "$ingest_token" ]]; then
  log "failed to extract ingest token"
  printf '%s\n' "$create_response" >&2
  exit 1
fi

log "checking alert rule CRUD"
alert_response="$(
  curl_json POST "$API_BASE_URL/api/app-health/alert-rules" \
    "{\"name\":\"Smoke alert\",\"appId\":\"$APP_SLUG\",\"environment\":\"production\",\"minLevel\":\"error\",\"webhookUrl\":\"http://127.0.0.1:1/smoke?token=secret\",\"cooldownSeconds\":300}"
)"
require_contains "$alert_response" '"name":"Smoke alert"' 'create alert rule response'
require_contains "$alert_response" 'webhookUrlMasked' 'create alert rule response'
alert_rule_id="$(
  JSON_INPUT="$alert_response" python3 - <<'PY'
import json
import os

print(json.loads(os.environ["JSON_INPUT"])["rule"]["id"])
PY
)"
alert_rules_response="$(curl_json GET "$API_BASE_URL/api/app-health/alert-rules?appId=$APP_SLUG")"
require_contains "$alert_rules_response" '"total":1' 'alert rules response'
alert_test_response="$(
  curl -sS -X POST "$API_BASE_URL/api/app-health/alert-rules/$alert_rule_id/test" \
    -H "authorization: Bearer $ADMIN_TOKEN" \
    -H 'content-type: application/json' \
    --data '{"message":"Smoke alert test"}'
)"
require_contains "$alert_test_response" 'error' 'alert test failure response' 
alert_deliveries_response="$(curl_json GET "$API_BASE_URL/api/app-health/alert-deliveries?ruleId=$alert_rule_id&status=failed")"
require_contains "$alert_deliveries_response" '"total":1' 'alert deliveries response'
alert_disable_response="$(curl_json POST "$API_BASE_URL/api/app-health/alert-rules/$alert_rule_id/disable")"
require_contains "$alert_disable_response" '"enabled":false' 'disable alert rule response'
alert_delete_response="$(curl_json DELETE "$API_BASE_URL/api/app-health/alert-rules/$alert_rule_id")"
require_contains "$alert_delete_response" '"name":"Smoke alert"' 'delete alert rule response'

log "ingesting smoke event $EVENT_ID"
ingest_response="$(
  curl -fsS -X POST "$API_BASE_URL/api/app-health/events" \
    -H "authorization: Bearer $ingest_token" \
    -H 'content-type: application/json' \
    --data "{\"events\":[{\"id\":\"$EVENT_ID\",\"type\":\"js_error\",\"level\":\"error\",\"timestamp\":1710000000000,\"app\":{\"id\":\"$APP_SLUG\",\"version\":\"1.0.0\",\"buildNumber\":\"1\",\"environment\":\"production\"},\"device\":{\"platform\":\"ios\",\"osVersion\":\"17.0\"},\"user\":{\"id\":\"user_smoke\"},\"session\":{\"id\":\"sess_smoke\",\"startedAt\":1710000000000},\"error\":{\"name\":\"SmokeError\",\"message\":\"Smoke boom\",\"fingerprint\":\"fp_smoke\"}}]}"
)"
require_contains "$ingest_response" '"accepted":1' 'ingest response'

log "querying events, issues, and stats"
events_response="$(curl_json GET "$API_BASE_URL/api/app-health/events?appId=$APP_SLUG&fingerprint=fp_smoke")"
require_contains "$events_response" '"total":1' 'events response'
require_contains "$events_response" "$EVENT_ID" 'events response event id'

issues_response="$(curl_json GET "$API_BASE_URL/api/app-health/issues?appId=$APP_SLUG&fingerprint=fp_smoke")"
require_contains "$issues_response" '"total":1' 'issues response'

stats_response="$(curl_json GET "$API_BASE_URL/api/app-health/stats/overview?appId=$APP_SLUG")"
require_contains "$stats_response" '"openIssues":1' 'stats response'


log "checking settings summary and retention dry-run"
settings_response="$(curl_json GET "$API_BASE_URL/api/app-health/settings/summary")"
require_contains "$settings_response" '"eventRetentionDays":30' 'settings summary response'
require_contains "$settings_response" '"databaseConfigured":true' 'settings summary response'
retention_dry_run_response="$(curl_json POST "$API_BASE_URL/api/app-health/retention/dry-run" '{"eventRetentionDays":30}')"
require_contains "$retention_dry_run_response" '"mode":"dry-run"' 'retention dry-run response'
require_contains "$retention_dry_run_response" '"dryRun":true' 'retention dry-run response'
retention_run_status="$(
  curl -sS -o /dev/null -w '%{http_code}' -X POST "$API_BASE_URL/api/app-health/retention/run"     -H "authorization: Bearer $ADMIN_TOKEN"     -H 'content-type: application/json'     --data '{"eventRetentionDays":30}'
)"
require_equals "$retention_run_status" '400' 'retention run without confirmation status'
retention_runs_response="$(curl_json GET "$API_BASE_URL/api/app-health/retention/runs?limit=5")"
require_contains "$retention_runs_response" '"total":1' 'retention runs response'

log "checking token revoke and disabled-token delete"
token_id="$(
  JSON_INPUT="$create_response" python3 - <<'PY'
import json
import os

print(json.loads(os.environ["JSON_INPUT"])["token"]["id"])
PY
)"
revoke_response="$(curl_json POST "$API_BASE_URL/api/app-health/tokens/$token_id/revoke")"
require_contains "$revoke_response" '"revokedAt"' 'revoke token response'
delete_token_response="$(curl_json DELETE "$API_BASE_URL/api/app-health/tokens/$token_id")"
require_contains "$delete_token_response" '"name":"Default ingest token"' 'delete token response'

log "checking logout"
logout_response="$(curl -fsS -b "$COOKIE_JAR" -X POST "$API_BASE_URL/api/app-health/auth/logout")"
require_contains "$logout_response" '"ok":true' 'logout response'

log "smoke passed"
