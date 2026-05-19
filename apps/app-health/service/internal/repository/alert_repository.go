package repository

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

type AlertRuleRepository interface {
	Create(context.Context, domain.AlertRule) (domain.AlertRule, error)
	List(context.Context, domain.AlertRuleQuery) ([]domain.AlertRule, int, error)
	ListEnabled(context.Context) ([]domain.AlertRule, error)
	Get(context.Context, string) (domain.AlertRule, error)
	Update(context.Context, domain.AlertRule) (domain.AlertRule, error)
	Delete(context.Context, string) error
}

type AlertDeliveryRepository interface {
	Create(context.Context, domain.AlertDelivery) (domain.AlertDelivery, error)
	List(context.Context, domain.AlertDeliveryQuery) ([]domain.AlertDelivery, int, error)
}

type MemoryAlertRuleRepository struct {
	mu    sync.RWMutex
	rules map[string]domain.AlertRule
	order []string
}

func NewMemoryAlertRuleRepository() *MemoryAlertRuleRepository {
	return &MemoryAlertRuleRepository{rules: map[string]domain.AlertRule{}, order: []string{}}
}

func (r *MemoryAlertRuleRepository) Create(_ context.Context, rule domain.AlertRule) (domain.AlertRule, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.rules[rule.ID]; ok {
		return domain.AlertRule{}, ErrDuplicate
	}
	now := time.Now().UTC()
	rule.CreatedAt = now
	rule.UpdatedAt = now
	r.rules[rule.ID] = rule
	r.order = append(r.order, rule.ID)
	return maskAlertRule(rule), nil
}

func (r *MemoryAlertRuleRepository) List(_ context.Context, query domain.AlertRuleQuery) ([]domain.AlertRule, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	items := make([]domain.AlertRule, 0, len(r.rules))
	for _, id := range r.order {
		rule := r.rules[id]
		if !matchAlertRule(rule, query) {
			continue
		}
		items = append(items, maskAlertRule(rule))
	}
	return pageAlertRules(items, query.Page, query.PageSize)
}

func (r *MemoryAlertRuleRepository) ListEnabled(_ context.Context) ([]domain.AlertRule, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	items := make([]domain.AlertRule, 0, len(r.rules))
	for _, rule := range r.rules {
		if rule.Enabled {
			items = append(items, rule)
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.Before(items[j].CreatedAt) })
	return items, nil
}

func (r *MemoryAlertRuleRepository) Get(_ context.Context, id string) (domain.AlertRule, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	rule, ok := r.rules[id]
	if !ok {
		return domain.AlertRule{}, ErrNotFound
	}
	return rule, nil
}

func (r *MemoryAlertRuleRepository) Update(_ context.Context, rule domain.AlertRule) (domain.AlertRule, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	current, ok := r.rules[rule.ID]
	if !ok {
		return domain.AlertRule{}, ErrNotFound
	}
	rule.CreatedAt = current.CreatedAt
	rule.UpdatedAt = time.Now().UTC()
	r.rules[rule.ID] = rule
	return maskAlertRule(rule), nil
}

func (r *MemoryAlertRuleRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.rules[id]; !ok {
		return ErrNotFound
	}
	delete(r.rules, id)
	next := make([]string, 0, len(r.order))
	for _, currentID := range r.order {
		if currentID != id {
			next = append(next, currentID)
		}
	}
	r.order = next
	return nil
}

type MemoryAlertDeliveryRepository struct {
	mu         sync.RWMutex
	deliveries map[string]domain.AlertDelivery
	order      []string
}

func NewMemoryAlertDeliveryRepository() *MemoryAlertDeliveryRepository {
	return &MemoryAlertDeliveryRepository{deliveries: map[string]domain.AlertDelivery{}, order: []string{}}
}

func (r *MemoryAlertDeliveryRepository) Create(_ context.Context, delivery domain.AlertDelivery) (domain.AlertDelivery, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.deliveries[delivery.ID]; ok {
		return domain.AlertDelivery{}, ErrDuplicate
	}
	if delivery.CreatedAt.IsZero() {
		delivery.CreatedAt = time.Now().UTC()
	}
	r.deliveries[delivery.ID] = delivery
	r.order = append([]string{delivery.ID}, r.order...)
	return delivery, nil
}

func (r *MemoryAlertDeliveryRepository) List(_ context.Context, query domain.AlertDeliveryQuery) ([]domain.AlertDelivery, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	items := make([]domain.AlertDelivery, 0, len(r.deliveries))
	for _, id := range r.order {
		delivery := r.deliveries[id]
		if !matchAlertDelivery(delivery, query) {
			continue
		}
		items = append(items, delivery)
	}
	return pageAlertDeliveries(items, query.Page, query.PageSize)
}

func matchAlertRule(rule domain.AlertRule, query domain.AlertRuleQuery) bool {
	if query.AppID != "" && rule.AppID != "" && rule.AppID != query.AppID {
		return false
	}
	if query.Enabled != nil && rule.Enabled != *query.Enabled {
		return false
	}
	return true
}

func matchAlertDelivery(delivery domain.AlertDelivery, query domain.AlertDeliveryQuery) bool {
	if query.RuleID != "" && delivery.RuleID != query.RuleID {
		return false
	}
	if query.AppID != "" && delivery.AppID != query.AppID {
		return false
	}
	if query.Status != "" && string(delivery.Status) != query.Status {
		return false
	}
	return true
}

func pageAlertRules(items []domain.AlertRule, page int, pageSize int) ([]domain.AlertRule, int, error) {
	total := len(items)
	start, end := pageBounds(total, page, pageSize)
	return items[start:end], total, nil
}

func pageAlertDeliveries(items []domain.AlertDelivery, page int, pageSize int) ([]domain.AlertDelivery, int, error) {
	total := len(items)
	start, end := pageBounds(total, page, pageSize)
	return items[start:end], total, nil
}

func pageBounds(total int, page int, pageSize int) (int, int) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	if pageSize > 100 {
		pageSize = 100
	}
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	return start, end
}

func MaskWebhookURL(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if index := strings.Index(value, "?"); index >= 0 {
		return value[:index] + "?***"
	}
	parts := strings.Split(value, "/")
	if len(parts) > 3 && parts[len(parts)-1] != "" {
		parts[len(parts)-1] = "***"
		return strings.Join(parts, "/")
	}
	return value
}
