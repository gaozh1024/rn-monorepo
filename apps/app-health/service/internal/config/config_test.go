package config

import (
	"fmt"
	"strings"
	"testing"
)

func TestLogValueDoesNotExposeAlertWebhookURL(t *testing.T) {
	cfg := Config{
		AlertWebhookURL:      "https://example.invalid/webhook?token=secret",
		AlertMinLevel:        "fatal",
		AlertCooldownSeconds: 300,
		AlertTimeoutSeconds:  5,
	}
	value := fmt.Sprint(cfg.LogValue())
	if strings.Contains(value, cfg.AlertWebhookURL) || strings.Contains(value, "secret") {
		t.Fatalf("log value exposed webhook secret: %s", value)
	}
	if !strings.Contains(value, "alertEnabled") {
		t.Fatalf("log value should expose alert enabled flag: %s", value)
	}
}
