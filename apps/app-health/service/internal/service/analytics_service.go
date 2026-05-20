package service

import (
	"context"
	"errors"
	"strings"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
)

var ErrInvalidAnalyticsQuery = errors.New("invalid analytics query")

type AnalyticsService struct {
	analytics repository.AnalyticsRepository
}

func NewAnalyticsService(analytics repository.AnalyticsRepository) *AnalyticsService {
	return &AnalyticsService{analytics: analytics}
}

func (s *AnalyticsService) UserTimeline(ctx context.Context, query domain.AnalyticsTimelineQuery) (domain.AnalyticsTimelineResponse, error) {
	query.UserID = strings.TrimSpace(query.UserID)
	if query.UserID == "" {
		return domain.AnalyticsTimelineResponse{}, ErrInvalidAnalyticsQuery
	}
	query.Limit = normalizeLimit(query.Limit, 100, 500)
	items, err := s.analytics.UserTimeline(ctx, query)
	if err != nil {
		return domain.AnalyticsTimelineResponse{}, err
	}
	return domain.AnalyticsTimelineResponse{Items: items}, nil
}

func (s *AnalyticsService) EventTimeline(ctx context.Context, eventID string, windowMinutes int) (domain.AnalyticsTimelineResponse, error) {
	eventID = strings.TrimSpace(eventID)
	if eventID == "" {
		return domain.AnalyticsTimelineResponse{}, ErrInvalidAnalyticsQuery
	}
	items, err := s.analytics.EventTimeline(ctx, eventID, normalizeLimit(windowMinutes, 10, 1440))
	if err != nil {
		return domain.AnalyticsTimelineResponse{}, err
	}
	return domain.AnalyticsTimelineResponse{Items: items}, nil
}

func (s *AnalyticsService) ScreenStats(ctx context.Context, query domain.AnalyticsStatsQuery) (domain.ScreenStatsResponse, error) {
	query.Limit = normalizeLimit(query.Limit, 50, 200)
	items, err := s.analytics.ScreenStats(ctx, query)
	if err != nil {
		return domain.ScreenStatsResponse{}, err
	}
	return domain.ScreenStatsResponse{Items: items}, nil
}

func (s *AnalyticsService) Distribution(ctx context.Context, query domain.AnalyticsDistributionQuery) (domain.AnalyticsDistributionResponse, error) {
	query.Dimension = strings.TrimSpace(query.Dimension)
	if !isValidAnalyticsDimension(query.Dimension) {
		return domain.AnalyticsDistributionResponse{}, ErrInvalidAnalyticsQuery
	}
	query.Limit = normalizeLimit(query.Limit, 20, 100)
	items, err := s.analytics.Distribution(ctx, query)
	if err != nil {
		return domain.AnalyticsDistributionResponse{}, err
	}
	return domain.AnalyticsDistributionResponse{Dimension: query.Dimension, Items: items}, nil
}

func isValidAnalyticsDimension(dimension string) bool {
	switch dimension {
	case "platform", "osVersion", "deviceModel", "deviceBrand", "appVersion", "buildNumber", "country", "province", "city":
		return true
	default:
		return false
	}
}

func normalizeLimit(value int, fallback int, max int) int {
	if value <= 0 {
		return fallback
	}
	if value > max {
		return max
	}
	return value
}
