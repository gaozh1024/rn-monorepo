package service

import (
	"context"
	"strings"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/config"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

type ReadinessChecker interface {
	DatabaseConfigured() bool
	Ready(context.Context) error
}

type SettingsService struct {
	cfg       config.Config
	readiness ReadinessChecker
}

func NewSettingsService(cfg config.Config, readiness ReadinessChecker) *SettingsService {
	return &SettingsService{cfg: cfg, readiness: readiness}
}

func (s *SettingsService) Summary(ctx context.Context) domain.SettingsSummaryResponse {
	databaseConfigured := false
	databaseReady := true
	if s.readiness != nil {
		databaseConfigured = s.readiness.DatabaseConfigured()
		databaseReady = s.readiness.Ready(ctx) == nil
	}
	warnings := []string{"retention run requires a recent dry-run and explicit confirmation"}
	if !databaseConfigured {
		warnings = append(warnings, "database is not configured; current data and operation history are in-memory only")
	}
	if strings.TrimSpace(s.cfg.SessionSecret) == "" {
		warnings = append(warnings, "APP_HEALTH_SESSION_SECRET is not configured; restart will invalidate sessions")
	}
	if strings.TrimSpace(s.cfg.AdminPasswordHash) == "" {
		warnings = append(warnings, "APP_HEALTH_ADMIN_PASSWORD_HASH is not configured; password login is disabled")
	}
	return domain.SettingsSummaryResponse{
		Service: domain.RuntimeConfigSummary{
			Env:                  s.cfg.Env,
			DatabaseConfigured:   databaseConfigured,
			DatabaseReady:        databaseReady,
			CORSOrigins:          append([]string{}, s.cfg.CORSOrigins...),
			MaxBodyBytes:         s.cfg.MaxBodyBytes,
			IngestRateLimitRPS:   s.cfg.IngestRateLimitRPS,
			IngestRateLimitBurst: s.cfg.IngestRateLimitBurst,
		},
		Retention: domain.RetentionConfigSummary{
			EventRetentionDays: s.cfg.EventRetentionDays,
			RetentionDryRun:    s.cfg.RetentionDryRun,
		},
		Alerts: domain.AlertConfigSummary{
			EnvFallbackEnabled: strings.TrimSpace(s.cfg.AlertWebhookURL) != "",
			MinLevel:           s.cfg.AlertMinLevel,
			CooldownSeconds:    s.cfg.AlertCooldownSeconds,
			TimeoutSeconds:     s.cfg.AlertTimeoutSeconds,
		},
		Admin: domain.AdminConfigSummary{
			Email:                   s.cfg.AdminEmail,
			AdminTokenConfigured:    strings.TrimSpace(s.cfg.AdminToken) != "",
			AdminPasswordConfigured: strings.TrimSpace(s.cfg.AdminPasswordHash) != "",
			SessionSecretConfigured: strings.TrimSpace(s.cfg.SessionSecret) != "",
			CookieSecure:            s.cfg.CookieSecure,
			SessionTTLHours:         s.cfg.SessionTTLHours,
		},
		Warnings: warnings,
	}
}
