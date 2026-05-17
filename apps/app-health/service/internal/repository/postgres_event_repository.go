package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresEventRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresEventRepository(pool *pgxpool.Pool) *PostgresEventRepository {
	return &PostgresEventRepository{pool: pool}
}

func (r *PostgresEventRepository) Insert(ctx context.Context, event domain.HealthEvent) (domain.HealthEvent, error) {
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	if event.Error == nil {
		event.Error = &domain.ErrorInfo{}
	}
	var raw map[string]any
	raw = decodeJSON(jsonBytes(event), map[string]any{})
	commandTag, err := r.pool.Exec(ctx, `
INSERT INTO app_health_events (
  id, app_id, app_version, build_number, environment,
  type, level, platform, os_version, device_model,
  user_id, session_id, error_name, error_message, error_stack,
  component_stack, fingerprint, breadcrumbs, tags, extra, raw_event,
  event_timestamp, created_at
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
) ON CONFLICT (id) DO NOTHING`,
		event.ID, event.App.ID, event.App.Version, event.App.BuildNumber, event.App.Environment,
		event.Type, string(event.Level), event.Device.Platform, event.Device.OSVersion, event.Device.Model,
		userID(event), event.Session.ID, event.Error.Name, event.Error.Message, event.Error.Stack,
		event.Error.ComponentStack, event.Error.Fingerprint, jsonBytes(event.Breadcrumbs), jsonBytes(event.Tags), jsonBytes(event.Extra), jsonBytes(raw),
		eventTimestamp(event.Timestamp), event.CreatedAt,
	)
	if err != nil {
		return domain.HealthEvent{}, err
	}
	if commandTag.RowsAffected() == 0 {
		return domain.HealthEvent{}, ErrDuplicate
	}
	return event, nil
}

func (r *PostgresEventRepository) AttachIssue(ctx context.Context, eventID string, issueID string) error {
	commandTag, err := r.pool.Exec(ctx, `UPDATE app_health_events SET issue_id = $2 WHERE id = $1`, eventID, issueID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresEventRepository) List(ctx context.Context, query domain.EventQuery) ([]domain.HealthEvent, int, error) {
	where, args := eventWhere(query)
	countSQL := `SELECT count(*) FROM app_health_events` + where
	var total int
	if err := r.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	page := normalizeQueryPage(query.Page)
	pageSize := normalizeQueryPageSize(query.PageSize)
	args = append(args, pageSize, (page-1)*pageSize)
	rows, err := r.pool.Query(ctx, `
SELECT id, app_id, app_version, build_number, environment, type, level, platform, os_version, device_model,
  user_id, session_id, error_name, error_message, error_stack, component_stack, fingerprint,
  breadcrumbs, tags, extra, issue_id, event_timestamp, created_at
FROM app_health_events`+where+`
ORDER BY created_at DESC
LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	events, err := pgx.CollectRows(rows, scanEvent)
	if err != nil {
		return nil, 0, err
	}
	return events, total, nil
}

func (r *PostgresEventRepository) Get(ctx context.Context, id string) (domain.HealthEvent, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, app_id, app_version, build_number, environment, type, level, platform, os_version, device_model,
  user_id, session_id, error_name, error_message, error_stack, component_stack, fingerprint,
  breadcrumbs, tags, extra, issue_id, event_timestamp, created_at
FROM app_health_events WHERE id = $1`, id)
	if err != nil {
		return domain.HealthEvent{}, err
	}
	defer rows.Close()
	event, err := pgx.CollectOneRow(rows, scanEvent)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.HealthEvent{}, ErrNotFound
	}
	return event, err
}

func (r *PostgresEventRepository) ListByIssue(ctx context.Context, issueID string, limit int) ([]domain.HealthEvent, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
SELECT id, app_id, app_version, build_number, environment, type, level, platform, os_version, device_model,
  user_id, session_id, error_name, error_message, error_stack, component_stack, fingerprint,
  breadcrumbs, tags, extra, issue_id, event_timestamp, created_at
FROM app_health_events WHERE issue_id = $1 ORDER BY created_at DESC LIMIT $2`, issueID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, scanEvent)
}

func (r *PostgresEventRepository) CountToday(ctx context.Context, appID string) (int, int, int, error) {
	where := `WHERE created_at >= date_trunc('day', now())`
	args := []any{}
	if appID != "" {
		args = append(args, appID)
		where += ` AND app_id = $1`
	}
	var events, fatal, users int
	err := r.pool.QueryRow(ctx, `
SELECT count(*), count(*) FILTER (WHERE level = 'fatal'), count(DISTINCT NULLIF(user_id, ''))
FROM app_health_events `+where, args...).Scan(&events, &fatal, &users)
	return events, fatal, users, err
}

func (r *PostgresEventRepository) DeleteBefore(ctx context.Context, before time.Time, protectedIDs []string, dryRun bool) (int, error) {
	if protectedIDs == nil {
		protectedIDs = []string{}
	}
	if dryRun {
		var count int
		err := r.pool.QueryRow(ctx, `
SELECT count(*)
FROM app_health_events
WHERE created_at < $1 AND NOT (id = ANY($2::text[]))`, before, protectedIDs).Scan(&count)
		return count, err
	}
	commandTag, err := r.pool.Exec(ctx, `
DELETE FROM app_health_events
WHERE created_at < $1 AND NOT (id = ANY($2::text[]))`, before, protectedIDs)
	if err != nil {
		return 0, err
	}
	return int(commandTag.RowsAffected()), nil
}

func eventWhere(query domain.EventQuery) (string, []any) {
	clauses := []string{}
	args := []any{}
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if query.AppID != "" {
		add("app_id = $%d", query.AppID)
	}
	if query.IssueID != "" {
		add("issue_id = $%d", query.IssueID)
	}
	if query.UserID != "" {
		add("user_id = $%d", query.UserID)
	}
	if query.Level != "" {
		add("level = $%d", query.Level)
	}
	if query.Type != "" {
		add("type = $%d", query.Type)
	}
	if !query.From.IsZero() {
		add("created_at >= $%d", query.From)
	}
	if !query.To.IsZero() {
		add("created_at <= $%d", query.To)
	}
	if query.AppVersion != "" {
		add("app_version = $%d", query.AppVersion)
	}
	if query.BuildNumber != "" {
		add("build_number = $%d", query.BuildNumber)
	}
	if query.Environment != "" {
		add("environment = $%d", query.Environment)
	}
	if query.Platform != "" {
		add("platform = $%d", query.Platform)
	}
	if query.OSVersion != "" {
		add("os_version = $%d", query.OSVersion)
	}
	if query.SessionID != "" {
		add("session_id = $%d", query.SessionID)
	}
	if query.Fingerprint != "" {
		add("fingerprint = $%d", query.Fingerprint)
	}
	if query.Message != "" {
		add("error_message ILIKE '%%' || $%d || '%%'", query.Message)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func scanEvent(row pgx.CollectableRow) (domain.HealthEvent, error) {
	var event domain.HealthEvent
	var level string
	var userIDValue sql.NullString
	var appVersion, buildNumber, environment sql.NullString
	var platform, osVersion, model sql.NullString
	var errorName, errorMessage, errorStack, componentStack, fingerprint sql.NullString
	var breadcrumbsBytes, tagsBytes, extraBytes []byte
	var issueID sql.NullString
	var timestamp *time.Time
	err := row.Scan(
		&event.ID, &event.App.ID, &appVersion, &buildNumber, &environment,
		&event.Type, &level, &platform, &osVersion, &model,
		&userIDValue, &event.Session.ID, &errorName, &errorMessage, &errorStack, &componentStack, &fingerprint,
		&breadcrumbsBytes, &tagsBytes, &extraBytes, &issueID, &timestamp, &event.CreatedAt,
	)
	if err != nil {
		return domain.HealthEvent{}, err
	}
	event.App.Version = appVersion.String
	event.App.BuildNumber = buildNumber.String
	event.App.Environment = environment.String
	event.Device.Platform = platform.String
	event.Device.OSVersion = osVersion.String
	event.Device.Model = model.String
	event.Level = domain.EventLevel(level)
	event.User = nullableUser(userIDValue.String)
	event.Error = &domain.ErrorInfo{
		Name:           errorName.String,
		Message:        errorMessage.String,
		Stack:          errorStack.String,
		ComponentStack: componentStack.String,
		Fingerprint:    fingerprint.String,
	}
	event.Breadcrumbs = decodeJSON(breadcrumbsBytes, []domain.Breadcrumb{})
	event.Tags = decodeJSON(tagsBytes, map[string]string{})
	event.Extra = decodeJSON(extraBytes, map[string]any{})
	event.IssueID = issueID.String
	event.Timestamp = eventTimestampMillis(timestamp)
	return event, nil
}

func normalizeQueryPage(page int) int {
	if page <= 0 {
		return 1
	}
	return page
}

func normalizeQueryPageSize(pageSize int) int {
	if pageSize <= 0 {
		return 20
	}
	if pageSize > 100 {
		return 100
	}
	return pageSize
}
