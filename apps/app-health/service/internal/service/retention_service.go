package service

import (
	"context"
	"errors"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
)

type RetentionService struct {
	events repository.EventRepository
	issues repository.IssueRepository
	now    func() time.Time
}

type RetentionOptions struct {
	EventRetentionDays int  `json:"eventRetentionDays"`
	DryRun             bool `json:"dryRun"`
}

type RetentionResult struct {
	Cutoff            time.Time `json:"cutoff"`
	ProtectedEventIDs int       `json:"protectedEventIds"`
	DeletedEvents     int       `json:"deletedEvents"`
	DryRun            bool      `json:"dryRun"`
}

func NewRetentionService(events repository.EventRepository, issues repository.IssueRepository) *RetentionService {
	return &RetentionService{events: events, issues: issues, now: time.Now}
}

func (s *RetentionService) Run(ctx context.Context, options RetentionOptions) (RetentionResult, error) {
	if options.EventRetentionDays <= 0 {
		return RetentionResult{}, errors.New("event retention days must be greater than 0")
	}
	cutoff := s.now().UTC().AddDate(0, 0, -options.EventRetentionDays)
	protectedIDs, err := s.issues.ProtectedEventIDs(ctx)
	if err != nil {
		return RetentionResult{}, err
	}
	deletedEvents, err := s.events.DeleteBefore(ctx, cutoff, protectedIDs, options.DryRun)
	if err != nil {
		return RetentionResult{}, err
	}
	return RetentionResult{
		Cutoff:            cutoff,
		ProtectedEventIDs: len(protectedIDs),
		DeletedEvents:     deletedEvents,
		DryRun:            options.DryRun,
	}, nil
}
