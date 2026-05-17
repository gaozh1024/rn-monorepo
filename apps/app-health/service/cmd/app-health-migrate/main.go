package main

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/config"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/observability"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

const migrationsDir = "internal/db/migrations"

func main() {
	cfg := config.Load()
	logger := observability.NewLogger(cfg.Env)
	if cfg.DatabaseURL == "" {
		logger.Error("APP_HEALTH_DATABASE_URL is required for migrations")
		os.Exit(1)
	}
	command := "status"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	database, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to open database", slog.Any("error", err))
		os.Exit(1)
	}
	defer database.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		logger.Error("failed to set goose dialect", slog.Any("error", err))
		os.Exit(1)
	}

	if err := run(command, database); err != nil {
		logger.Error("migration failed", slog.String("command", command), slog.Any("error", err))
		os.Exit(1)
	}
	logger.Info("migration completed", slog.String("command", command))
}

func run(command string, database *sql.DB) error {
	switch command {
	case "up":
		return goose.Up(database, migrationsDir)
	case "down":
		return goose.Down(database, migrationsDir)
	case "status":
		return goose.Status(database, migrationsDir)
	case "reset":
		return goose.Reset(database, migrationsDir)
	default:
		return fmt.Errorf("unsupported migration command %q", command)
	}
}
