package service

import (
	"errors"
	"testing"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

func TestSessionServiceCreateAndVerify(t *testing.T) {
	now := time.Date(2026, 5, 18, 12, 0, 0, 0, time.UTC)
	service := NewSessionService("01234567890123456789012345678901", time.Hour)
	service.now = func() time.Time { return now }

	value, expiresAt, err := service.Create(domain.AdminUser{ID: "admin", Email: "admin@example.com", Role: "owner"})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if !expiresAt.Equal(now.Add(time.Hour)) {
		t.Fatalf("expiresAt = %s, want %s", expiresAt, now.Add(time.Hour))
	}

	user, err := service.Verify(value)
	if err != nil {
		t.Fatalf("Verify returned error: %v", err)
	}
	if user.Email != "admin@example.com" || user.Role != "owner" {
		t.Fatalf("unexpected user: %#v", user)
	}
}

func TestSessionServiceRejectsTamperedValue(t *testing.T) {
	service := NewSessionService("01234567890123456789012345678901", time.Hour)
	value, _, err := service.Create(domain.AdminUser{ID: "admin", Email: "admin@example.com", Role: "owner"})
	if err != nil {
		t.Fatal(err)
	}

	_, err = service.Verify(value + "x")
	if !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("error = %v, want ErrInvalidSession", err)
	}
}

func TestSessionServiceRejectsExpiredValue(t *testing.T) {
	now := time.Date(2026, 5, 18, 12, 0, 0, 0, time.UTC)
	service := NewSessionService("01234567890123456789012345678901", time.Hour)
	service.now = func() time.Time { return now }
	value, _, err := service.Create(domain.AdminUser{ID: "admin", Email: "admin@example.com", Role: "owner"})
	if err != nil {
		t.Fatal(err)
	}
	service.now = func() time.Time { return now.Add(2 * time.Hour) }

	_, err = service.Verify(value)
	if !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("error = %v, want ErrInvalidSession", err)
	}
}

func TestSessionServiceRequiresStrongSecret(t *testing.T) {
	service := NewSessionService("short", time.Hour)
	_, _, err := service.Create(domain.AdminUser{ID: "admin"})
	if !errors.Is(err, ErrAuthNotConfigured) {
		t.Fatalf("error = %v, want ErrAuthNotConfigured", err)
	}
}
