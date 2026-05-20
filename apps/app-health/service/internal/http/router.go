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
	applicationsHandler := handlers.NewApplicationsHandler(container.Application)
	alertsHandler := handlers.NewAlertsHandler(container.Alert)
	settingsHandler := handlers.NewSettingsHandler(container.Settings, container.Retention)
	analyticsHandler := handlers.NewAnalyticsHandler(container.AnalyticsSvc)

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

	requireIngest := middleware.RequireIngest(container.IngestAuth)
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
	mux.Handle("GET /api/app-health/analytics/users/{userId}/timeline", requireAdmin(http.HandlerFunc(analyticsHandler.UserTimeline)))
	mux.Handle("GET /api/app-health/analytics/events/{eventId}/timeline", requireAdmin(http.HandlerFunc(analyticsHandler.EventTimeline)))
	mux.Handle("GET /api/app-health/analytics/screens", requireAdmin(http.HandlerFunc(analyticsHandler.ScreenStats)))
	mux.Handle("GET /api/app-health/analytics/distribution", requireAdmin(http.HandlerFunc(analyticsHandler.Distribution)))
	mux.Handle("GET /api/app-health/applications", requireAdmin(http.HandlerFunc(applicationsHandler.List)))
	mux.Handle("POST /api/app-health/applications", requireAdmin(http.HandlerFunc(applicationsHandler.Create)))
	mux.Handle("GET /api/app-health/applications/{id}", requireAdmin(http.HandlerFunc(applicationsHandler.Get)))
	mux.Handle("PATCH /api/app-health/applications/{id}", requireAdmin(http.HandlerFunc(applicationsHandler.Update)))
	mux.Handle("POST /api/app-health/applications/{id}/enable", requireAdmin(http.HandlerFunc(applicationsHandler.Enable)))
	mux.Handle("POST /api/app-health/applications/{id}/disable", requireAdmin(http.HandlerFunc(applicationsHandler.Disable)))
	mux.Handle("DELETE /api/app-health/applications/{id}", requireAdmin(http.HandlerFunc(applicationsHandler.Delete)))
	mux.Handle("DELETE /api/app-health/applications/{id}/data", requireAdmin(http.HandlerFunc(applicationsHandler.DeleteData)))
	mux.Handle("POST /api/app-health/applications/{id}/tokens", requireAdmin(http.HandlerFunc(applicationsHandler.CreateToken)))
	mux.Handle("POST /api/app-health/tokens/{id}/revoke", requireAdmin(http.HandlerFunc(applicationsHandler.RevokeToken)))
	mux.Handle("DELETE /api/app-health/tokens/{id}", requireAdmin(http.HandlerFunc(applicationsHandler.DeleteToken)))
	mux.Handle("GET /api/app-health/alert-rules", requireAdmin(http.HandlerFunc(alertsHandler.ListRules)))
	mux.Handle("POST /api/app-health/alert-rules", requireAdmin(http.HandlerFunc(alertsHandler.CreateRule)))
	mux.Handle("GET /api/app-health/alert-rules/{id}", requireAdmin(http.HandlerFunc(alertsHandler.GetRule)))
	mux.Handle("PATCH /api/app-health/alert-rules/{id}", requireAdmin(http.HandlerFunc(alertsHandler.UpdateRule)))
	mux.Handle("DELETE /api/app-health/alert-rules/{id}", requireAdmin(http.HandlerFunc(alertsHandler.DeleteRule)))
	mux.Handle("POST /api/app-health/alert-rules/{id}/enable", requireAdmin(http.HandlerFunc(alertsHandler.EnableRule)))
	mux.Handle("POST /api/app-health/alert-rules/{id}/disable", requireAdmin(http.HandlerFunc(alertsHandler.DisableRule)))
	mux.Handle("POST /api/app-health/alert-rules/{id}/test", requireAdmin(http.HandlerFunc(alertsHandler.TestRule)))
	mux.Handle("GET /api/app-health/alert-deliveries", requireAdmin(http.HandlerFunc(alertsHandler.ListDeliveries)))
	mux.Handle("GET /api/app-health/settings/summary", requireAdmin(http.HandlerFunc(settingsHandler.Summary)))
	mux.Handle("POST /api/app-health/retention/dry-run", requireAdmin(http.HandlerFunc(settingsHandler.RetentionDryRun)))
	mux.Handle("POST /api/app-health/retention/run", requireAdmin(http.HandlerFunc(settingsHandler.RetentionRun)))
	mux.Handle("GET /api/app-health/retention/runs", requireAdmin(http.HandlerFunc(settingsHandler.RetentionRuns)))

	return middleware.Recover(logger)(middleware.CORS(cfg.CORSOrigins)(mux))
}
