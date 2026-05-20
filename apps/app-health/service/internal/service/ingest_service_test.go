package service

import (
	"context"
	"errors"
	"strings"
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

func TestIngestAcceptsAnalyticsAndDeviceBrand(t *testing.T) {
	events := repository.NewMemoryEventRepository()
	ingest := NewIngestService(events, repository.NewMemoryIssueRepository())
	event := testHealthEvent("analytics_1")
	event.Type = "analytics_event"
	event.Level = domain.LevelInfo
	event.Error = nil
	event.Analytics = &domain.AnalyticsInfo{Name: " checkout.tap ", Properties: map[string]any{"sku": "demo", "count": 1}}
	event.Device.Model = " iPhone 15 "
	event.Device.Brand = " Apple "
	event.Geo = &domain.GeoInfo{City: "Shanghai"}

	response, err := ingest.Ingest(context.Background(), []domain.HealthEvent{event})
	if err != nil {
		t.Fatalf("ingest: %v", err)
	}
	if response.Accepted != 1 || response.Rejected != 0 {
		t.Fatalf("unexpected response: %+v", response)
	}
	saved, err := events.Get(context.Background(), "analytics_1")
	if err != nil {
		t.Fatalf("get saved event: %v", err)
	}
	if saved.Analytics == nil || saved.Analytics.Name != "checkout.tap" {
		t.Fatalf("analytics not normalized: %+v", saved.Analytics)
	}
	if saved.Device.Model != "iPhone 15" || saved.Device.Brand != "Apple" {
		t.Fatalf("device not normalized: %+v", saved.Device)
	}
	if saved.Geo != nil {
		t.Fatalf("client geo should be ignored: %+v", saved.Geo)
	}
}

func TestIngestRejectsInvalidAnalyticsPayloads(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*domain.HealthEvent)
	}{
		{
			name: "long analytics name",
			mutate: func(event *domain.HealthEvent) {
				event.Analytics = &domain.AnalyticsInfo{Name: strings.Repeat("a", maxAnalyticsNameLength+1)}
			},
		},
		{
			name: "long analytics property key",
			mutate: func(event *domain.HealthEvent) {
				event.Analytics = &domain.AnalyticsInfo{Name: "tap", Properties: map[string]any{strings.Repeat("k", maxAnalyticsPropertyKeySize+1): "value"}}
			},
		},
		{
			name: "deep analytics properties",
			mutate: func(event *domain.HealthEvent) {
				event.Analytics = &domain.AnalyticsInfo{Name: "tap", Properties: map[string]any{"a": map[string]any{"b": map[string]any{"c": map[string]any{"d": true}}}}}
			},
		},
		{
			name: "long device brand",
			mutate: func(event *domain.HealthEvent) {
				event.Device.Brand = strings.Repeat("b", maxDeviceBrandLength+1)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			events := repository.NewMemoryEventRepository()
			ingest := NewIngestService(events, repository.NewMemoryIssueRepository())
			event := testHealthEvent("invalid_" + strings.ReplaceAll(tt.name, " ", "_"))
			event.Type = "analytics_event"
			event.Level = domain.LevelInfo
			event.Error = nil
			tt.mutate(&event)

			response, err := ingest.Ingest(context.Background(), []domain.HealthEvent{event})
			if err != nil {
				t.Fatalf("ingest: %v", err)
			}
			if response.Rejected != 1 || response.Accepted != 0 {
				t.Fatalf("unexpected response: %+v", response)
			}
		})
	}
}
