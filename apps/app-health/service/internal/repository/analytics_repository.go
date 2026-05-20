package repository

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

type AnalyticsRepository interface {
	UserTimeline(context.Context, domain.AnalyticsTimelineQuery) ([]domain.AnalyticsTimelineItem, error)
	EventTimeline(context.Context, string, int) ([]domain.AnalyticsTimelineItem, error)
	ScreenStats(context.Context, domain.AnalyticsStatsQuery) ([]domain.ScreenStatsItem, error)
	Distribution(context.Context, domain.AnalyticsDistributionQuery) ([]domain.AnalyticsDistributionItem, error)
}

type MemoryAnalyticsRepository struct {
	events *MemoryEventRepository
}

func NewMemoryAnalyticsRepository(events *MemoryEventRepository) *MemoryAnalyticsRepository {
	return &MemoryAnalyticsRepository{events: events}
}

func (r *MemoryAnalyticsRepository) UserTimeline(_ context.Context, query domain.AnalyticsTimelineQuery) ([]domain.AnalyticsTimelineItem, error) {
	events := r.snapshot()
	items := make([]domain.AnalyticsTimelineItem, 0, len(events))
	for _, event := range events {
		if !matchesTimelineQuery(event, query) {
			continue
		}
		items = append(items, timelineItem(event))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.After(items[j].CreatedAt) })
	return limitSlice(items, normalizeAnalyticsLimit(query.Limit, 100, 500)), nil
}

func (r *MemoryAnalyticsRepository) EventTimeline(_ context.Context, eventID string, windowMinutes int) ([]domain.AnalyticsTimelineItem, error) {
	events := r.snapshot()
	var target domain.HealthEvent
	found := false
	for _, event := range events {
		if event.ID == eventID {
			target = event
			found = true
			break
		}
	}
	if !found {
		return nil, ErrNotFound
	}
	if target.User == nil || target.User.ID == "" {
		return []domain.AnalyticsTimelineItem{timelineItem(target)}, nil
	}
	window := time.Duration(normalizeWindowMinutes(windowMinutes)) * time.Minute
	from := target.CreatedAt.Add(-window)
	to := target.CreatedAt.Add(window)
	items := make([]domain.AnalyticsTimelineItem, 0, len(events))
	for _, event := range events {
		if event.User == nil || event.User.ID != target.User.ID {
			continue
		}
		if event.CreatedAt.Before(from) || event.CreatedAt.After(to) {
			continue
		}
		items = append(items, timelineItem(event))
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.Before(items[j].CreatedAt) })
	return items, nil
}

func (r *MemoryAnalyticsRepository) ScreenStats(_ context.Context, query domain.AnalyticsStatsQuery) ([]domain.ScreenStatsItem, error) {
	type bucket struct {
		views    int
		users    map[string]struct{}
		sessions map[string]struct{}
		last     time.Time
	}
	buckets := map[string]*bucket{}
	for _, event := range r.snapshot() {
		if !matchesStatsQuery(event, query) {
			continue
		}
		screen := screenName(event)
		if screen == "" {
			continue
		}
		b, ok := buckets[screen]
		if !ok {
			b = &bucket{users: map[string]struct{}{}, sessions: map[string]struct{}{}}
			buckets[screen] = b
		}
		b.views++
		if event.User != nil && event.User.ID != "" {
			b.users[event.User.ID] = struct{}{}
		}
		if event.Session.ID != "" {
			b.sessions[event.Session.ID] = struct{}{}
		}
		if event.CreatedAt.After(b.last) {
			b.last = event.CreatedAt
		}
	}
	items := make([]domain.ScreenStatsItem, 0, len(buckets))
	for screen, b := range buckets {
		items = append(items, domain.ScreenStatsItem{Screen: screen, Views: b.views, Users: len(b.users), Sessions: len(b.sessions), LastSeenAt: b.last})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Views > items[j].Views })
	return limitSlice(items, normalizeAnalyticsLimit(query.Limit, 50, 200)), nil
}

func (r *MemoryAnalyticsRepository) Distribution(_ context.Context, query domain.AnalyticsDistributionQuery) ([]domain.AnalyticsDistributionItem, error) {
	counts := map[string]int{}
	for _, event := range r.snapshot() {
		if !matchesStatsQuery(event, domain.AnalyticsStatsQuery{AppID: query.AppID, From: query.From, To: query.To}) {
			continue
		}
		value := distributionValue(event, query.Dimension)
		if value == "" {
			continue
		}
		counts[value]++
	}
	items := make([]domain.AnalyticsDistributionItem, 0, len(counts))
	for value, count := range counts {
		items = append(items, domain.AnalyticsDistributionItem{Value: value, Count: count})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Count > items[j].Count })
	return limitSlice(items, normalizeAnalyticsLimit(query.Limit, 20, 100)), nil
}

func (r *MemoryAnalyticsRepository) snapshot() []domain.HealthEvent {
	r.events.mu.RLock()
	defer r.events.mu.RUnlock()
	items := make([]domain.HealthEvent, 0, len(r.events.order))
	for _, id := range r.events.order {
		if event, ok := r.events.events[id]; ok {
			items = append(items, event)
		}
	}
	return items
}

func matchesTimelineQuery(event domain.HealthEvent, query domain.AnalyticsTimelineQuery) bool {
	if query.UserID != "" && (event.User == nil || event.User.ID != query.UserID) {
		return false
	}
	if query.AppID != "" && event.App.ID != query.AppID {
		return false
	}
	return matchesTimeRange(event, query.From, query.To)
}

func matchesStatsQuery(event domain.HealthEvent, query domain.AnalyticsStatsQuery) bool {
	if query.AppID != "" && event.App.ID != query.AppID {
		return false
	}
	return matchesTimeRange(event, query.From, query.To)
}

func matchesTimeRange(event domain.HealthEvent, from time.Time, to time.Time) bool {
	if !from.IsZero() && event.CreatedAt.Before(from) {
		return false
	}
	if !to.IsZero() && event.CreatedAt.After(to) {
		return false
	}
	return true
}

func timelineItem(event domain.HealthEvent) domain.AnalyticsTimelineItem {
	return domain.AnalyticsTimelineItem{
		ID:        event.ID,
		Type:      event.Type,
		Level:     event.Level,
		CreatedAt: event.CreatedAt,
		App:       event.App,
		Device:    event.Device,
		Session:   event.Session,
		User:      event.User,
		Analytics: event.Analytics,
		Error:     event.Error,
		Tags:      event.Tags,
	}
}

func screenName(event domain.HealthEvent) string {
	if event.Type != "screen_view" && analyticsName(event) != "screen.view" {
		return ""
	}
	if event.Tags != nil && strings.TrimSpace(event.Tags["screen"]) != "" {
		return strings.TrimSpace(event.Tags["screen"])
	}
	if event.Analytics != nil && event.Analytics.Properties != nil {
		if screen, ok := event.Analytics.Properties["screen"].(string); ok {
			return strings.TrimSpace(screen)
		}
	}
	return ""
}

func distributionValue(event domain.HealthEvent, dimension string) string {
	switch dimension {
	case "platform":
		return event.Device.Platform
	case "osVersion":
		return event.Device.OSVersion
	case "deviceModel":
		return event.Device.Model
	case "deviceBrand":
		return event.Device.Brand
	case "appVersion":
		return event.App.Version
	case "buildNumber":
		return event.App.BuildNumber
	case "country":
		if event.Geo != nil {
			return event.Geo.Country
		}
	case "province":
		if event.Geo != nil {
			return event.Geo.Province
		}
	case "city":
		if event.Geo != nil {
			return event.Geo.City
		}
	}
	return ""
}

func normalizeAnalyticsLimit(limit int, fallback int, max int) int {
	if limit <= 0 {
		return fallback
	}
	if limit > max {
		return max
	}
	return limit
}

func normalizeWindowMinutes(windowMinutes int) int {
	if windowMinutes <= 0 {
		return 10
	}
	if windowMinutes > 1440 {
		return 1440
	}
	return windowMinutes
}

func limitSlice[T any](items []T, limit int) []T {
	if limit <= 0 || len(items) <= limit {
		return items
	}
	return items[:limit]
}
