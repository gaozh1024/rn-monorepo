package repository

import (
	"context"
	"errors"
	"slices"
	"sync"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

var ErrNotFound = errors.New("not found")

type EventRepository interface {
	Insert(context.Context, domain.HealthEvent) (domain.HealthEvent, error)
	AttachIssue(context.Context, string, string) error
	List(context.Context, domain.EventQuery) ([]domain.HealthEvent, int, error)
	Get(context.Context, string) (domain.HealthEvent, error)
	ListByIssue(context.Context, string, int) ([]domain.HealthEvent, error)
	CountToday(context.Context, string) (events int, fatal int, users int, err error)
}

type MemoryEventRepository struct {
	mu     sync.RWMutex
	events map[string]domain.HealthEvent
	order  []string
}

func NewMemoryEventRepository() *MemoryEventRepository {
	return &MemoryEventRepository{events: map[string]domain.HealthEvent{}, order: []string{}}
}

func (r *MemoryEventRepository) Insert(_ context.Context, event domain.HealthEvent) (domain.HealthEvent, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	r.events[event.ID] = event
	r.order = append(r.order, event.ID)
	return event, nil
}

func (r *MemoryEventRepository) AttachIssue(_ context.Context, eventID string, issueID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	event, ok := r.events[eventID]
	if !ok {
		return ErrNotFound
	}
	event.IssueID = issueID
	r.events[eventID] = event
	return nil
}

func (r *MemoryEventRepository) List(_ context.Context, query domain.EventQuery) ([]domain.HealthEvent, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	items := make([]domain.HealthEvent, 0, len(r.events))
	for i := len(r.order) - 1; i >= 0; i-- {
		event := r.events[r.order[i]]
		if !matchEvent(event, query) {
			continue
		}
		items = append(items, event)
	}
	return paginate(items, query.Page, query.PageSize)
}

func (r *MemoryEventRepository) Get(_ context.Context, id string) (domain.HealthEvent, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	event, ok := r.events[id]
	if !ok {
		return domain.HealthEvent{}, ErrNotFound
	}
	return event, nil
}

func (r *MemoryEventRepository) ListByIssue(_ context.Context, issueID string, limit int) ([]domain.HealthEvent, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	items := make([]domain.HealthEvent, 0, limit)
	for i := len(r.order) - 1; i >= 0; i-- {
		event := r.events[r.order[i]]
		if event.IssueID == issueID {
			items = append(items, event)
		}
		if limit > 0 && len(items) >= limit {
			break
		}
	}
	return items, nil
}

func (r *MemoryEventRepository) CountToday(_ context.Context, appID string) (int, int, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	start := time.Now().UTC().Truncate(24 * time.Hour)
	userIDs := map[string]struct{}{}
	events := 0
	fatal := 0
	for _, event := range r.events {
		if appID != "" && event.App.ID != appID {
			continue
		}
		if event.CreatedAt.Before(start) {
			continue
		}
		events++
		if event.Level == domain.LevelFatal {
			fatal++
		}
		if event.User != nil && event.User.ID != "" {
			userIDs[event.User.ID] = struct{}{}
		}
	}
	return events, fatal, len(userIDs), nil
}

func matchEvent(event domain.HealthEvent, query domain.EventQuery) bool {
	if query.AppID != "" && event.App.ID != query.AppID {
		return false
	}
	if query.IssueID != "" && event.IssueID != query.IssueID {
		return false
	}
	if query.UserID != "" && (event.User == nil || event.User.ID != query.UserID) {
		return false
	}
	if query.Level != "" && string(event.Level) != query.Level {
		return false
	}
	if query.Type != "" && event.Type != query.Type {
		return false
	}
	return true
}

func paginate[T any](items []T, page int, pageSize int) ([]T, int, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	total := len(items)
	start := (page - 1) * pageSize
	if start >= total {
		return []T{}, total, nil
	}
	end := min(start+pageSize, total)
	return slices.Clone(items[start:end]), total, nil
}
