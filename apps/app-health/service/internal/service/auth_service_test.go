package service

import (
	"errors"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestAuthServiceLogin(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("secret-pass"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	service := NewAuthService("Admin@Example.com", string(hash))

	user, err := service.Login(t.Context(), "admin@example.com", "secret-pass")
	if err != nil {
		t.Fatalf("Login returned error: %v", err)
	}
	if user.Email != "admin@example.com" || user.Role != "owner" {
		t.Fatalf("unexpected user: %#v", user)
	}
}

func TestAuthServiceRejectsInvalidLogin(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("secret-pass"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	service := NewAuthService("admin@example.com", string(hash))

	_, err = service.Login(t.Context(), "admin@example.com", "wrong-pass")
	if !errors.Is(err, ErrInvalidLogin) {
		t.Fatalf("error = %v, want ErrInvalidLogin", err)
	}
}

func TestAuthServiceRequiresPasswordHash(t *testing.T) {
	service := NewAuthService("admin@example.com", "")

	_, err := service.Login(t.Context(), "admin@example.com", "secret-pass")
	if !errors.Is(err, ErrAuthNotConfigured) {
		t.Fatalf("error = %v, want ErrAuthNotConfigured", err)
	}
}
