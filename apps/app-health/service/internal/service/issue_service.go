package service

import (
	"context"
	"errors"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
)

type IssueService struct {
	issues repository.IssueRepository
	events repository.EventRepository
}

func NewIssueService(issues repository.IssueRepository, events repository.EventRepository) *IssueService {
	return &IssueService{issues: issues, events: events}
}

func (s *IssueService) List(ctx context.Context, query domain.IssueQuery) (domain.IssueListResponse, error) {
	items, total, err := s.issues.List(ctx, query)
	if err != nil {
		return domain.IssueListResponse{}, err
	}
	return domain.IssueListResponse{Items: items, Total: total, Page: normalizePage(query.Page), PageSize: normalizePageSize(query.PageSize)}, nil
}

func (s *IssueService) Get(ctx context.Context, id string) (domain.IssueDetailResponse, error) {
	issue, err := s.issues.Get(ctx, id)
	if err != nil {
		return domain.IssueDetailResponse{}, err
	}
	recent, err := s.events.ListByIssue(ctx, id, 20)
	if err != nil {
		return domain.IssueDetailResponse{}, err
	}
	var sample *domain.HealthEvent
	if issue.SampleEventID != "" {
		if event, err := s.events.Get(ctx, issue.SampleEventID); err == nil {
			sample = &event
		}
	}
	return domain.IssueDetailResponse{
		Issue:                issue,
		SampleEvent:          sample,
		RecentEvents:         recent,
		VersionDistribution:  distribution(recent, func(event domain.HealthEvent) string { return event.App.Version }),
		PlatformDistribution: distribution(recent, func(event domain.HealthEvent) string { return event.Device.Platform }),
	}, nil
}

func (s *IssueService) UpdateStatus(ctx context.Context, id string, status domain.IssueStatus) (domain.HealthIssue, error) {
	if status != domain.IssueStatusOpen && status != domain.IssueStatusResolved && status != domain.IssueStatusIgnored {
		return domain.HealthIssue{}, errors.New("invalid issue status")
	}
	return s.issues.UpdateStatus(ctx, id, status)
}

func distribution(events []domain.HealthEvent, keyFn func(domain.HealthEvent) string) []domain.DistributionBucket {
	counts := map[string]int{}
	for _, event := range events {
		key := keyFn(event)
		if key == "" {
			key = "unknown"
		}
		counts[key]++
	}
	out := make([]domain.DistributionBucket, 0, len(counts))
	for key, count := range counts {
		out = append(out, domain.DistributionBucket{Name: key, Count: count})
	}
	return out
}
