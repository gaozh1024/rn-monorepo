package service

import (
	"context"
	"errors"
	"strings"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrAuthNotConfigured = errors.New("admin authentication is not configured")
	ErrInvalidLogin      = errors.New("invalid email or password")
)

type AuthService struct {
	adminEmail        string
	adminPasswordHash string
}

func NewAuthService(adminEmail string, adminPasswordHash string) *AuthService {
	return &AuthService{
		adminEmail:        strings.TrimSpace(strings.ToLower(adminEmail)),
		adminPasswordHash: strings.TrimSpace(adminPasswordHash),
	}
}

func (s *AuthService) Login(_ context.Context, email string, password string) (domain.AdminUser, error) {
	if s.adminEmail == "" || s.adminPasswordHash == "" {
		return domain.AdminUser{}, ErrAuthNotConfigured
	}
	if strings.TrimSpace(strings.ToLower(email)) != s.adminEmail {
		return domain.AdminUser{}, ErrInvalidLogin
	}
	if err := bcrypt.CompareHashAndPassword([]byte(s.adminPasswordHash), []byte(password)); err != nil {
		return domain.AdminUser{}, ErrInvalidLogin
	}
	return domain.AdminUser{
		ID:    "admin",
		Email: s.adminEmail,
		Role:  "owner",
	}, nil
}
