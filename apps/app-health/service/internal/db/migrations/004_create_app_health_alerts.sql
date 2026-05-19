-- +goose Up
CREATE TABLE IF NOT EXISTS app_health_alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  app_id TEXT NOT NULL DEFAULT '',
  environment TEXT NOT NULL DEFAULT '',
  min_level TEXT NOT NULL DEFAULT 'fatal',
  webhook_url TEXT NOT NULL,
  cooldown_seconds INTEGER NOT NULL DEFAULT 300,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_health_alert_rules_enabled
ON app_health_alert_rules (enabled);

CREATE INDEX IF NOT EXISTS idx_app_health_alert_rules_app_env
ON app_health_alert_rules (app_id, environment);

CREATE TABLE IF NOT EXISTS app_health_alert_deliveries (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  event_id TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  status TEXT NOT NULL,
  http_status INTEGER,
  error_message TEXT NOT NULL DEFAULT '',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_health_alert_deliveries_created_at
ON app_health_alert_deliveries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_health_alert_deliveries_rule_created_at
ON app_health_alert_deliveries (rule_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_health_alert_deliveries_app_created_at
ON app_health_alert_deliveries (app_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS app_health_alert_deliveries;
DROP TABLE IF EXISTS app_health_alert_rules;
