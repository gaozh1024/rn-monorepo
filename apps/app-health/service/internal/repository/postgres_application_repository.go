package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresApplicationRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresApplicationRepository(pool *pgxpool.Pool) *PostgresApplicationRepository {
	return &PostgresApplicationRepository{pool: pool}
}

func (r *PostgresApplicationRepository) Create(ctx context.Context, application domain.Application) (domain.Application, error) {
	rows, err := r.pool.Query(ctx, `
INSERT INTO app_health_applications (
  id, name, slug, description, default_environment, platforms, status
) VALUES ($1,$2,$3,$4,$5,$6,$7)
RETURNING id, name, slug, description, default_environment, platforms, status, created_at, updated_at`,
		application.ID, application.Name, application.Slug, application.Description,
		application.DefaultEnvironment, application.Platforms, string(application.Status),
	)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.Application{}, ErrDuplicate
		}
		return domain.Application{}, err
	}
	defer rows.Close()
	created, err := pgx.CollectOneRow(rows, scanApplication)
	if isUniqueViolation(err) {
		return domain.Application{}, ErrDuplicate
	}
	return created, err
}

func (r *PostgresApplicationRepository) List(ctx context.Context) ([]domain.ApplicationSummary, error) {
	rows, err := r.pool.Query(ctx, `
SELECT
  a.id, a.name, a.slug, a.description, a.default_environment, a.platforms, a.status, a.created_at, a.updated_at,
  count(DISTINCT t.id) FILTER (WHERE t.revoked_at IS NULL) AS effective_token_count,
  count(DISTINCT e.id) AS event_count,
  count(DISTINCT i.id) AS issue_count,
  max(e.created_at) AS last_event_at
FROM app_health_applications a
LEFT JOIN app_health_ingest_tokens t ON t.application_id = a.id
LEFT JOIN app_health_events e ON e.app_id = a.slug
LEFT JOIN app_health_issues i ON i.app_id = a.slug
GROUP BY a.id
ORDER BY a.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, scanApplicationSummary)
}

func (r *PostgresApplicationRepository) Get(ctx context.Context, id string) (domain.Application, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, name, slug, description, default_environment, platforms, status, created_at, updated_at
FROM app_health_applications
WHERE id = $1 OR slug = $1`, id)
	if err != nil {
		return domain.Application{}, err
	}
	defer rows.Close()
	application, err := pgx.CollectOneRow(rows, scanApplication)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Application{}, ErrNotFound
	}
	return application, err
}

func (r *PostgresApplicationRepository) Update(ctx context.Context, application domain.Application) (domain.Application, error) {
	rows, err := r.pool.Query(ctx, `
UPDATE app_health_applications SET
  name = $2,
  description = $3,
  default_environment = $4,
  platforms = $5,
  status = $6,
  updated_at = now()
WHERE id = $1
RETURNING id, name, slug, description, default_environment, platforms, status, created_at, updated_at`,
		application.ID, application.Name, application.Description, application.DefaultEnvironment,
		application.Platforms, string(application.Status),
	)
	if err != nil {
		return domain.Application{}, err
	}
	defer rows.Close()
	updated, err := pgx.CollectOneRow(rows, scanApplication)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Application{}, ErrNotFound
	}
	return updated, err
}

func (r *PostgresApplicationRepository) Delete(ctx context.Context, id string) error {
	commandTag, err := r.pool.Exec(ctx, `DELETE FROM app_health_applications WHERE id = $1 OR slug = $1`, id)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type PostgresIngestTokenRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresIngestTokenRepository(pool *pgxpool.Pool) *PostgresIngestTokenRepository {
	return &PostgresIngestTokenRepository{pool: pool}
}

func (r *PostgresIngestTokenRepository) Create(ctx context.Context, token domain.IngestToken) (domain.IngestToken, error) {
	rows, err := r.pool.Query(ctx, `
INSERT INTO app_health_ingest_tokens (
  id, application_id, name, token_hash, token_prefix
) VALUES ($1,$2,$3,$4,$5)
RETURNING id, application_id, name, token_hash, token_prefix, last_used_at, revoked_at, created_at`,
		token.ID, token.ApplicationID, token.Name, token.TokenHash, token.TokenPrefix,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.IngestToken{}, ErrDuplicate
		}
		return domain.IngestToken{}, err
	}
	defer rows.Close()
	created, err := pgx.CollectOneRow(rows, scanIngestToken)
	if isUniqueViolation(err) {
		return domain.IngestToken{}, ErrDuplicate
	}
	return created, err
}

func (r *PostgresIngestTokenRepository) ListByApplication(ctx context.Context, applicationID string) ([]domain.IngestToken, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, application_id, name, token_hash, token_prefix, last_used_at, revoked_at, created_at
FROM app_health_ingest_tokens
WHERE application_id = $1
ORDER BY created_at DESC`, applicationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, scanIngestToken)
}

func (r *PostgresIngestTokenRepository) Get(ctx context.Context, id string) (domain.IngestToken, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, application_id, name, token_hash, token_prefix, last_used_at, revoked_at, created_at
FROM app_health_ingest_tokens
WHERE id = $1`, id)
	if err != nil {
		return domain.IngestToken{}, err
	}
	defer rows.Close()
	token, err := pgx.CollectOneRow(rows, scanIngestToken)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.IngestToken{}, ErrNotFound
	}
	return token, err
}

func (r *PostgresIngestTokenRepository) FindActiveByHash(ctx context.Context, tokenHash string) (domain.IngestToken, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, application_id, name, token_hash, token_prefix, last_used_at, revoked_at, created_at
FROM app_health_ingest_tokens
WHERE token_hash = $1 AND revoked_at IS NULL`, tokenHash)
	if err != nil {
		return domain.IngestToken{}, err
	}
	defer rows.Close()
	token, err := pgx.CollectOneRow(rows, scanIngestToken)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.IngestToken{}, ErrNotFound
	}
	return token, err
}

func (r *PostgresIngestTokenRepository) MarkUsed(ctx context.Context, id string, usedAt time.Time) error {
	commandTag, err := r.pool.Exec(ctx, `UPDATE app_health_ingest_tokens SET last_used_at = $2 WHERE id = $1`, id, usedAt)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresIngestTokenRepository) Revoke(ctx context.Context, id string) (domain.IngestToken, error) {
	rows, err := r.pool.Query(ctx, `
UPDATE app_health_ingest_tokens
SET revoked_at = COALESCE(revoked_at, now())
WHERE id = $1
RETURNING id, application_id, name, token_hash, token_prefix, last_used_at, revoked_at, created_at`, id)
	if err != nil {
		return domain.IngestToken{}, err
	}
	defer rows.Close()
	token, err := pgx.CollectOneRow(rows, scanIngestToken)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.IngestToken{}, ErrNotFound
	}
	return token, err
}

func (r *PostgresIngestTokenRepository) Delete(ctx context.Context, id string) error {
	commandTag, err := r.pool.Exec(ctx, `DELETE FROM app_health_ingest_tokens WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresIngestTokenRepository) RevokeByApplication(ctx context.Context, applicationID string) (int, error) {
	commandTag, err := r.pool.Exec(ctx, `
UPDATE app_health_ingest_tokens
SET revoked_at = COALESCE(revoked_at, now())
WHERE application_id = $1 AND revoked_at IS NULL`, applicationID)
	if err != nil {
		return 0, err
	}
	return int(commandTag.RowsAffected()), nil
}

func (r *PostgresIngestTokenRepository) DeleteByApplication(ctx context.Context, applicationID string) (int, error) {
	commandTag, err := r.pool.Exec(ctx, `DELETE FROM app_health_ingest_tokens WHERE application_id = $1`, applicationID)
	if err != nil {
		return 0, err
	}
	return int(commandTag.RowsAffected()), nil
}

func scanApplication(row pgx.CollectableRow) (domain.Application, error) {
	var application domain.Application
	var status string
	err := row.Scan(
		&application.ID, &application.Name, &application.Slug, &application.Description,
		&application.DefaultEnvironment, &application.Platforms, &status,
		&application.CreatedAt, &application.UpdatedAt,
	)
	application.Status = domain.ApplicationStatus(status)
	return application, err
}

func scanApplicationSummary(row pgx.CollectableRow) (domain.ApplicationSummary, error) {
	var summary domain.ApplicationSummary
	var status string
	var lastEventAt sql.NullTime
	err := row.Scan(
		&summary.ID, &summary.Name, &summary.Slug, &summary.Description,
		&summary.DefaultEnvironment, &summary.Platforms, &status,
		&summary.CreatedAt, &summary.UpdatedAt, &summary.EffectiveTokenCount,
		&summary.EventCount, &summary.IssueCount, &lastEventAt,
	)
	if lastEventAt.Valid {
		summary.LastEventAt = &lastEventAt.Time
	}
	summary.Status = domain.ApplicationStatus(status)
	return summary, err
}

func scanIngestToken(row pgx.CollectableRow) (domain.IngestToken, error) {
	var token domain.IngestToken
	var lastUsedAt, revokedAt sql.NullTime
	err := row.Scan(
		&token.ID, &token.ApplicationID, &token.Name, &token.TokenHash, &token.TokenPrefix,
		&lastUsedAt, &revokedAt, &token.CreatedAt,
	)
	if lastUsedAt.Valid {
		token.LastUsedAt = &lastUsedAt.Time
	}
	if revokedAt.Valid {
		token.RevokedAt = &revokedAt.Time
	}
	return token, err
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
