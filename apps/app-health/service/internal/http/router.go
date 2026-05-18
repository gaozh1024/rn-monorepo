package httpapi

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	appcontainer "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/app"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/config"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/http/handlers"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/http/middleware"
)

func NewRouter(cfg config.Config, logger *slog.Logger, container *appcontainer.Container) http.Handler {
	ingestHandler := handlers.NewIngestHandler(container.Ingest)
	eventsHandler := handlers.NewEventsHandler(container.Event)
	issuesHandler := handlers.NewIssuesHandler(container.Issue)
	statsHandler := handlers.NewStatsHandler(container.Stats)
	authHandler := handlers.NewAuthHandler(container.Auth, container.Session, cfg.CookieSecure)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("content-type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		payload := map[string]any{
			"status":             "ok",
			"databaseConfigured": container.DatabaseConfigured(),
		}
		status := http.StatusOK
		if err := container.Ready(ctx); err != nil {
			status = http.StatusServiceUnavailable
			payload["status"] = "unavailable"
			payload["error"] = "database unavailable"
		}

		w.Header().Set("content-type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(payload)
	})

	requireIngest := middleware.RequireBearer(cfg.IngestToken)
	requireAdmin := middleware.RequireAdmin(cfg.AdminToken, container.Session)

	ingestPipeline := middleware.MaxBodyBytes(cfg.MaxBodyBytes)(ingestHandler)
	ingestPipeline = middleware.RateLimit(cfg.IngestRateLimitRPS, cfg.IngestRateLimitBurst)(ingestPipeline)

	mux.Handle("POST /api/app-health/events", requireIngest(ingestPipeline))
	mux.HandleFunc("POST /api/app-health/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/app-health/auth/logout", authHandler.Logout)
	mux.Handle("GET /api/app-health/auth/me", requireAdmin(http.HandlerFunc(authHandler.Me)))
	mux.Handle("GET /api/app-health/events", requireAdmin(http.HandlerFunc(eventsHandler.List)))
	mux.Handle("GET /api/app-health/events/{id}", requireAdmin(http.HandlerFunc(eventsHandler.Get)))
	mux.Handle("GET /api/app-health/issues", requireAdmin(http.HandlerFunc(issuesHandler.List)))
	mux.Handle("GET /api/app-health/issues/{id}", requireAdmin(http.HandlerFunc(issuesHandler.Get)))
	mux.Handle("PATCH /api/app-health/issues/{id}/status", requireAdmin(http.HandlerFunc(issuesHandler.UpdateStatus)))
	mux.Handle("GET /api/app-health/stats/overview", requireAdmin(http.HandlerFunc(statsHandler.Overview)))

	return middleware.Recover(logger)(middleware.CORS(cfg.CORSOrigins)(mux))
}
