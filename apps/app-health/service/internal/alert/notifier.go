package alert

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

type Notification struct {
	Title       string             `json:"title"`
	AppID       string             `json:"appId"`
	Level       domain.EventLevel  `json:"level"`
	Fingerprint string             `json:"fingerprint"`
	EventID     string             `json:"eventId"`
	IssueID     string             `json:"issueId"`
	Timestamp   time.Time          `json:"timestamp"`
	Event       domain.HealthEvent `json:"event"`
	Issue       domain.HealthIssue `json:"issue"`
}

type Notifier interface {
	Notify(context.Context, Notification) error
}

type NoopNotifier struct{}

func (NoopNotifier) Notify(context.Context, Notification) error { return nil }

type Config struct {
	WebhookURL string
	MinLevel   domain.EventLevel
	Cooldown   time.Duration
	Timeout    time.Duration
	Async      bool
	HTTPClient *http.Client
}

func ParseLevel(value string) (domain.EventLevel, error) {
	switch domain.EventLevel(value) {
	case "", domain.LevelFatal:
		return domain.LevelFatal, nil
	case domain.LevelError:
		return domain.LevelError, nil
	case domain.LevelWarning:
		return domain.LevelWarning, nil
	case domain.LevelInfo:
		return domain.LevelInfo, nil
	default:
		return "", errors.New("unsupported alert level")
	}
}

func ShouldNotify(level domain.EventLevel, minLevel domain.EventLevel) bool {
	return severityWeight(level) >= severityWeight(minLevel)
}

func severityWeight(level domain.EventLevel) int {
	switch level {
	case domain.LevelFatal:
		return 4
	case domain.LevelError:
		return 3
	case domain.LevelWarning:
		return 2
	case domain.LevelInfo:
		return 1
	default:
		return 0
	}
}
