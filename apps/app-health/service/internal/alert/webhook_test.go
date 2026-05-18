package alert

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

func TestWebhookNotifierSendsMatchingLevel(t *testing.T) {
	var received Notification
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Fatalf("expected json content type, got %q", r.Header.Get("Content-Type"))
		}
		if err := json.NewDecoder(r.Body).Decode(&received); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		return textResponse(http.StatusNoContent, ""), nil
	})}

	notifier, err := NewWebhookNotifier(Config{
		WebhookURL: "https://example.invalid/webhook",
		MinLevel:   domain.LevelFatal,
		Cooldown:   time.Minute,
		Timeout:    time.Second,
		HTTPClient: client,
	})
	if err != nil {
		t.Fatalf("new notifier: %v", err)
	}

	err = notifier.Notify(context.Background(), Notification{
		Title:       "fatal crash",
		AppID:       "app",
		Level:       domain.LevelFatal,
		Fingerprint: "fp",
		EventID:     "event_1",
		IssueID:     "issue_1",
		Timestamp:   time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("notify: %v", err)
	}
	if received.EventID != "event_1" || received.IssueID != "issue_1" {
		t.Fatalf("unexpected payload: %+v", received)
	}
}

func TestWebhookNotifierSkipsBelowMinimumLevel(t *testing.T) {
	calls := 0
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		return textResponse(http.StatusNoContent, ""), nil
	})}

	notifier, err := NewWebhookNotifier(Config{
		WebhookURL: "https://example.invalid/webhook",
		MinLevel:   domain.LevelFatal,
		Cooldown:   time.Minute,
		Timeout:    time.Second,
		HTTPClient: client,
	})
	if err != nil {
		t.Fatalf("new notifier: %v", err)
	}
	if err := notifier.Notify(context.Background(), Notification{
		AppID:       "app",
		Level:       domain.LevelError,
		Fingerprint: "fp",
	}); err != nil {
		t.Fatalf("notify: %v", err)
	}
	if calls != 0 {
		t.Fatalf("expected no webhook calls, got %d", calls)
	}
}

func TestWebhookNotifierCooldownSuppressesDuplicateFingerprint(t *testing.T) {
	calls := 0
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		return textResponse(http.StatusNoContent, ""), nil
	})}

	notifier, err := NewWebhookNotifier(Config{
		WebhookURL: "https://example.invalid/webhook",
		MinLevel:   domain.LevelError,
		Cooldown:   time.Minute,
		Timeout:    time.Second,
		HTTPClient: client,
	})
	if err != nil {
		t.Fatalf("new notifier: %v", err)
	}
	notification := Notification{AppID: "app", Level: domain.LevelError, Fingerprint: "fp"}
	if err := notifier.Notify(context.Background(), notification); err != nil {
		t.Fatalf("first notify: %v", err)
	}
	if err := notifier.Notify(context.Background(), notification); err != nil {
		t.Fatalf("second notify: %v", err)
	}
	if calls != 1 {
		t.Fatalf("expected one webhook call, got %d", calls)
	}
}

func TestWebhookNotifierReturnsHTTPErrorInSynchronousMode(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		return textResponse(http.StatusInternalServerError, ""), nil
	})}

	notifier, err := NewWebhookNotifier(Config{
		WebhookURL: "https://example.invalid/webhook",
		MinLevel:   domain.LevelFatal,
		Cooldown:   time.Minute,
		Timeout:    time.Second,
		HTTPClient: client,
	})
	if err != nil {
		t.Fatalf("new notifier: %v", err)
	}
	if err := notifier.Notify(context.Background(), Notification{
		AppID:       "app",
		Level:       domain.LevelFatal,
		Fingerprint: "fp",
	}); err == nil {
		t.Fatal("expected webhook error")
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func textResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     http.Header{},
	}
}
