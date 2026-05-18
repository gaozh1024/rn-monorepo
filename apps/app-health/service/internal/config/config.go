package config

import (
	"log/slog"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Addr                 string
	DatabaseURL          string
	IngestToken          string
	AdminToken           string
	CORSOrigins          []string
	Env                  string
	MaxBodyBytes         int64
	IngestRateLimitRPS   int
	IngestRateLimitBurst int
	AlertWebhookURL      string
	AlertMinLevel        string
	AlertCooldownSeconds int
	AlertTimeoutSeconds  int
	EventRetentionDays   int
	RetentionDryRun      bool
	AdminEmail           string
	AdminPasswordHash    string
	SessionSecret        string
	CookieSecure         bool
	SessionTTLHours      int
}

func Load() Config {
	return Config{
		Addr:                 getEnv("APP_HEALTH_ADDR", ":8080"),
		DatabaseURL:          os.Getenv("APP_HEALTH_DATABASE_URL"),
		IngestToken:          getEnv("APP_HEALTH_INGEST_TOKEN", "ingest_dev"),
		AdminToken:           getEnv("APP_HEALTH_ADMIN_TOKEN", "admin_dev"),
		CORSOrigins:          splitCSV(getEnv("APP_HEALTH_CORS_ORIGINS", "http://localhost:5173")),
		Env:                  getEnv("APP_HEALTH_ENV", "development"),
		MaxBodyBytes:         getEnvInt64("APP_HEALTH_MAX_BODY_BYTES", 1_048_576),
		IngestRateLimitRPS:   getEnvInt("APP_HEALTH_INGEST_RATE_LIMIT_RPS", 0),
		IngestRateLimitBurst: getEnvInt("APP_HEALTH_INGEST_RATE_LIMIT_BURST", 0),
		AlertWebhookURL:      strings.TrimSpace(os.Getenv("APP_HEALTH_ALERT_WEBHOOK_URL")),
		AlertMinLevel:        getEnv("APP_HEALTH_ALERT_MIN_LEVEL", "fatal"),
		AlertCooldownSeconds: getEnvInt("APP_HEALTH_ALERT_COOLDOWN_SECONDS", 300),
		AlertTimeoutSeconds:  getEnvInt("APP_HEALTH_ALERT_TIMEOUT_SECONDS", 5),
		EventRetentionDays:   getEnvInt("APP_HEALTH_EVENT_RETENTION_DAYS", 30),
		RetentionDryRun:      getEnvBool("APP_HEALTH_RETENTION_DRY_RUN", true),
		AdminEmail:           getEnv("APP_HEALTH_ADMIN_EMAIL", "admin@example.com"),
		AdminPasswordHash:    strings.TrimSpace(os.Getenv("APP_HEALTH_ADMIN_PASSWORD_HASH")),
		SessionSecret:        strings.TrimSpace(os.Getenv("APP_HEALTH_SESSION_SECRET")),
		CookieSecure:         getEnvBool("APP_HEALTH_COOKIE_SECURE", false),
		SessionTTLHours:      getEnvInt("APP_HEALTH_SESSION_TTL_HOURS", 168),
	}
}

func (c Config) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("addr", c.Addr),
		slog.Bool("databaseConfigured", c.DatabaseURL != ""),
		slog.String("env", c.Env),
		slog.Int64("maxBodyBytes", c.MaxBodyBytes),
		slog.Int("ingestRateLimitRPS", c.IngestRateLimitRPS),
		slog.Int("ingestRateLimitBurst", c.IngestRateLimitBurst),
		slog.Bool("alertEnabled", c.AlertWebhookURL != ""),
		slog.String("alertMinLevel", c.AlertMinLevel),
		slog.Int("alertCooldownSeconds", c.AlertCooldownSeconds),
		slog.Int("alertTimeoutSeconds", c.AlertTimeoutSeconds),
		slog.Int("eventRetentionDays", c.EventRetentionDays),
		slog.Bool("retentionDryRun", c.RetentionDryRun),
		slog.String("adminEmail", c.AdminEmail),
		slog.Bool("adminPasswordConfigured", c.AdminPasswordHash != ""),
		slog.Bool("sessionSecretConfigured", c.SessionSecret != ""),
		slog.Bool("cookieSecure", c.CookieSecure),
		slog.Int("sessionTTLHours", c.SessionTTLHours),
	)
}

func getEnv(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func getEnvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 0 {
		return fallback
	}
	return parsed
}

func getEnvInt64(key string, fallback int64) int64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || parsed < 0 {
		return fallback
	}
	return parsed
}

func getEnvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
