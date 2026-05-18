#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created apps/app-health/deploy-service/.env from .env.example"
fi

set -a
. ./.env
set +a

mkdir -p out

(
  cd ../service
  GOCACHE="${GOCACHE:-/tmp/app-health-go-cache}" CGO_ENABLED=0 GOOS=linux go build -o ../deploy-service/out/app-health-service ./cmd/app-health-service
  GOCACHE="${GOCACHE:-/tmp/app-health-go-cache}" CGO_ENABLED=0 GOOS=linux go build -o ../deploy-service/out/app-health-migrate ./cmd/app-health-migrate
  GOCACHE="${GOCACHE:-/tmp/app-health-go-cache}" CGO_ENABLED=0 GOOS=linux go build -o ../deploy-service/out/app-health-retention ./cmd/app-health-retention
  GOCACHE="${GOCACHE:-/tmp/app-health-go-cache}" CGO_ENABLED=0 GOOS=linux go build -o ../deploy-service/out/app-health-password ./cmd/app-health-password
)

docker compose up -d app-health-postgres

echo "Waiting for app-health-postgres..."
for i in $(seq 1 30); do
  if docker compose exec -T app-health-postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-app_health}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [ "$i" = "30" ]; then
    echo "PostgreSQL did not become healthy in time." >&2
    docker compose logs --tail=80 app-health-postgres >&2
    exit 1
  fi
done

docker compose build app-health-service
docker compose run --rm --entrypoint /app/app-health-migrate app-health-service up
docker compose up -d app-health-service

echo "Waiting for app-health-service..."
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:${APP_HEALTH_SERVICE_PORT:-8080}/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [ "$i" = "30" ]; then
    echo "Service did not become healthy in time. Recent logs:" >&2
    docker compose logs --tail=80 app-health-service >&2
    exit 1
  fi
done

curl -fsS "http://localhost:${APP_HEALTH_SERVICE_PORT:-8080}/readyz" >/dev/null

echo "app-health stack is available at http://localhost:${APP_HEALTH_SERVICE_PORT:-8080}"
echo "containers: app-health-postgres, app-health-service"
