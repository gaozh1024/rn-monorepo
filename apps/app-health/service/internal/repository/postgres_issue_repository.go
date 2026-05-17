package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresIssueRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresIssueRepository(pool *pgxpool.Pool) *PostgresIssueRepository {
	return &PostgresIssueRepository{pool: pool}
}

func (r *PostgresIssueRepository) FindByFingerprint(ctx context.Context, appID string, fingerprint string) (domain.HealthIssue, error) {
	rows, err := r.pool.Query(ctx, issueSelectSQL()+` WHERE app_id = $1 AND fingerprint = $2`, appID, fingerprint)
	if err != nil {
		return domain.HealthIssue{}, err
	}
	defer rows.Close()
	issue, err := pgx.CollectOneRow(rows, scanIssue)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.HealthIssue{}, ErrNotFound
	}
	return issue, err
}

func (r *PostgresIssueRepository) UpsertForEvent(ctx context.Context, event domain.HealthEvent, title string, fingerprint string) (domain.HealthIssue, error) {
	now := time.Now().UTC()
	id := "issue_" + uuid.NewString()
	rows, err := r.pool.Query(ctx, `WITH upsert AS (
  INSERT INTO app_health_issues (
    id, app_id, fingerprint, title, level, status, event_count, affected_user_count,
    first_seen_at, last_seen_at, last_event_id, sample_event_id,
    last_app_version, last_build_number, last_platform, created_at, updated_at
  ) VALUES (
    $1,$2,$3,$4,$5,'open',1,
    (SELECT count(DISTINCT NULLIF(user_id, '')) FROM app_health_events WHERE app_id = $2 AND fingerprint = $3),
    $6,$6,$7,$7,$8,$9,$10,$6,$6
  )
  ON CONFLICT (app_id, fingerprint) DO UPDATE SET
    event_count = app_health_issues.event_count + 1,
    affected_user_count = (SELECT count(DISTINCT NULLIF(user_id, '')) FROM app_health_events WHERE app_id = $2 AND fingerprint = $3),
    last_seen_at = EXCLUDED.last_seen_at,
    last_event_id = EXCLUDED.last_event_id,
    last_app_version = EXCLUDED.last_app_version,
    last_build_number = EXCLUDED.last_build_number,
    last_platform = EXCLUDED.last_platform,
    level = CASE
      WHEN app_health_issues.level = 'fatal' OR EXCLUDED.level = 'fatal' THEN 'fatal'
      WHEN app_health_issues.level = 'error' OR EXCLUDED.level = 'error' THEN 'error'
      WHEN app_health_issues.level = 'warning' OR EXCLUDED.level = 'warning' THEN 'warning'
      ELSE EXCLUDED.level
    END,
    updated_at = EXCLUDED.updated_at
  RETURNING id, app_id, fingerprint, title, level, status, event_count, affected_user_count,
    first_seen_at, last_seen_at, last_event_id, sample_event_id,
    last_app_version, last_build_number, last_platform, created_at, updated_at
) SELECT `+issueColumns()+` FROM upsert`,
		id, event.App.ID, fingerprint, title, string(event.Level), now, event.ID,
		event.App.Version, event.App.BuildNumber, event.Device.Platform,
	)
	if err != nil {
		return domain.HealthIssue{}, err
	}
	defer rows.Close()
	return pgx.CollectOneRow(rows, scanIssue)
}

func (r *PostgresIssueRepository) List(ctx context.Context, query domain.IssueQuery) ([]domain.HealthIssue, int, error) {
	where, args := issueWhere(query)
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM app_health_issues`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	page := normalizeQueryPage(query.Page)
	pageSize := normalizeQueryPageSize(query.PageSize)
	args = append(args, pageSize, (page-1)*pageSize)
	rows, err := r.pool.Query(ctx, issueSelectSQL()+where+`
ORDER BY last_seen_at DESC
LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	issues, err := pgx.CollectRows(rows, scanIssue)
	if err != nil {
		return nil, 0, err
	}
	return issues, total, nil
}

func (r *PostgresIssueRepository) Get(ctx context.Context, id string) (domain.HealthIssue, error) {
	rows, err := r.pool.Query(ctx, issueSelectSQL()+` WHERE id = $1`, id)
	if err != nil {
		return domain.HealthIssue{}, err
	}
	defer rows.Close()
	issue, err := pgx.CollectOneRow(rows, scanIssue)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.HealthIssue{}, ErrNotFound
	}
	return issue, err
}

func (r *PostgresIssueRepository) UpdateStatus(ctx context.Context, id string, status domain.IssueStatus) (domain.HealthIssue, error) {
	rows, err := r.pool.Query(ctx, `WITH updated AS (
  UPDATE app_health_issues SET status = $2, updated_at = now() WHERE id = $1
  RETURNING id, app_id, fingerprint, title, level, status, event_count, affected_user_count,
    first_seen_at, last_seen_at, last_event_id, sample_event_id,
    last_app_version, last_build_number, last_platform, created_at, updated_at
) SELECT `+issueColumns()+` FROM updated`, id, string(status))
	if err != nil {
		return domain.HealthIssue{}, err
	}
	defer rows.Close()
	issue, err := pgx.CollectOneRow(rows, scanIssue)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.HealthIssue{}, ErrNotFound
	}
	return issue, err
}

func (r *PostgresIssueRepository) CountOpen(ctx context.Context, appID string) (int, error) {
	args := []any{string(domain.IssueStatusOpen)}
	where := `WHERE status = $1`
	if appID != "" {
		args = append(args, appID)
		where += ` AND app_id = $2`
	}
	var count int
	err := r.pool.QueryRow(ctx, `SELECT count(*) FROM app_health_issues `+where, args...).Scan(&count)
	return count, err
}

func (r *PostgresIssueRepository) ProtectedEventIDs(ctx context.Context) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
SELECT DISTINCT event_id
FROM (
  SELECT sample_event_id AS event_id FROM app_health_issues WHERE sample_event_id IS NOT NULL AND sample_event_id <> ''
  UNION
  SELECT last_event_id AS event_id FROM app_health_issues WHERE last_event_id IS NOT NULL AND last_event_id <> ''
) protected_events`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowTo[string])
}

func issueColumns() string {
	return `id, app_id, fingerprint, title, level, status, event_count, affected_user_count,
  first_seen_at, last_seen_at, last_event_id, sample_event_id,
  last_app_version, last_build_number, last_platform, created_at, updated_at`
}

func issueSelectSQL() string {
	return `SELECT ` + issueColumns() + ` FROM app_health_issues`
}

func issueWhere(query domain.IssueQuery) (string, []any) {
	clauses := []string{}
	args := []any{}
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if query.AppID != "" {
		add("app_id = $%d", query.AppID)
	}
	if query.Status != "" {
		add("status = $%d", query.Status)
	}
	if query.Level != "" {
		add("level = $%d", query.Level)
	}
	if query.Platform != "" {
		add("last_platform = $%d", query.Platform)
	}
	if !query.From.IsZero() {
		add("last_seen_at >= $%d", query.From)
	}
	if !query.To.IsZero() {
		add("last_seen_at <= $%d", query.To)
	}
	if query.AppVersion != "" {
		add("last_app_version = $%d", query.AppVersion)
	}
	if query.BuildNumber != "" {
		add("last_build_number = $%d", query.BuildNumber)
	}
	if query.Fingerprint != "" {
		add("fingerprint = $%d", query.Fingerprint)
	}
	if query.Message != "" {
		add("title ILIKE '%%' || $%d || '%%'", query.Message)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func scanIssue(row pgx.CollectableRow) (domain.HealthIssue, error) {
	var issue domain.HealthIssue
	var level, status string
	var lastEventID, sampleEventID, lastAppVersion, lastBuildNumber, lastPlatform sql.NullString
	err := row.Scan(
		&issue.ID, &issue.AppID, &issue.Fingerprint, &issue.Title, &level, &status,
		&issue.EventCount, &issue.AffectedUserCount, &issue.FirstSeenAt, &issue.LastSeenAt,
		&lastEventID, &sampleEventID, &lastAppVersion, &lastBuildNumber, &lastPlatform,
		&issue.CreatedAt, &issue.UpdatedAt,
	)
	if err != nil {
		return domain.HealthIssue{}, err
	}
	issue.Level = domain.EventLevel(level)
	issue.Status = domain.IssueStatus(status)
	issue.LastEventID = lastEventID.String
	issue.SampleEventID = sampleEventID.String
	issue.LastAppVersion = lastAppVersion.String
	issue.LastBuildNumber = lastBuildNumber.String
	issue.LastPlatform = lastPlatform.String
	return issue, nil
}
