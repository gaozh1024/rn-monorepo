package service

import (
	"context"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
)

type StatsService struct {
	events repository.EventRepository
	issues repository.IssueRepository
}

func NewStatsService(events repository.EventRepository, issues repository.IssueRepository) *StatsService {
	return &StatsService{events: events, issues: issues}
}

func (s *StatsService) Overview(ctx context.Context, appID string) (domain.StatsOverviewResponse, error) {
	eventsToday, fatalEventsToday, affectedUsersToday, err := s.events.CountToday(ctx, appID)
	if err != nil {
		return domain.StatsOverviewResponse{}, err
	}
	openIssues, err := s.issues.CountOpen(ctx, appID)
	if err != nil {
		return domain.StatsOverviewResponse{}, err
	}
	return domain.StatsOverviewResponse{OpenIssues: openIssues, EventsToday: eventsToday, AffectedUsersToday: affectedUsersToday, FatalEventsToday: fatalEventsToday}, nil
}

func normalizePage(page int) int {
	if page <= 0 {
		return 1
	}
	return page
}

func normalizePageSize(pageSize int) int {
	if pageSize <= 0 {
		return 20
	}
	if pageSize > 100 {
		return 100
	}
	return pageSize
}
