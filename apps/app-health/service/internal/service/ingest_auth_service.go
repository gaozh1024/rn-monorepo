package service

import (
	"context"
	"errors"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/security"
)

var ErrUnauthorizedIngest = errors.New("unauthorized ingest token")

type IngestAuthService struct {
	globalToken  string
	applications repository.ApplicationRepository
	tokens       repository.IngestTokenRepository
}

func NewIngestAuthService(globalToken string, applications repository.ApplicationRepository, tokens repository.IngestTokenRepository) *IngestAuthService {
	return &IngestAuthService{globalToken: globalToken, applications: applications, tokens: tokens}
}

func (s *IngestAuthService) Verify(ctx context.Context, tokenValue string) (domain.Application, bool, error) {
	if security.ConstantTimeEqual(tokenValue, s.globalToken) {
		return domain.Application{}, true, nil
	}
	if tokenValue == "" || s.tokens == nil || s.applications == nil {
		return domain.Application{}, false, ErrUnauthorizedIngest
	}
	token, err := s.tokens.FindActiveByHash(ctx, repository.TokenHash(tokenValue))
	if err != nil {
		return domain.Application{}, false, ErrUnauthorizedIngest
	}
	application, err := s.applications.Get(ctx, token.ApplicationID)
	if err != nil || application.Status != domain.ApplicationStatusActive {
		return domain.Application{}, false, ErrUnauthorizedIngest
	}
	_ = s.tokens.MarkUsed(ctx, token.ID, time.Now().UTC())
	return application, false, nil
}
