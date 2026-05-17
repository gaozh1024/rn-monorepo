package alert

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

type WebhookNotifier struct {
	webhookURL string
	minLevel   string
	cooldown   time.Duration
	timeout    time.Duration
	async      bool
	client     *http.Client
	now        func() time.Time

	mu       sync.Mutex
	lastSent map[string]time.Time
}

func NewWebhookNotifier(config Config) (Notifier, error) {
	if config.WebhookURL == "" {
		return NoopNotifier{}, nil
	}
	parsed, err := url.Parse(config.WebhookURL)
	if err != nil {
		return nil, fmt.Errorf("parse alert webhook url: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, errors.New("alert webhook url must use http or https")
	}
	if parsed.Host == "" {
		return nil, errors.New("alert webhook url must include a host")
	}
	minLevel := config.MinLevel
	if minLevel == "" {
		minLevel = "fatal"
	}
	if !ShouldNotify(minLevel, "info") {
		return nil, errors.New("unsupported alert minimum level")
	}
	cooldown := config.Cooldown
	if cooldown <= 0 {
		cooldown = 5 * time.Minute
	}
	timeout := config.Timeout
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	client := config.HTTPClient
	if client == nil {
		client = http.DefaultClient
	}
	return &WebhookNotifier{
		webhookURL: config.WebhookURL,
		minLevel:   string(minLevel),
		cooldown:   cooldown,
		timeout:    timeout,
		async:      config.Async,
		client:     client,
		now:        time.Now,
		lastSent:   map[string]time.Time{},
	}, nil
}

func (n *WebhookNotifier) Notify(ctx context.Context, notification Notification) error {
	if n == nil || !ShouldNotify(notification.Level, domainLevel(n.minLevel)) {
		return nil
	}
	if !n.reserve(notification) {
		return nil
	}
	if n.async {
		go func() {
			_ = n.post(context.Background(), notification)
		}()
		return nil
	}
	return n.post(ctx, notification)
}

func (n *WebhookNotifier) reserve(notification Notification) bool {
	key := notification.AppID + "\x00" + notification.Fingerprint + "\x00" + string(notification.Level)
	now := n.now().UTC()
	n.mu.Lock()
	defer n.mu.Unlock()
	if last, ok := n.lastSent[key]; ok && now.Sub(last) < n.cooldown {
		return false
	}
	n.lastSent[key] = now
	return true
}

func (n *WebhookNotifier) post(ctx context.Context, notification Notification) error {
	ctx, cancel := context.WithTimeout(ctx, n.timeout)
	defer cancel()
	body, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("encode alert webhook payload: %w", err)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, n.webhookURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create alert webhook request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := n.client.Do(request)
	if err != nil {
		return fmt.Errorf("send alert webhook request: %w", err)
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, response.Body)
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("alert webhook returned status %d", response.StatusCode)
	}
	return nil
}

func domainLevel(level string) domain.EventLevel {
	return domain.EventLevel(level)
}
