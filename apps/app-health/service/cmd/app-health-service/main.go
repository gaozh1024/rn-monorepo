package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/app"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/config"
	httpapi "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/http"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/observability"
)

func main() {
	cfg := config.Load()
	logger := observability.NewLogger(cfg.Env)
	logger.Info("starting app-health service", slog.Any("config", cfg))

	container, err := app.NewContainer(context.Background(), cfg, logger)
	if err != nil {
		logger.Error("failed to initialize app container", slog.Any("error", err))
		panic(err)
	}
	defer container.Close()

	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpapi.NewRouter(cfg, logger, container),
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			logger.Error("shutdown failed", slog.Any("error", err))
		}
	}()

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server stopped with error", slog.Any("error", err))
		panic(err)
	}
	logger.Info("app-health service stopped")
}
