package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"sync"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

type ApplicationRepository interface {
	Create(context.Context, domain.Application) (domain.Application, error)
	List(context.Context) ([]domain.ApplicationSummary, error)
	Get(context.Context, string) (domain.Application, error)
	Update(context.Context, domain.Application) (domain.Application, error)
	Delete(context.Context, string) error
}

type IngestTokenRepository interface {
	Create(context.Context, domain.IngestToken) (domain.IngestToken, error)
	ListByApplication(context.Context, string) ([]domain.IngestToken, error)
	FindActiveByHash(context.Context, string) (domain.IngestToken, error)
	MarkUsed(context.Context, string, time.Time) error
	Revoke(context.Context, string) (domain.IngestToken, error)
	RevokeByApplication(context.Context, string) (int, error)
	DeleteByApplication(context.Context, string) (int, error)
}

type MemoryApplicationRepository struct {
	mu           sync.RWMutex
	applications map[string]domain.Application
	order        []string
	events       EventRepository
	issues       IssueRepository
	tokens       *MemoryIngestTokenRepository
}

func NewMemoryApplicationRepository(events EventRepository, issues IssueRepository) *MemoryApplicationRepository {
	return &MemoryApplicationRepository{
		applications: map[string]domain.Application{},
		order:        []string{},
		events:       events,
		issues:       issues,
	}
}

func (r *MemoryApplicationRepository) AttachTokens(tokens *MemoryIngestTokenRepository) {
	r.tokens = tokens
}

func (r *MemoryApplicationRepository) Create(_ context.Context, application domain.Application) (domain.Application, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.applications[application.ID]; ok {
		return domain.Application{}, ErrDuplicate
	}
	for _, existing := range r.applications {
		if strings.EqualFold(existing.Slug, application.Slug) {
			return domain.Application{}, ErrDuplicate
		}
	}
	now := time.Now().UTC()
	application.CreatedAt = now
	application.UpdatedAt = now
	r.applications[application.ID] = application
	r.order = append(r.order, application.ID)
	return application, nil
}

func (r *MemoryApplicationRepository) List(ctx context.Context) ([]domain.ApplicationSummary, error) {
	r.mu.RLock()
	applications := make([]domain.Application, 0, len(r.order))
	for _, id := range r.order {
		applications = append(applications, r.applications[id])
	}
	r.mu.RUnlock()

	summaries := make([]domain.ApplicationSummary, 0, len(applications))
	for _, application := range applications {
		events, _, _ := r.events.List(ctx, domain.EventQuery{AppID: application.Slug, Page: 1, PageSize: 1})
		_, eventCount, _ := r.events.List(ctx, domain.EventQuery{AppID: application.Slug, Page: 1, PageSize: 1})
		_, issueCount, _ := r.issues.List(ctx, domain.IssueQuery{AppID: application.Slug, Page: 1, PageSize: 1})
		var lastEventAt *time.Time
		if len(events) > 0 {
			lastEventAt = &events[0].CreatedAt
		}
		summaries = append(summaries, domain.ApplicationSummary{
			Application:         application,
			EffectiveTokenCount: r.activeTokenCount(application.ID),
			EventCount:          eventCount,
			IssueCount:          issueCount,
			LastEventAt:         lastEventAt,
		})
	}
	return summaries, nil
}

func (r *MemoryApplicationRepository) Get(_ context.Context, id string) (domain.Application, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, application := range r.applications {
		if application.ID == id || application.Slug == id {
			return application, nil
		}
	}
	return domain.Application{}, ErrNotFound
}

func (r *MemoryApplicationRepository) Update(_ context.Context, application domain.Application) (domain.Application, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	current, ok := r.applications[application.ID]
	if !ok {
		return domain.Application{}, ErrNotFound
	}
	application.Slug = current.Slug
	application.CreatedAt = current.CreatedAt
	application.UpdatedAt = time.Now().UTC()
	r.applications[application.ID] = application
	return application, nil
}

func (r *MemoryApplicationRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	application, ok := r.applications[id]
	if !ok {
		for _, candidate := range r.applications {
			if candidate.Slug == id {
				application = candidate
				ok = true
				break
			}
		}
	}
	if !ok {
		return ErrNotFound
	}
	delete(r.applications, application.ID)
	nextOrder := make([]string, 0, len(r.order))
	for _, currentID := range r.order {
		if currentID != application.ID {
			nextOrder = append(nextOrder, currentID)
		}
	}
	r.order = nextOrder
	return nil
}

func (r *MemoryApplicationRepository) activeTokenCount(applicationID string) int {
	if r.tokens == nil {
		return 0
	}
	return r.tokens.ActiveCount(applicationID)
}

type MemoryIngestTokenRepository struct {
	mu     sync.RWMutex
	tokens map[string]domain.IngestToken
}

func NewMemoryIngestTokenRepository() *MemoryIngestTokenRepository {
	return &MemoryIngestTokenRepository{tokens: map[string]domain.IngestToken{}}
}

func (r *MemoryIngestTokenRepository) Create(_ context.Context, token domain.IngestToken) (domain.IngestToken, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.tokens[token.ID]; ok {
		return domain.IngestToken{}, ErrDuplicate
	}
	for _, existing := range r.tokens {
		if existing.TokenHash == token.TokenHash {
			return domain.IngestToken{}, ErrDuplicate
		}
	}
	token.CreatedAt = time.Now().UTC()
	r.tokens[token.ID] = token
	return token, nil
}

func (r *MemoryIngestTokenRepository) ListByApplication(_ context.Context, applicationID string) ([]domain.IngestToken, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	tokens := []domain.IngestToken{}
	for _, token := range r.tokens {
		if token.ApplicationID == applicationID {
			token.PlainText = ""
			tokens = append(tokens, token)
		}
	}
	return tokens, nil
}

func (r *MemoryIngestTokenRepository) FindActiveByHash(_ context.Context, tokenHash string) (domain.IngestToken, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, token := range r.tokens {
		if token.TokenHash == tokenHash && token.RevokedAt == nil {
			return token, nil
		}
	}
	return domain.IngestToken{}, ErrNotFound
}

func (r *MemoryIngestTokenRepository) MarkUsed(_ context.Context, id string, usedAt time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	token, ok := r.tokens[id]
	if !ok {
		return ErrNotFound
	}
	token.LastUsedAt = &usedAt
	r.tokens[id] = token
	return nil
}

func (r *MemoryIngestTokenRepository) Revoke(_ context.Context, id string) (domain.IngestToken, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	token, ok := r.tokens[id]
	if !ok {
		return domain.IngestToken{}, ErrNotFound
	}
	now := time.Now().UTC()
	token.RevokedAt = &now
	r.tokens[id] = token
	return token, nil
}

func (r *MemoryIngestTokenRepository) RevokeByApplication(_ context.Context, applicationID string) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := time.Now().UTC()
	count := 0
	for id, token := range r.tokens {
		if token.ApplicationID != applicationID || token.RevokedAt != nil {
			continue
		}
		token.RevokedAt = &now
		r.tokens[id] = token
		count++
	}
	return count, nil
}

func (r *MemoryIngestTokenRepository) DeleteByApplication(_ context.Context, applicationID string) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	count := 0
	for id, token := range r.tokens {
		if token.ApplicationID == applicationID {
			delete(r.tokens, id)
			count++
		}
	}
	return count, nil
}

func (r *MemoryIngestTokenRepository) ActiveCount(applicationID string) int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	count := 0
	for _, token := range r.tokens {
		if token.ApplicationID == applicationID && token.RevokedAt == nil {
			count++
		}
	}
	return count
}

func TokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
