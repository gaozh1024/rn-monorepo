package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
	"github.com/google/uuid"
)

const RetentionRunConfirmText = "DELETE_OLD_EVENTS"

var (
	ErrInvalidRetentionRequest  = errors.New("invalid retention request")
	ErrRetentionRunNotConfirmed = errors.New("retention run not confirmed")
)

type RetentionOperationService struct {
	retention    *RetentionService
	runs         repository.RetentionRunRepository
	defaultDays  int
	now          func() time.Time
	dryRunMaxAge time.Duration
}

type RetentionDryRunInput struct {
	EventRetentionDays int
	RequestedBy        string
}

type RetentionRunInput struct {
	EventRetentionDays int
	DryRunID           string
	ConfirmText        string
	AcknowledgedBackup bool
	AcknowledgedDryRun bool
	RequestedBy        string
}

func NewRetentionOperationService(retention *RetentionService, runs repository.RetentionRunRepository, defaultDays int) *RetentionOperationService {
	return &RetentionOperationService{
		retention:    retention,
		runs:         runs,
		defaultDays:  defaultDays,
		now:          func() time.Time { return time.Now().UTC() },
		dryRunMaxAge: 30 * time.Minute,
	}
}

func (s *RetentionOperationService) DryRun(ctx context.Context, input RetentionDryRunInput) (domain.RetentionRun, error) {
	days, err := s.normalizeDays(input.EventRetentionDays)
	if err != nil {
		return domain.RetentionRun{}, err
	}
	return s.execute(ctx, domain.RetentionRunModeDryRun, days, true, input.RequestedBy)
}

func (s *RetentionOperationService) Run(ctx context.Context, input RetentionRunInput) (domain.RetentionRun, error) {
	days, err := s.normalizeDays(input.EventRetentionDays)
	if err != nil {
		return domain.RetentionRun{}, err
	}
	if strings.TrimSpace(input.ConfirmText) != RetentionRunConfirmText || !input.AcknowledgedBackup || !input.AcknowledgedDryRun {
		return domain.RetentionRun{}, ErrRetentionRunNotConfirmed
	}
	dryRun, err := s.runs.Get(ctx, strings.TrimSpace(input.DryRunID))
	if err != nil {
		return domain.RetentionRun{}, ErrRetentionRunNotConfirmed
	}
	if dryRun.Mode != domain.RetentionRunModeDryRun || dryRun.Status != domain.RetentionRunStatusSuccess || !dryRun.DryRun {
		return domain.RetentionRun{}, ErrRetentionRunNotConfirmed
	}
	if dryRun.EventRetentionDays != days {
		return domain.RetentionRun{}, ErrRetentionRunNotConfirmed
	}
	if s.now().Sub(dryRun.CreatedAt) > s.dryRunMaxAge {
		return domain.RetentionRun{}, ErrRetentionRunNotConfirmed
	}
	return s.execute(ctx, domain.RetentionRunModeRun, days, false, input.RequestedBy)
}

func (s *RetentionOperationService) List(ctx context.Context, limit int) (domain.RetentionRunListResponse, error) {
	items, total, err := s.runs.List(ctx, limit)
	if err != nil {
		return domain.RetentionRunListResponse{}, err
	}
	return domain.RetentionRunListResponse{Items: items, Total: total, Limit: normalizeRetentionListLimit(limit)}, nil
}

func (s *RetentionOperationService) normalizeDays(value int) (int, error) {
	if value == 0 {
		value = s.defaultDays
	}
	if value <= 0 || value > 3650 {
		return 0, ErrInvalidRetentionRequest
	}
	return value, nil
}

func (s *RetentionOperationService) execute(ctx context.Context, mode domain.RetentionRunMode, days int, dryRun bool, requestedBy string) (domain.RetentionRun, error) {
	createdAt := s.now()
	run := domain.RetentionRun{
		ID:                 "ret_" + uuid.NewString(),
		Mode:               mode,
		EventRetentionDays: days,
		DryRun:             dryRun,
		Status:             domain.RetentionRunStatusSuccess,
		RequestedBy:        strings.TrimSpace(requestedBy),
		Source:             "admin",
		CreatedAt:          createdAt,
	}
	result, err := s.retention.Run(ctx, RetentionOptions{EventRetentionDays: days, DryRun: dryRun})
	run.Cutoff = &result.Cutoff
	run.ProtectedEventIDs = result.ProtectedEventIDs
	run.DeletedEvents = result.DeletedEvents
	if err != nil {
		run.Status = domain.RetentionRunStatusFailed
		run.ErrorMessage = err.Error()
		created, createErr := s.runs.Create(ctx, run)
		if createErr != nil {
			return domain.RetentionRun{}, createErr
		}
		return created, err
	}
	return s.runs.Create(ctx, run)
}

func normalizeRetentionListLimit(limit int) int {
	if limit <= 0 {
		return 20
	}
	if limit > 100 {
		return 100
	}
	return limit
}
