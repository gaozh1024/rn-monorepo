package service

import (
	"context"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
)

type EventService struct{ events repository.EventRepository }

func NewEventService(events repository.EventRepository) *EventService {
	return &EventService{events: events}
}

func (s *EventService) List(ctx context.Context, query domain.EventQuery) (domain.EventListResponse, error) {
	items, total, err := s.events.List(ctx, query)
	if err != nil {
		return domain.EventListResponse{}, err
	}
	return domain.EventListResponse{Items: items, Total: total, Page: normalizePage(query.Page), PageSize: normalizePageSize(query.PageSize)}, nil
}

func (s *EventService) Get(ctx context.Context, id string) (domain.HealthEvent, error) {
	return s.events.Get(ctx, id)
}
