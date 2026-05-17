-- +goose Up
CREATE TABLE IF NOT EXISTS app_health_events (
  id TEXT PRIMARY KEY,

  app_id TEXT NOT NULL,
  app_version TEXT,
  build_number TEXT,
  environment TEXT,

  type TEXT NOT NULL,
  level TEXT NOT NULL,

  platform TEXT,
  os_version TEXT,
  device_model TEXT,

  user_id TEXT,
  session_id TEXT,

  error_name TEXT,
  error_message TEXT,
  error_stack TEXT,
  component_stack TEXT,
  fingerprint TEXT,

  breadcrumbs JSONB,
  tags JSONB,
  extra JSONB,
  raw_event JSONB NOT NULL,

  issue_id TEXT,

  event_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_health_events_app_id_created_at
ON app_health_events (app_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_health_events_fingerprint
ON app_health_events (fingerprint);

CREATE INDEX IF NOT EXISTS idx_app_health_events_issue_id
ON app_health_events (issue_id);

CREATE INDEX IF NOT EXISTS idx_app_health_events_user_id
ON app_health_events (user_id);

CREATE INDEX IF NOT EXISTS idx_app_health_events_type_level
ON app_health_events (type, level);

-- +goose Down
DROP TABLE IF EXISTS app_health_events;
