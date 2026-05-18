-- +goose Up
CREATE TABLE IF NOT EXISTS app_health_issues (
  id TEXT PRIMARY KEY,

  app_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,

  title TEXT NOT NULL,
  level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',

  event_count INTEGER NOT NULL DEFAULT 0,
  affected_user_count INTEGER NOT NULL DEFAULT 0,

  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,

  last_event_id TEXT,
  sample_event_id TEXT,

  last_app_version TEXT,
  last_build_number TEXT,
  last_platform TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(app_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_app_health_issues_app_status_last_seen
ON app_health_issues (app_id, status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_health_issues_fingerprint
ON app_health_issues (fingerprint);

-- +goose Down
DROP TABLE IF EXISTS app_health_issues;
