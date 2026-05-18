package service

import (
	"context"
	"errors"
	"testing"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/alert"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
)

type recordingNotifier struct {
	err           error
	notifications []alert.Notification
}

func (n *recordingNotifier) Notify(_ context.Context, notification alert.Notification) error {
	n.notifications = append(n.notifications, notification)
	return n.err
}

func TestIngestNotifiesAfterIssueIsCreated(t *testing.T) {
	events := repository.NewMemoryEventRepository()
	issues := repository.NewMemoryIssueRepository()
	notifier := &recordingNotifier{}
	ingest := NewIngestService(events, issues, notifier)

	response, err := ingest.Ingest(context.Background(), []domain.HealthEvent{testHealthEvent("event_1")})
	if err != nil {
		t.Fatalf("ingest: %v", err)
	}
	if response.Accepted != 1 {
		t.Fatalf("expected accepted event, got %+v", response)
	}
	if len(notifier.notifications) != 1 {
		t.Fatalf("expected one notification, got %d", len(notifier.notifications))
	}
	notification := notifier.notifications[0]
	if notification.EventID != "event_1" || notification.IssueID == "" || notification.Fingerprint == "" {
		t.Fatalf("unexpected notification: %+v", notification)
	}
}

func TestIngestIgnoresNotifierFailure(t *testing.T) {
	events := repository.NewMemoryEventRepository()
	issues := repository.NewMemoryIssueRepository()
	notifier := &recordingNotifier{err: errors.New("webhook failed")}
	ingest := NewIngestService(events, issues, notifier)

	response, err := ingest.Ingest(context.Background(), []domain.HealthEvent{testHealthEvent("event_1")})
	if err != nil {
		t.Fatalf("ingest should ignore notifier failure: %v", err)
	}
	if response.Accepted != 1 {
		t.Fatalf("expected accepted event, got %+v", response)
	}
}

func TestIngestDoesNotNotifyDuplicateEvent(t *testing.T) {
	events := repository.NewMemoryEventRepository()
	issues := repository.NewMemoryIssueRepository()
	notifier := &recordingNotifier{}
	ingest := NewIngestService(events, issues, notifier)

	event := testHealthEvent("event_1")
	if _, err := ingest.Ingest(context.Background(), []domain.HealthEvent{event}); err != nil {
		t.Fatalf("first ingest: %v", err)
	}
	response, err := ingest.Ingest(context.Background(), []domain.HealthEvent{event})
	if err != nil {
		t.Fatalf("second ingest: %v", err)
	}
	if response.Duplicated != 1 {
		t.Fatalf("expected duplicate response, got %+v", response)
	}
	if len(notifier.notifications) != 1 {
		t.Fatalf("expected duplicate not to notify again, got %d calls", len(notifier.notifications))
	}
}

func testHealthEvent(id string) domain.HealthEvent {
	return domain.HealthEvent{
		ID:        id,
		Type:      "error",
		Level:     domain.LevelFatal,
		Timestamp: 1,
		App: domain.AppInfo{
			ID:          "com.example.app",
			Version:     "1.0.0",
			BuildNumber: "1",
		},
		Device: domain.DeviceInfo{
			Platform: "ios",
		},
		Session: domain.SessionInfo{
			ID: "session_1",
		},
		Error: &domain.ErrorInfo{
			Name:    "TypeError",
			Message: "boom",
			Stack:   "at App",
		},
	}
}
