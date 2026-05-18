#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created apps/app-health/deploy-service/.env from .env.example"
fi

mkdir -p out

(
  cd ../service
  GOCACHE="${GOCACHE:-/tmp/app-health-go-cache}" CGO_ENABLED=0 GOOS=linux go build -o ../deploy-service/out/app-health-service ./cmd/app-health-service
  GOCACHE="${GOCACHE:-/tmp/app-health-go-cache}" CGO_ENABLED=0 GOOS=linux go build -o ../deploy-service/out/app-health-migrate ./cmd/app-health-migrate
  GOCACHE="${GOCACHE:-/tmp/app-health-go-cache}" CGO_ENABLED=0 GOOS=linux go build -o ../deploy-service/out/app-health-retention ./cmd/app-health-retention
  GOCACHE="${GOCACHE:-/tmp/app-health-go-cache}" CGO_ENABLED=0 GOOS=linux go build -o ../deploy-service/out/app-health-password ./cmd/app-health-password
)

docker compose up -d --build app-health-service

echo "Waiting for app-health service health check..."
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:${APP_HEALTH_SERVICE_PORT:-8080}/healthz" >/dev/null 2>&1; then
    echo "app-health service is available at http://localhost:${APP_HEALTH_SERVICE_PORT:-8080}"
    exit 0
  fi
  sleep 1
done

echo "Service did not become healthy in time. Recent logs:" >&2
docker compose logs --tail=80 app-health-service >&2
exit 1
