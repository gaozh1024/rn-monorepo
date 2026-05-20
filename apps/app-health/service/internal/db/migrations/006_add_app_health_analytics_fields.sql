-- +goose Up
ALTER TABLE app_health_events
ADD COLUMN IF NOT EXISTS analytics_name TEXT,
ADD COLUMN IF NOT EXISTS analytics_properties JSONB,
ADD COLUMN IF NOT EXISTS device_brand TEXT,
ADD COLUMN IF NOT EXISTS geo_country TEXT,
ADD COLUMN IF NOT EXISTS geo_province TEXT,
ADD COLUMN IF NOT EXISTS geo_city TEXT,
ADD COLUMN IF NOT EXISTS ip_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_app_health_events_analytics_name_created_at
ON app_health_events (analytics_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_health_events_user_created_at
ON app_health_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_health_events_session_created_at
ON app_health_events (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_health_events_device_model_created_at
ON app_health_events (device_model, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_health_events_geo_city_created_at
ON app_health_events (geo_city, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_app_health_events_geo_city_created_at;
DROP INDEX IF EXISTS idx_app_health_events_device_model_created_at;
DROP INDEX IF EXISTS idx_app_health_events_session_created_at;
DROP INDEX IF EXISTS idx_app_health_events_user_created_at;
DROP INDEX IF EXISTS idx_app_health_events_analytics_name_created_at;

ALTER TABLE app_health_events
DROP COLUMN IF EXISTS ip_hash,
DROP COLUMN IF EXISTS geo_city,
DROP COLUMN IF EXISTS geo_province,
DROP COLUMN IF EXISTS geo_country,
DROP COLUMN IF EXISTS device_brand,
DROP COLUMN IF EXISTS analytics_properties,
DROP COLUMN IF EXISTS analytics_name;
