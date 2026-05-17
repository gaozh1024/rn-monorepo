package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/app"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/config"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/observability"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

func main() {
	cfg := config.Load()
	logger := observability.NewLogger(cfg.Env)
	if cfg.DatabaseURL == "" {
		logger.Error("APP_HEALTH_DATABASE_URL is required for retention")
		os.Exit(1)
	}
	command := "dry-run"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	dryRun, err := retentionMode(command, cfg.RetentionDryRun)
	if err != nil {
		logger.Error("retention failed", slog.Any("error", err))
		os.Exit(1)
	}

	ctx := context.Background()
	container, err := app.NewContainer(ctx, cfg, logger)
	if err != nil {
		logger.Error("failed to initialize app container", slog.Any("error", err))
		os.Exit(1)
	}
	defer container.Close()

	result, err := appsvc.NewRetentionService(container.Events, container.Issues).Run(ctx, appsvc.RetentionOptions{
		EventRetentionDays: cfg.EventRetentionDays,
		DryRun:             dryRun,
	})
	if err != nil {
		logger.Error("retention failed", slog.String("command", command), slog.Any("error", err))
		os.Exit(1)
	}
	encoded, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		logger.Error("failed to encode retention result", slog.Any("error", err))
		os.Exit(1)
	}
	fmt.Println(string(encoded))
	logger.Info("retention completed", slog.String("command", command), slog.Int("deletedEvents", result.DeletedEvents), slog.Bool("dryRun", result.DryRun))
}

func retentionMode(command string, envDryRun bool) (bool, error) {
	switch command {
	case "dry-run":
		return true, nil
	case "run":
		return false, nil
	case "env":
		return envDryRun, nil
	default:
		return false, fmt.Errorf("unsupported retention command %q", command)
	}
}
