package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"
	"unicode"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
	"github.com/google/uuid"
)

var (
	ErrInvalidApplication = errors.New("invalid application")
	ErrInvalidToken       = errors.New("invalid ingest token")
	ErrTokenStillActive   = errors.New("token is still active")
)

type ApplicationService struct {
	applications repository.ApplicationRepository
	tokens       repository.IngestTokenRepository
	events       repository.EventRepository
	issues       repository.IssueRepository
}

func NewApplicationService(applications repository.ApplicationRepository, tokens repository.IngestTokenRepository, events repository.EventRepository, issues repository.IssueRepository) *ApplicationService {
	return &ApplicationService{applications: applications, tokens: tokens, events: events, issues: issues}
}

func (s *ApplicationService) Create(ctx context.Context, request domain.CreateApplicationRequest) (domain.CreateApplicationResponse, error) {
	application, err := normalizeNewApplication(request)
	if err != nil {
		return domain.CreateApplicationResponse{}, err
	}
	created, err := s.applications.Create(ctx, application)
	if err != nil {
		return domain.CreateApplicationResponse{}, err
	}
	token, err := s.CreateToken(ctx, created.ID, domain.CreateTokenRequest{Name: "Default ingest token"})
	if err != nil {
		return domain.CreateApplicationResponse{}, err
	}
	return domain.CreateApplicationResponse{Application: created, Token: token}, nil
}

func (s *ApplicationService) List(ctx context.Context) (domain.ApplicationListResponse, error) {
	items, err := s.applications.List(ctx)
	if err != nil {
		return domain.ApplicationListResponse{}, err
	}
	return domain.ApplicationListResponse{Items: items, Total: len(items)}, nil
}

func (s *ApplicationService) Get(ctx context.Context, id string) (domain.Application, []domain.IngestToken, error) {
	application, err := s.applications.Get(ctx, id)
	if err != nil {
		return domain.Application{}, nil, err
	}
	tokens, err := s.tokens.ListByApplication(ctx, application.ID)
	if err != nil {
		return domain.Application{}, nil, err
	}
	return application, tokens, nil
}

func (s *ApplicationService) Update(ctx context.Context, id string, request domain.UpdateApplicationRequest) (domain.Application, error) {
	current, err := s.applications.Get(ctx, id)
	if err != nil {
		return domain.Application{}, err
	}
	updated, err := normalizeApplicationUpdate(current, request)
	if err != nil {
		return domain.Application{}, err
	}
	return s.applications.Update(ctx, updated)
}

func (s *ApplicationService) CreateToken(ctx context.Context, applicationID string, request domain.CreateTokenRequest) (domain.IngestToken, error) {
	application, err := s.applications.Get(ctx, applicationID)
	if err != nil {
		return domain.IngestToken{}, err
	}
	plainText, err := generateIngestToken()
	if err != nil {
		return domain.IngestToken{}, err
	}
	name := strings.TrimSpace(request.Name)
	if name == "" {
		name = "Ingest token"
	}
	prefix := plainText
	if len(prefix) > 20 {
		prefix = prefix[:20]
	}
	created, err := s.tokens.Create(ctx, domain.IngestToken{
		ID:            "tok_" + uuid.NewString(),
		ApplicationID: application.ID,
		Name:          name,
		TokenHash:     repository.TokenHash(plainText),
		TokenPrefix:   prefix,
	})
	if err != nil {
		return domain.IngestToken{}, err
	}
	created.PlainText = plainText
	return created, nil
}

func (s *ApplicationService) RevokeToken(ctx context.Context, id string) (domain.IngestToken, error) {
	return s.tokens.Revoke(ctx, id)
}

func (s *ApplicationService) DeleteDisabledToken(ctx context.Context, id string) (domain.IngestToken, error) {
	token, err := s.tokens.Get(ctx, id)
	if err != nil {
		return domain.IngestToken{}, err
	}
	if token.RevokedAt == nil {
		return domain.IngestToken{}, ErrTokenStillActive
	}
	if err := s.tokens.Delete(ctx, id); err != nil {
		return domain.IngestToken{}, err
	}
	return token, nil
}

func (s *ApplicationService) Enable(ctx context.Context, id string) (domain.Application, error) {
	application, err := s.applications.Get(ctx, id)
	if err != nil {
		return domain.Application{}, err
	}
	application.Status = domain.ApplicationStatusActive
	return s.applications.Update(ctx, application)
}

func (s *ApplicationService) Disable(ctx context.Context, id string) (domain.Application, error) {
	application, err := s.applications.Get(ctx, id)
	if err != nil {
		return domain.Application{}, err
	}
	application.Status = domain.ApplicationStatusDisabled
	if _, err := s.tokens.RevokeByApplication(ctx, application.ID); err != nil {
		return domain.Application{}, err
	}
	return s.applications.Update(ctx, application)
}

func (s *ApplicationService) Delete(ctx context.Context, id string) (domain.Application, error) {
	application, err := s.applications.Get(ctx, id)
	if err != nil {
		return domain.Application{}, err
	}
	if _, err := s.tokens.DeleteByApplication(ctx, application.ID); err != nil {
		return domain.Application{}, err
	}
	if err := s.applications.Delete(ctx, application.ID); err != nil {
		return domain.Application{}, err
	}
	return application, nil
}

func (s *ApplicationService) DeleteWithData(ctx context.Context, id string, confirmAppID string) (domain.Application, int, int, error) {
	application, err := s.applications.Get(ctx, id)
	if err != nil {
		return domain.Application{}, 0, 0, err
	}
	if strings.TrimSpace(confirmAppID) != application.Slug {
		return domain.Application{}, 0, 0, ErrInvalidApplication
	}
	if _, err := s.tokens.DeleteByApplication(ctx, application.ID); err != nil {
		return domain.Application{}, 0, 0, err
	}
	deletedIssues, err := s.issues.DeleteByAppID(ctx, application.Slug)
	if err != nil {
		return domain.Application{}, 0, 0, err
	}
	deletedEvents, err := s.events.DeleteByAppID(ctx, application.Slug)
	if err != nil {
		return domain.Application{}, 0, 0, err
	}
	if err := s.applications.Delete(ctx, application.ID); err != nil {
		return domain.Application{}, 0, 0, err
	}
	return application, deletedEvents, deletedIssues, nil
}

func normalizeNewApplication(request domain.CreateApplicationRequest) (domain.Application, error) {
	name := strings.TrimSpace(request.Name)
	slug := normalizeSlug(request.Slug)
	if slug == "" {
		slug = normalizeSlug(name)
	}
	if name == "" || slug == "" {
		return domain.Application{}, ErrInvalidApplication
	}
	return domain.Application{
		ID:                 "app_" + uuid.NewString(),
		Name:               name,
		Slug:               slug,
		Description:        strings.TrimSpace(request.Description),
		DefaultEnvironment: normalizeEnvironment(request.DefaultEnvironment),
		Platforms:          normalizePlatforms(request.Platforms),
		Status:             domain.ApplicationStatusActive,
	}, nil
}

func normalizeApplicationUpdate(current domain.Application, request domain.UpdateApplicationRequest) (domain.Application, error) {
	name := strings.TrimSpace(request.Name)
	if name == "" {
		return domain.Application{}, ErrInvalidApplication
	}
	status := request.Status
	if status == "" {
		status = current.Status
	}
	if !isValidApplicationStatus(status) {
		return domain.Application{}, ErrInvalidApplication
	}
	current.Name = name
	current.Description = strings.TrimSpace(request.Description)
	current.DefaultEnvironment = normalizeEnvironment(request.DefaultEnvironment)
	current.Platforms = normalizePlatforms(request.Platforms)
	current.Status = status
	return current, nil
}

func normalizeSlug(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	var builder strings.Builder
	lastDash := false
	for _, r := range value {
		isAllowed := unicode.IsLetter(r) || unicode.IsDigit(r)
		if isAllowed || r == '.' || r == '_' || r == '-' {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if unicode.IsSpace(r) && !lastDash && builder.Len() > 0 {
			builder.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-._")
}

func normalizeEnvironment(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return "production"
	}
	return value
}

func normalizePlatforms(values []string) []string {
	seen := map[string]struct{}{}
	platforms := []string{}
	for _, value := range values {
		platform := strings.TrimSpace(strings.ToLower(value))
		if platform == "" {
			continue
		}
		if _, ok := seen[platform]; ok {
			continue
		}
		seen[platform] = struct{}{}
		platforms = append(platforms, platform)
	}
	return platforms
}

func isValidApplicationStatus(status domain.ApplicationStatus) bool {
	return status == domain.ApplicationStatusActive || status == domain.ApplicationStatusDisabled
}

func generateIngestToken() (string, error) {
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "ah_ingest_" + base64.RawURLEncoding.EncodeToString(bytes), nil
}
