package service

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/alert"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
)

type IngestService struct {
	events repository.EventRepository
	issues repository.IssueRepository
	alerts alert.Notifier
}

const (
	maxIngestEvents       = 100
	maxBreadcrumbsPerItem = 100
	maxTagsPerItem        = 50
	maxExtraBytesPerItem  = 64 * 1024
	maxFutureClockSkew    = 24 * time.Hour
)

func NewIngestService(events repository.EventRepository, issues repository.IssueRepository, notifiers ...alert.Notifier) *IngestService {
	notifier := alert.Notifier(alert.NoopNotifier{})
	if len(notifiers) > 0 && notifiers[0] != nil {
		notifier = notifiers[0]
	}
	return &IngestService{events: events, issues: issues, alerts: notifier}
}

func (s *IngestService) Ingest(ctx context.Context, input []domain.HealthEvent) (domain.IngestEventsResponse, error) {
	if len(input) > maxIngestEvents {
		return domain.IngestEventsResponse{}, errors.New("events must contain at most 100 items")
	}
	response := domain.IngestEventsResponse{}
	for _, event := range input {
		normalized, ok := normalizeEvent(event, time.Now())
		if !ok {
			response.Rejected++
			continue
		}

		fingerprint := eventFingerprint(normalized)
		if fingerprint != "" && normalized.Error != nil {
			normalized.Error.Fingerprint = fingerprint
		}

		saved, err := s.events.Insert(ctx, normalized)
		if errors.Is(err, repository.ErrDuplicate) {
			response.Duplicated++
			continue
		}
		if err != nil {
			return response, err
		}

		if fingerprint != "" {
			issue, err := s.issues.UpsertForEvent(ctx, saved, issueTitle(saved), fingerprint)
			if err != nil {
				return response, err
			}
			if err := s.events.AttachIssue(ctx, saved.ID, issue.ID); err != nil {
				return response, err
			}
			saved.IssueID = issue.ID
			_ = s.alerts.Notify(ctx, alert.Notification{
				Title:       "App Health " + string(saved.Level) + ": " + issue.Title,
				AppID:       saved.App.ID,
				Level:       saved.Level,
				Fingerprint: fingerprint,
				EventID:     saved.ID,
				IssueID:     issue.ID,
				Timestamp:   saved.CreatedAt,
				Event:       saved,
				Issue:       issue,
			})
		}
		response.Accepted++
	}
	return response, nil
}

func normalizeEvent(event domain.HealthEvent, now time.Time) (domain.HealthEvent, bool) {
	if strings.TrimSpace(event.ID) == "" || strings.TrimSpace(event.Type) == "" || strings.TrimSpace(event.App.ID) == "" || strings.TrimSpace(event.Session.ID) == "" {
		return domain.HealthEvent{}, false
	}
	if event.Level == "" {
		event.Level = domain.LevelInfo
	}
	if !isValidLevel(event.Level) {
		return domain.HealthEvent{}, false
	}
	if event.Timestamp <= 0 {
		event.Timestamp = now.UnixMilli()
	}
	if event.Timestamp > now.Add(maxFutureClockSkew).UnixMilli() {
		return domain.HealthEvent{}, false
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = now.UTC()
	}
	if len(event.Breadcrumbs) > maxBreadcrumbsPerItem || len(event.Tags) > maxTagsPerItem {
		return domain.HealthEvent{}, false
	}
	if !isJSONSizeAllowed(event.Extra, maxExtraBytesPerItem) {
		return domain.HealthEvent{}, false
	}
	return event, true
}

func isValidLevel(level domain.EventLevel) bool {
	switch level {
	case domain.LevelInfo, domain.LevelWarning, domain.LevelError, domain.LevelFatal:
		return true
	default:
		return false
	}
}

func isJSONSizeAllowed(value any, maxBytes int) bool {
	if value == nil {
		return true
	}
	encoded, err := json.Marshal(value)
	return err == nil && len(encoded) <= maxBytes
}

func eventFingerprint(event domain.HealthEvent) string {
	if event.Error == nil {
		return ""
	}
	if event.Error.Fingerprint != "" {
		return event.Error.Fingerprint
	}
	if event.Error.Message == "" && event.Error.Stack == "" {
		return ""
	}
	firstStackLine := ""
	for _, line := range strings.Split(event.Error.Stack, "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			firstStackLine = line
			break
		}
	}
	sum := sha1.Sum([]byte(event.Error.Name + "|" + event.Error.Message + "|" + firstStackLine))
	return "fp_" + hex.EncodeToString(sum[:8])
}

func issueTitle(event domain.HealthEvent) string {
	if event.Error == nil {
		return event.Type
	}
	if event.Error.Name != "" && event.Error.Message != "" {
		return event.Error.Name + ": " + event.Error.Message
	}
	if event.Error.Message != "" {
		return event.Error.Message
	}
	return event.Type
}
