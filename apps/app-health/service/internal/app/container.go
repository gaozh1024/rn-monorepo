package app

import (
	"context"
	"log/slog"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/alert"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/config"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/db"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Container struct {
	Pool          *pgxpool.Pool
	Events        repository.EventRepository
	Issues        repository.IssueRepository
	Applications  repository.ApplicationRepository
	Tokens        repository.IngestTokenRepository
	AlertRules    repository.AlertRuleRepository
	Deliveries    repository.AlertDeliveryRepository
	RetentionRuns repository.RetentionRunRepository
	Analytics     repository.AnalyticsRepository
	Ingest        *appsvc.IngestService
	IngestAuth    *appsvc.IngestAuthService
	Application   *appsvc.ApplicationService
	Alert         *appsvc.AlertRuleService
	Event         *appsvc.EventService
	Issue         *appsvc.IssueService
	Stats         *appsvc.StatsService
	Auth          *appsvc.AuthService
	Session       *appsvc.SessionService
	Retention     *appsvc.RetentionOperationService
	Settings      *appsvc.SettingsService
	AnalyticsSvc  *appsvc.AnalyticsService
}

func NewContainer(ctx context.Context, cfg config.Config, logger *slog.Logger) (*Container, error) {
	var pool *pgxpool.Pool
	var events repository.EventRepository
	var issues repository.IssueRepository
	var applications repository.ApplicationRepository
	var tokens repository.IngestTokenRepository
	var alertRules repository.AlertRuleRepository
	var deliveries repository.AlertDeliveryRepository
	var retentionRuns repository.RetentionRunRepository
	var analytics repository.AnalyticsRepository

	if cfg.DatabaseURL != "" {
		openedPool, err := db.Open(ctx, cfg.DatabaseURL)
		if err != nil {
			return nil, err
		}
		pool = openedPool
		events = repository.NewPostgresEventRepository(pool)
		issues = repository.NewPostgresIssueRepository(pool)
		applications = repository.NewPostgresApplicationRepository(pool)
		tokens = repository.NewPostgresIngestTokenRepository(pool)
		alertRules = repository.NewPostgresAlertRuleRepository(pool)
		deliveries = repository.NewPostgresAlertDeliveryRepository(pool)
		retentionRuns = repository.NewPostgresRetentionRunRepository(pool)
		analytics = repository.NewPostgresAnalyticsRepository(pool)
		logger.Info("using postgres app-health repositories")
	} else {
		memoryEvents := repository.NewMemoryEventRepository()
		events = memoryEvents
		issues = repository.NewMemoryIssueRepository()
		memoryApplications := repository.NewMemoryApplicationRepository(events, issues)
		memoryTokens := repository.NewMemoryIngestTokenRepository()
		memoryApplications.AttachTokens(memoryTokens)
		applications = memoryApplications
		tokens = memoryTokens
		alertRules = repository.NewMemoryAlertRuleRepository()
		deliveries = repository.NewMemoryAlertDeliveryRepository()
		retentionRuns = repository.NewMemoryRetentionRunRepository()
		analytics = repository.NewMemoryAnalyticsRepository(memoryEvents)
		logger.Warn("APP_HEALTH_DATABASE_URL is empty; using in-memory app-health repositories")
	}

	alertLevel, err := alert.ParseLevel(cfg.AlertMinLevel)
	if err != nil {
		return nil, err
	}
	notifier, err := alert.NewWebhookNotifier(alert.Config{
		WebhookURL: cfg.AlertWebhookURL,
		MinLevel:   alertLevel,
		Cooldown:   time.Duration(cfg.AlertCooldownSeconds) * time.Second,
		Timeout:    time.Duration(cfg.AlertTimeoutSeconds) * time.Second,
		Async:      true,
	})
	if err != nil {
		return nil, err
	}
	dispatcher := alert.NewRuleDispatcher(alertRules, deliveries, notifier, time.Duration(cfg.AlertTimeoutSeconds)*time.Second)

	container := &Container{
		Pool:          pool,
		Events:        events,
		Issues:        issues,
		Applications:  applications,
		Tokens:        tokens,
		AlertRules:    alertRules,
		Deliveries:    deliveries,
		RetentionRuns: retentionRuns,
		Analytics:     analytics,
		Ingest:        appsvc.NewIngestService(events, issues, dispatcher),
		IngestAuth:    appsvc.NewIngestAuthService(cfg.IngestToken, applications, tokens),
		Application:   appsvc.NewApplicationService(applications, tokens, events, issues),
		Alert:         appsvc.NewAlertRuleService(alertRules, deliveries, dispatcher),
		Event:         appsvc.NewEventService(events),
		Issue:         appsvc.NewIssueService(issues, events),
		Stats:         appsvc.NewStatsService(events, issues),
		Auth:          appsvc.NewAuthService(cfg.AdminEmail, cfg.AdminPasswordHash),
		Session:       appsvc.NewSessionService(cfg.SessionSecret, time.Duration(cfg.SessionTTLHours)*time.Hour),
		Retention:     appsvc.NewRetentionOperationService(appsvc.NewRetentionService(events, issues), retentionRuns, cfg.EventRetentionDays),
		AnalyticsSvc:  appsvc.NewAnalyticsService(analytics),
	}
	container.Settings = appsvc.NewSettingsService(cfg, container)
	return container, nil
}

func (c *Container) Close() {
	if c != nil && c.Pool != nil {
		c.Pool.Close()
	}
}

func (c *Container) DatabaseConfigured() bool {
	return c != nil && c.Pool != nil
}

func (c *Container) Ready(ctx context.Context) error {
	if c == nil || c.Pool == nil {
		return nil
	}
	return c.Pool.Ping(ctx)
}
