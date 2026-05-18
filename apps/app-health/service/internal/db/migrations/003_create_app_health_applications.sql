-- +goose Up
CREATE TABLE IF NOT EXISTS app_health_applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  default_environment TEXT NOT NULL DEFAULT 'production',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_health_ingest_tokens (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES app_health_applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_health_ingest_tokens_application_id
ON app_health_ingest_tokens (application_id);

CREATE INDEX IF NOT EXISTS idx_app_health_ingest_tokens_token_hash
ON app_health_ingest_tokens (token_hash);

-- +goose Down
DROP TABLE IF EXISTS app_health_ingest_tokens;
DROP TABLE IF EXISTS app_health_applications;
