package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRetentionRunRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRetentionRunRepository(pool *pgxpool.Pool) *PostgresRetentionRunRepository {
	return &PostgresRetentionRunRepository{pool: pool}
}

func (r *PostgresRetentionRunRepository) Create(ctx context.Context, run domain.RetentionRun) (domain.RetentionRun, error) {
	rows, err := r.pool.Query(ctx, `
INSERT INTO app_health_retention_runs (
  id, mode, event_retention_days, cutoff, protected_event_ids, deleted_events,
  dry_run, status, error_message, requested_by, source, created_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
RETURNING id, mode, event_retention_days, cutoff, protected_event_ids, deleted_events,
  dry_run, status, error_message, requested_by, source, created_at`,
		run.ID, string(run.Mode), run.EventRetentionDays, run.Cutoff, run.ProtectedEventIDs,
		run.DeletedEvents, run.DryRun, string(run.Status), run.ErrorMessage, run.RequestedBy,
		run.Source, run.CreatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.RetentionRun{}, ErrDuplicate
		}
		return domain.RetentionRun{}, err
	}
	defer rows.Close()
	created, err := pgx.CollectOneRow(rows, scanRetentionRun)
	if isUniqueViolation(err) {
		return domain.RetentionRun{}, ErrDuplicate
	}
	return created, err
}

func (r *PostgresRetentionRunRepository) List(ctx context.Context, limit int) ([]domain.RetentionRun, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM app_health_retention_runs`).Scan(&total); err != nil {
		return nil, 0, err
	}
	limit = normalizeRetentionLimit(limit)
	rows, err := r.pool.Query(ctx, `
SELECT id, mode, event_retention_days, cutoff, protected_event_ids, deleted_events,
  dry_run, status, error_message, requested_by, source, created_at
FROM app_health_retention_runs
ORDER BY created_at DESC
LIMIT $1`, limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items, err := pgx.CollectRows(rows, scanRetentionRun)
	return items, total, err
}

func (r *PostgresRetentionRunRepository) Get(ctx context.Context, id string) (domain.RetentionRun, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, mode, event_retention_days, cutoff, protected_event_ids, deleted_events,
  dry_run, status, error_message, requested_by, source, created_at
FROM app_health_retention_runs
WHERE id = $1`, id)
	if err != nil {
		return domain.RetentionRun{}, err
	}
	defer rows.Close()
	run, err := pgx.CollectOneRow(rows, scanRetentionRun)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.RetentionRun{}, ErrNotFound
	}
	return run, err
}

func scanRetentionRun(row pgx.CollectableRow) (domain.RetentionRun, error) {
	var run domain.RetentionRun
	var mode, status string
	var cutoff sql.NullTime
	err := row.Scan(
		&run.ID, &mode, &run.EventRetentionDays, &cutoff, &run.ProtectedEventIDs,
		&run.DeletedEvents, &run.DryRun, &status, &run.ErrorMessage, &run.RequestedBy,
		&run.Source, &run.CreatedAt,
	)
	run.Mode = domain.RetentionRunMode(mode)
	run.Status = domain.RetentionRunStatus(status)
	if cutoff.Valid {
		t := cutoff.Time.UTC()
		run.Cutoff = &t
	}
	return run, err
}
