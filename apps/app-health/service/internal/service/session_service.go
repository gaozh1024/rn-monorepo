package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

const SessionCookieName = "app_health_session"

var ErrInvalidSession = errors.New("invalid session")

type SessionService struct {
	secret []byte
	ttl    time.Duration
	now    func() time.Time
}

type sessionPayload struct {
	User      domain.AdminUser `json:"user"`
	ExpiresAt int64            `json:"expiresAt"`
}

func NewSessionService(secret string, ttl time.Duration) *SessionService {
	if ttl <= 0 {
		ttl = 168 * time.Hour
	}
	return &SessionService{secret: []byte(strings.TrimSpace(secret)), ttl: ttl, now: time.Now}
}

func (s *SessionService) Configured() bool {
	return len(s.secret) >= 32
}

func (s *SessionService) Create(user domain.AdminUser) (string, time.Time, error) {
	if !s.Configured() {
		return "", time.Time{}, ErrAuthNotConfigured
	}
	expiresAt := s.now().UTC().Add(s.ttl)
	payload := sessionPayload{User: user, ExpiresAt: expiresAt.Unix()}
	encodedPayload, err := json.Marshal(payload)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("encode session: %w", err)
	}
	payloadPart := base64.RawURLEncoding.EncodeToString(encodedPayload)
	signature := s.sign(payloadPart)
	return payloadPart + "." + signature, expiresAt, nil
}

func (s *SessionService) Verify(value string) (domain.AdminUser, error) {
	if !s.Configured() {
		return domain.AdminUser{}, ErrAuthNotConfigured
	}
	payloadPart, signature, ok := strings.Cut(value, ".")
	if !ok || payloadPart == "" || signature == "" {
		return domain.AdminUser{}, ErrInvalidSession
	}
	if !hmac.Equal([]byte(signature), []byte(s.sign(payloadPart))) {
		return domain.AdminUser{}, ErrInvalidSession
	}
	payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadPart)
	if err != nil {
		return domain.AdminUser{}, ErrInvalidSession
	}
	var payload sessionPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return domain.AdminUser{}, ErrInvalidSession
	}
	if payload.ExpiresAt <= s.now().UTC().Unix() {
		return domain.AdminUser{}, ErrInvalidSession
	}
	return payload.User, nil
}

func (s *SessionService) sign(payloadPart string) string {
	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write([]byte(payloadPart))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
