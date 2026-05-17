package service

import (
	"context"
	"testing"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
)

func TestRetentionServiceRejectsInvalidRetentionDays(t *testing.T) {
	service := NewRetentionService(repository.NewMemoryEventRepository(), repository.NewMemoryIssueRepository())
	if _, err := service.Run(context.Background(), RetentionOptions{EventRetentionDays: 0, DryRun: true}); err == nil {
		t.Fatal("expected invalid retention days error")
	}
}

func TestRetentionServiceDryRunAndDeleteProtectIssueReferences(t *testing.T) {
	ctx := context.Background()
	events := repository.NewMemoryEventRepository()
	issues := repository.NewMemoryIssueRepository()
	retention := NewRetentionService(events, issues)
	retention.now = func() time.Time {
		return time.Date(2026, 5, 17, 12, 0, 0, 0, time.UTC)
	}

	oldEvent := testHealthEvent("old_event")
	oldEvent.CreatedAt = time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	protectedEvent := testHealthEvent("protected_event")
	protectedEvent.CreatedAt = time.Date(2026, 3, 2, 0, 0, 0, 0, time.UTC)
	newEvent := testHealthEvent("new_event")
	newEvent.CreatedAt = time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)

	for _, event := range []string{oldEvent.ID, protectedEvent.ID, newEvent.ID} {
		if event == "" {
			t.Fatal("test event id should not be empty")
		}
	}
	if _, err := events.Insert(ctx, oldEvent); err != nil {
		t.Fatalf("insert old event: %v", err)
	}
	if _, err := events.Insert(ctx, protectedEvent); err != nil {
		t.Fatalf("insert protected event: %v", err)
	}
	if _, err := events.Insert(ctx, newEvent); err != nil {
		t.Fatalf("insert new event: %v", err)
	}
	issue, err := issues.UpsertForEvent(ctx, protectedEvent, "protected", "fp_protected")
	if err != nil {
		t.Fatalf("upsert issue: %v", err)
	}
	if err := events.AttachIssue(ctx, protectedEvent.ID, issue.ID); err != nil {
		t.Fatalf("attach issue: %v", err)
	}

	dryRun, err := retention.Run(ctx, RetentionOptions{EventRetentionDays: 30, DryRun: true})
	if err != nil {
		t.Fatalf("dry-run retention: %v", err)
	}
	if dryRun.DeletedEvents != 1 || !dryRun.DryRun || dryRun.ProtectedEventIDs != 1 {
		t.Fatalf("unexpected dry-run result: %+v", dryRun)
	}
	if _, err := events.Get(ctx, oldEvent.ID); err != nil {
		t.Fatalf("dry-run should keep old event: %v", err)
	}

	run, err := retention.Run(ctx, RetentionOptions{EventRetentionDays: 30, DryRun: false})
	if err != nil {
		t.Fatalf("run retention: %v", err)
	}
	if run.DeletedEvents != 1 || run.DryRun {
		t.Fatalf("unexpected run result: %+v", run)
	}
	if _, err := events.Get(ctx, oldEvent.ID); err == nil {
		t.Fatal("old event should be deleted")
	}
	if _, err := events.Get(ctx, protectedEvent.ID); err != nil {
		t.Fatalf("protected event should remain: %v", err)
	}
	if _, err := events.Get(ctx, newEvent.ID); err != nil {
		t.Fatalf("new event should remain: %v", err)
	}
}
