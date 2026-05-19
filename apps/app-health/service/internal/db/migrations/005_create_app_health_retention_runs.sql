-- +goose Up
CREATE TABLE IF NOT EXISTS app_health_retention_runs (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('dry-run', 'run')),
  event_retention_days INTEGER NOT NULL,
  cutoff TIMESTAMPTZ,
  protected_event_ids INTEGER NOT NULL DEFAULT 0,
  deleted_events INTEGER NOT NULL DEFAULT 0,
  dry_run BOOLEAN NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT NOT NULL DEFAULT '',
  requested_by TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_health_retention_runs_created_at
ON app_health_retention_runs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_health_retention_runs_mode_created_at
ON app_health_retention_runs (mode, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS app_health_retention_runs;
