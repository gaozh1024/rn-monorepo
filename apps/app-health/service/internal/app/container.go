package app

import (
	"context"
	"log/slog"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/config"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/db"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Container struct {
	Pool   *pgxpool.Pool
	Events repository.EventRepository
	Issues repository.IssueRepository
	Ingest *appsvc.IngestService
	Event  *appsvc.EventService
	Issue  *appsvc.IssueService
	Stats  *appsvc.StatsService
}

func NewContainer(ctx context.Context, cfg config.Config, logger *slog.Logger) (*Container, error) {
	var pool *pgxpool.Pool
	var events repository.EventRepository
	var issues repository.IssueRepository

	if cfg.DatabaseURL != "" {
		openedPool, err := db.Open(ctx, cfg.DatabaseURL)
		if err != nil {
			return nil, err
		}
		pool = openedPool
		events = repository.NewPostgresEventRepository(pool)
		issues = repository.NewPostgresIssueRepository(pool)
		logger.Info("using postgres app-health repositories")
	} else {
		events = repository.NewMemoryEventRepository()
		issues = repository.NewMemoryIssueRepository()
		logger.Warn("APP_HEALTH_DATABASE_URL is empty; using in-memory app-health repositories")
	}

	return &Container{
		Pool:   pool,
		Events: events,
		Issues: issues,
		Ingest: appsvc.NewIngestService(events, issues),
		Event:  appsvc.NewEventService(events),
		Issue:  appsvc.NewIssueService(issues, events),
		Stats:  appsvc.NewStatsService(events, issues),
	}, nil
}

func (c *Container) Close() {
	if c != nil && c.Pool != nil {
		c.Pool.Close()
	}
}
