package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
)

func TestRetentionOperationServiceRequiresDryRunBeforeRun(t *testing.T) {
	ctx := context.Background()
	events := repository.NewMemoryEventRepository()
	issues := repository.NewMemoryIssueRepository()
	runs := repository.NewMemoryRetentionRunRepository()
	service := NewRetentionOperationService(NewRetentionService(events, issues), runs, 30)

	_, err := service.Run(ctx, RetentionRunInput{
		EventRetentionDays: 30,
		DryRunID:           "missing",
		ConfirmText:        RetentionRunConfirmText,
		AcknowledgedBackup: true,
		AcknowledgedDryRun: true,
	})
	if !errors.Is(err, ErrRetentionRunNotConfirmed) {
		t.Fatalf("expected ErrRetentionRunNotConfirmed, got %v", err)
	}
}

func TestRetentionOperationServiceRunRequiresExplicitConfirmation(t *testing.T) {
	ctx := context.Background()
	events := repository.NewMemoryEventRepository()
	issues := repository.NewMemoryIssueRepository()
	runs := repository.NewMemoryRetentionRunRepository()
	service := NewRetentionOperationService(NewRetentionService(events, issues), runs, 30)
	dryRun, err := service.DryRun(ctx, RetentionDryRunInput{EventRetentionDays: 30})
	if err != nil {
		t.Fatalf("dry run failed: %v", err)
	}

	_, err = service.Run(ctx, RetentionRunInput{
		EventRetentionDays: 30,
		DryRunID:           dryRun.ID,
		ConfirmText:        "delete",
		AcknowledgedBackup: true,
		AcknowledgedDryRun: true,
	})
	if !errors.Is(err, ErrRetentionRunNotConfirmed) {
		t.Fatalf("expected ErrRetentionRunNotConfirmed, got %v", err)
	}

	_, err = service.Run(ctx, RetentionRunInput{
		EventRetentionDays: 30,
		DryRunID:           dryRun.ID,
		ConfirmText:        RetentionRunConfirmText,
		AcknowledgedBackup: false,
		AcknowledgedDryRun: true,
	})
	if !errors.Is(err, ErrRetentionRunNotConfirmed) {
		t.Fatalf("expected backup confirmation error, got %v", err)
	}
}

func TestRetentionOperationServiceDryRunAndRunRecordHistory(t *testing.T) {
	ctx := context.Background()
	events := repository.NewMemoryEventRepository()
	issues := repository.NewMemoryIssueRepository()
	runs := repository.NewMemoryRetentionRunRepository()
	retention := NewRetentionService(events, issues)
	service := NewRetentionOperationService(retention, runs, 30)
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return now }
	retention.now = func() time.Time { return now }

	oldEvent := domain.HealthEvent{ID: "old", App: domain.AppInfo{ID: "demo"}, CreatedAt: now.AddDate(0, 0, -40)}
	newEvent := domain.HealthEvent{ID: "new", App: domain.AppInfo{ID: "demo"}, CreatedAt: now.AddDate(0, 0, -1)}
	if _, err := events.Insert(ctx, oldEvent); err != nil {
		t.Fatalf("insert old event: %v", err)
	}
	if _, err := events.Insert(ctx, newEvent); err != nil {
		t.Fatalf("insert new event: %v", err)
	}

	dryRun, err := service.DryRun(ctx, RetentionDryRunInput{EventRetentionDays: 30, RequestedBy: "admin@example.com"})
	if err != nil {
		t.Fatalf("dry run failed: %v", err)
	}
	if dryRun.Mode != domain.RetentionRunModeDryRun || !dryRun.DryRun || dryRun.DeletedEvents != 1 {
		t.Fatalf("unexpected dry run: %+v", dryRun)
	}

	run, err := service.Run(ctx, RetentionRunInput{
		EventRetentionDays: 30,
		DryRunID:           dryRun.ID,
		ConfirmText:        RetentionRunConfirmText,
		AcknowledgedBackup: true,
		AcknowledgedDryRun: true,
		RequestedBy:        "admin@example.com",
	})
	if err != nil {
		t.Fatalf("run failed: %v", err)
	}
	if run.Mode != domain.RetentionRunModeRun || run.DryRun || run.DeletedEvents != 1 {
		t.Fatalf("unexpected run: %+v", run)
	}
	if _, err := events.Get(ctx, "old"); !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("expected old event deleted, got %v", err)
	}
	if _, err := events.Get(ctx, "new"); err != nil {
		t.Fatalf("expected new event retained: %v", err)
	}

	history, err := service.List(ctx, 20)
	if err != nil {
		t.Fatalf("list history: %v", err)
	}
	if history.Total != 2 || len(history.Items) != 2 {
		t.Fatalf("expected two history rows, got %+v", history)
	}
}

func TestRetentionOperationServiceRejectsStaleDryRun(t *testing.T) {
	ctx := context.Background()
	events := repository.NewMemoryEventRepository()
	issues := repository.NewMemoryIssueRepository()
	runs := repository.NewMemoryRetentionRunRepository()
	retention := NewRetentionService(events, issues)
	service := NewRetentionOperationService(retention, runs, 30)
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return now }
	dryRun, err := service.DryRun(ctx, RetentionDryRunInput{EventRetentionDays: 30})
	if err != nil {
		t.Fatalf("dry run failed: %v", err)
	}
	service.now = func() time.Time { return now.Add(31 * time.Minute) }

	_, err = service.Run(ctx, RetentionRunInput{
		EventRetentionDays: 30,
		DryRunID:           dryRun.ID,
		ConfirmText:        RetentionRunConfirmText,
		AcknowledgedBackup: true,
		AcknowledgedDryRun: true,
	})
	if !errors.Is(err, ErrRetentionRunNotConfirmed) {
		t.Fatalf("expected stale dry-run rejection, got %v", err)
	}
}
