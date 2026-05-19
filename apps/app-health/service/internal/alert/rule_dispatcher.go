package alert

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
	"github.com/google/uuid"
)

type RuleDispatcher struct {
	rules      repository.AlertRuleRepository
	deliveries repository.AlertDeliveryRepository
	fallback   Notifier
	client     *http.Client
	timeout    time.Duration
	now        func() time.Time

	mu       sync.Mutex
	lastSent map[string]time.Time
}

func NewRuleDispatcher(
	rules repository.AlertRuleRepository,
	deliveries repository.AlertDeliveryRepository,
	fallback Notifier,
	timeout time.Duration,
) *RuleDispatcher {
	if fallback == nil {
		fallback = NoopNotifier{}
	}
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	return &RuleDispatcher{
		rules:      rules,
		deliveries: deliveries,
		fallback:   fallback,
		client:     http.DefaultClient,
		timeout:    timeout,
		now:        time.Now,
		lastSent:   map[string]time.Time{},
	}
}

func (d *RuleDispatcher) Notify(ctx context.Context, notification Notification) error {
	if d == nil || d.rules == nil || d.deliveries == nil {
		return nil
	}
	rules, err := d.rules.ListEnabled(ctx)
	if err != nil {
		return nil
	}
	if len(rules) == 0 {
		return d.fallback.Notify(ctx, notification)
	}
	for _, rule := range rules {
		if !MatchesRule(rule, notification) {
			continue
		}
		if !d.reserve(rule, notification) {
			continue
		}
		rule := rule
		notification := notification
		go func() {
			_, _ = d.deliver(context.Background(), rule, notification, false)
		}()
	}
	return nil
}

func (d *RuleDispatcher) Test(ctx context.Context, rule domain.AlertRule, message string) (domain.AlertDelivery, error) {
	if message == "" {
		message = "Test alert from App Health"
	}
	notification := Notification{
		Title:       message,
		AppID:       firstNonEmpty(rule.AppID, "test-app"),
		Level:       firstLevel(rule.MinLevel),
		Fingerprint: "test-alert",
		EventID:     "test_event",
		IssueID:     "test_issue",
		Timestamp:   d.now().UTC(),
		Event: domain.HealthEvent{
			ID:    "test_event",
			Type:  "custom",
			Level: firstLevel(rule.MinLevel),
			App: domain.AppInfo{
				ID:          firstNonEmpty(rule.AppID, "test-app"),
				Environment: rule.Environment,
			},
			Session: domain.SessionInfo{ID: "test_session"},
			Error:   &domain.ErrorInfo{Message: message, Fingerprint: "test-alert"},
		},
		Issue: domain.HealthIssue{
			ID:          "test_issue",
			AppID:       firstNonEmpty(rule.AppID, "test-app"),
			Level:       firstLevel(rule.MinLevel),
			Fingerprint: "test-alert",
			Title:       message,
		},
	}
	return d.deliver(ctx, rule, notification, true)
}

func MatchesRule(rule domain.AlertRule, notification Notification) bool {
	if !rule.Enabled {
		return false
	}
	if rule.AppID != "" && rule.AppID != notification.AppID {
		return false
	}
	if rule.Environment != "" && rule.Environment != notification.Event.App.Environment {
		return false
	}
	return ShouldNotify(notification.Level, rule.MinLevel)
}

func ValidateWebhookURL(value string) error {
	parsed, err := url.Parse(value)
	if err != nil {
		return fmt.Errorf("parse webhook url: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("webhook url must use http or https")
	}
	if parsed.Host == "" {
		return fmt.Errorf("webhook url must include a host")
	}
	return nil
}

func (d *RuleDispatcher) deliver(ctx context.Context, rule domain.AlertRule, notification Notification, test bool) (domain.AlertDelivery, error) {
	start := d.now()
	ctx, cancel := context.WithTimeout(ctx, d.timeout)
	defer cancel()

	payload, err := json.Marshal(notification)
	if err != nil {
		return d.record(ctx, rule, notification, domain.AlertDeliveryFailed, 0, err, start, test), err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, rule.WebhookURL, bytes.NewReader(payload))
	if err != nil {
		return d.record(ctx, rule, notification, domain.AlertDeliveryFailed, 0, err, start, test), err
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := d.client.Do(request)
	if err != nil {
		return d.record(ctx, rule, notification, domain.AlertDeliveryFailed, 0, err, start, test), err
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, response.Body)
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		err = fmt.Errorf("alert webhook returned status %d", response.StatusCode)
		return d.record(ctx, rule, notification, domain.AlertDeliveryFailed, response.StatusCode, err, start, test), err
	}
	return d.record(ctx, rule, notification, domain.AlertDeliverySuccess, response.StatusCode, nil, start, test), nil
}

func (d *RuleDispatcher) record(ctx context.Context, rule domain.AlertRule, notification Notification, status domain.AlertDeliveryStatus, httpStatus int, cause error, start time.Time, test bool) domain.AlertDelivery {
	delivery := domain.AlertDelivery{
		ID:          "delivery_" + uuid.NewString(),
		RuleID:      rule.ID,
		RuleName:    rule.Name,
		AppID:       notification.AppID,
		Environment: notification.Event.App.Environment,
		Level:       notification.Level,
		Fingerprint: notification.Fingerprint,
		EventID:     notification.EventID,
		IssueID:     notification.IssueID,
		Status:      status,
		HTTPStatus:  httpStatus,
		DurationMs:  int(d.now().Sub(start).Milliseconds()),
		Test:        test,
	}
	if cause != nil {
		delivery.ErrorMessage = cause.Error()
	}
	created, err := d.deliveries.Create(ctx, delivery)
	if err == nil {
		return created
	}
	return delivery
}

func (d *RuleDispatcher) reserve(rule domain.AlertRule, notification Notification) bool {
	if rule.CooldownSeconds <= 0 {
		return true
	}
	key := rule.ID + "\x00" + notification.AppID + "\x00" + notification.Fingerprint + "\x00" + string(notification.Level)
	now := d.now().UTC()
	d.mu.Lock()
	defer d.mu.Unlock()
	if last, ok := d.lastSent[key]; ok && now.Sub(last) < time.Duration(rule.CooldownSeconds)*time.Second {
		return false
	}
	d.lastSent[key] = now
	return true
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func firstLevel(value domain.EventLevel) domain.EventLevel {
	if value == "" {
		return domain.LevelFatal
	}
	return value
}
