package config

import (
	"log/slog"
	"os"
	"strings"
)

type Config struct {
	Addr        string
	DatabaseURL string
	IngestToken string
	AdminToken  string
	CORSOrigins []string
	Env         string
}

func Load() Config {
	return Config{
		Addr:        getEnv("APP_HEALTH_ADDR", ":8080"),
		DatabaseURL: os.Getenv("APP_HEALTH_DATABASE_URL"),
		IngestToken: getEnv("APP_HEALTH_INGEST_TOKEN", "ingest_dev"),
		AdminToken:  getEnv("APP_HEALTH_ADMIN_TOKEN", "admin_dev"),
		CORSOrigins: splitCSV(getEnv("APP_HEALTH_CORS_ORIGINS", "http://localhost:5173")),
		Env:         getEnv("APP_HEALTH_ENV", "development"),
	}
}

func (c Config) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("addr", c.Addr),
		slog.Bool("databaseConfigured", c.DatabaseURL != ""),
		slog.String("env", c.Env),
	)
}

func getEnv(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
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
