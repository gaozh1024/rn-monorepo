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

type PostgresAnalyticsRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresAnalyticsRepository(pool *pgxpool.Pool) *PostgresAnalyticsRepository {
	return &PostgresAnalyticsRepository{pool: pool}
}

func (r *PostgresAnalyticsRepository) UserTimeline(ctx context.Context, query domain.AnalyticsTimelineQuery) ([]domain.AnalyticsTimelineItem, error) {
	where, args := analyticsWhere(query.AppID, query.From, query.To)
	args = append(args, query.UserID, normalizeAnalyticsLimit(query.Limit, 100, 500))
	rows, err := r.pool.Query(ctx, analyticsTimelineSelect()+where+fmt.Sprintf(` AND user_id = $%d ORDER BY created_at DESC LIMIT $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, scanTimelineItem)
}

func (r *PostgresAnalyticsRepository) EventTimeline(ctx context.Context, eventID string, windowMinutes int) ([]domain.AnalyticsTimelineItem, error) {
	target, err := r.eventByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if target.User == nil || target.User.ID == "" {
		return []domain.AnalyticsTimelineItem{timelineItem(target)}, nil
	}
	window := time.Duration(normalizeWindowMinutes(windowMinutes)) * time.Minute
	rows, err := r.pool.Query(ctx, analyticsTimelineSelect()+` WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3 ORDER BY created_at ASC`, target.User.ID, target.CreatedAt.Add(-window), target.CreatedAt.Add(window))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, scanTimelineItem)
}

func (r *PostgresAnalyticsRepository) ScreenStats(ctx context.Context, query domain.AnalyticsStatsQuery) ([]domain.ScreenStatsItem, error) {
	where, args := analyticsWhere(query.AppID, query.From, query.To)
	limit := normalizeAnalyticsLimit(query.Limit, 50, 200)
	args = append(args, limit)
	rows, err := r.pool.Query(ctx, `
SELECT COALESCE(NULLIF(tags->>'screen', ''), NULLIF(analytics_properties->>'screen', '')) AS screen,
  count(*) AS views,
  count(DISTINCT NULLIF(user_id, '')) AS users,
  count(DISTINCT NULLIF(session_id, '')) AS sessions,
  max(created_at) AS last_seen_at
FROM app_health_events`+where+fmt.Sprintf(` AND (type = 'screen_view' OR analytics_name = 'screen.view')
  AND COALESCE(NULLIF(tags->>'screen', ''), NULLIF(analytics_properties->>'screen', '')) IS NOT NULL
GROUP BY screen
ORDER BY views DESC
LIMIT $%d`, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.ScreenStatsItem, error) {
		var item domain.ScreenStatsItem
		err := row.Scan(&item.Screen, &item.Views, &item.Users, &item.Sessions, &item.LastSeenAt)
		return item, err
	})
}

func (r *PostgresAnalyticsRepository) Distribution(ctx context.Context, query domain.AnalyticsDistributionQuery) ([]domain.AnalyticsDistributionItem, error) {
	column, ok := distributionColumn(query.Dimension)
	if !ok {
		return nil, fmt.Errorf("invalid analytics dimension")
	}
	where, args := analyticsWhere(query.AppID, query.From, query.To)
	limit := normalizeAnalyticsLimit(query.Limit, 20, 100)
	args = append(args, limit)
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
SELECT %s AS value, count(*) AS count
FROM app_health_events%s AND NULLIF(%s, '') IS NOT NULL
GROUP BY value
ORDER BY count DESC
LIMIT $%d`, column, where, column, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.AnalyticsDistributionItem, error) {
		var item domain.AnalyticsDistributionItem
		err := row.Scan(&item.Value, &item.Count)
		return item, err
	})
}

func (r *PostgresAnalyticsRepository) eventByID(ctx context.Context, eventID string) (domain.HealthEvent, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, app_id, app_version, build_number, environment, type, level, platform, os_version, device_model, device_brand,
  user_id, session_id, error_name, error_message, error_stack, component_stack, fingerprint,
  breadcrumbs, tags, extra, issue_id, event_timestamp, created_at, analytics_name, analytics_properties,
  geo_country, geo_province, geo_city
FROM app_health_events WHERE id = $1`, eventID)
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

func analyticsTimelineSelect() string {
	return `
SELECT id, app_id, app_version, build_number, environment, type, level, platform, os_version, device_model, device_brand,
  user_id, session_id, error_name, error_message, error_stack, component_stack, fingerprint,
  tags, created_at, analytics_name, analytics_properties
FROM app_health_events`
}

func scanTimelineItem(row pgx.CollectableRow) (domain.AnalyticsTimelineItem, error) {
	var item domain.AnalyticsTimelineItem
	var level string
	var appVersion, buildNumber, environment, platform, osVersion, model, brand, userID, errorName, errorMessage, errorStack, componentStack, fingerprint, analyticsName sql.NullString
	var tagsBytes, analyticsPropertiesBytes []byte
	err := row.Scan(
		&item.ID, &item.App.ID, &appVersion, &buildNumber, &environment, &item.Type, &level, &platform, &osVersion, &model, &brand,
		&userID, &item.Session.ID, &errorName, &errorMessage, &errorStack, &componentStack, &fingerprint,
		&tagsBytes, &item.CreatedAt, &analyticsName, &analyticsPropertiesBytes,
	)
	if err != nil {
		return domain.AnalyticsTimelineItem{}, err
	}
	item.Level = domain.EventLevel(level)
	item.App.Version = appVersion.String
	item.App.BuildNumber = buildNumber.String
	item.App.Environment = environment.String
	item.Device = domain.DeviceInfo{Platform: platform.String, OSVersion: osVersion.String, Model: model.String, Brand: brand.String}
	item.User = nullableUser(userID.String)
	item.Tags = decodeJSON(tagsBytes, map[string]string{})
	if analyticsName.String != "" {
		item.Analytics = &domain.AnalyticsInfo{Name: analyticsName.String, Properties: decodeJSON(analyticsPropertiesBytes, map[string]any{})}
	}
	if errorName.String != "" || errorMessage.String != "" || errorStack.String != "" || fingerprint.String != "" {
		item.Error = &domain.ErrorInfo{Name: errorName.String, Message: errorMessage.String, Stack: errorStack.String, ComponentStack: componentStack.String, Fingerprint: fingerprint.String}
	}
	return item, nil
}

func analyticsWhere(appID string, from time.Time, to time.Time) (string, []any) {
	clauses := []string{"1 = 1"}
	args := []any{}
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if appID != "" {
		add("app_id = $%d", appID)
	}
	if !from.IsZero() {
		add("created_at >= $%d", from)
	}
	if !to.IsZero() {
		add("created_at <= $%d", to)
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func distributionColumn(dimension string) (string, bool) {
	switch dimension {
	case "platform":
		return "platform", true
	case "osVersion":
		return "os_version", true
	case "deviceModel":
		return "device_model", true
	case "deviceBrand":
		return "device_brand", true
	case "appVersion":
		return "app_version", true
	case "buildNumber":
		return "build_number", true
	case "country":
		return "geo_country", true
	case "province":
		return "geo_province", true
	case "city":
		return "geo_city", true
	default:
		return "", false
	}
}
