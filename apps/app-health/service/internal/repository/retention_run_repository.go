package repository

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

type RetentionRunRepository interface {
	Create(context.Context, domain.RetentionRun) (domain.RetentionRun, error)
	List(context.Context, int) ([]domain.RetentionRun, int, error)
	Get(context.Context, string) (domain.RetentionRun, error)
}

type MemoryRetentionRunRepository struct {
	mu   sync.RWMutex
	runs map[string]domain.RetentionRun
}

func NewMemoryRetentionRunRepository() *MemoryRetentionRunRepository {
	return &MemoryRetentionRunRepository{runs: map[string]domain.RetentionRun{}}
}

func (r *MemoryRetentionRunRepository) Create(_ context.Context, run domain.RetentionRun) (domain.RetentionRun, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.runs[run.ID]; ok {
		return domain.RetentionRun{}, ErrDuplicate
	}
	if run.CreatedAt.IsZero() {
		run.CreatedAt = time.Now().UTC()
	}
	r.runs[run.ID] = run
	return run, nil
}

func (r *MemoryRetentionRunRepository) List(_ context.Context, limit int) ([]domain.RetentionRun, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	items := make([]domain.RetentionRun, 0, len(r.runs))
	for _, run := range r.runs {
		items = append(items, run)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.After(items[j].CreatedAt) })
	total := len(items)
	limit = normalizeRetentionLimit(limit)
	if len(items) > limit {
		items = items[:limit]
	}
	return items, total, nil
}

func (r *MemoryRetentionRunRepository) Get(_ context.Context, id string) (domain.RetentionRun, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	run, ok := r.runs[id]
	if !ok {
		return domain.RetentionRun{}, ErrNotFound
	}
	return run, nil
}

func normalizeRetentionLimit(limit int) int {
	if limit <= 0 {
		return 20
	}
	if limit > 100 {
		return 100
	}
	return limit
}
