package httpapi

import (
	"log/slog"
	"net/http"

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

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("content-type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	requireIngest := middleware.RequireBearer(cfg.IngestToken)
	requireAdmin := middleware.RequireBearer(cfg.AdminToken)

	mux.Handle("POST /api/app-health/events", requireIngest(ingestHandler))
	mux.Handle("GET /api/app-health/events", requireAdmin(http.HandlerFunc(eventsHandler.List)))
	mux.Handle("GET /api/app-health/events/{id}", requireAdmin(http.HandlerFunc(eventsHandler.Get)))
	mux.Handle("GET /api/app-health/issues", requireAdmin(http.HandlerFunc(issuesHandler.List)))
	mux.Handle("GET /api/app-health/issues/{id}", requireAdmin(http.HandlerFunc(issuesHandler.Get)))
	mux.Handle("PATCH /api/app-health/issues/{id}/status", requireAdmin(http.HandlerFunc(issuesHandler.UpdateStatus)))
	mux.Handle("GET /api/app-health/stats/overview", requireAdmin(http.HandlerFunc(statsHandler.Overview)))

	return middleware.Recover(logger)(middleware.CORS(cfg.CORSOrigins)(mux))
}
