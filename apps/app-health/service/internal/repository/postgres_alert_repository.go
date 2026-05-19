package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresAlertRuleRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresAlertRuleRepository(pool *pgxpool.Pool) *PostgresAlertRuleRepository {
	return &PostgresAlertRuleRepository{pool: pool}
}

func (r *PostgresAlertRuleRepository) Create(ctx context.Context, rule domain.AlertRule) (domain.AlertRule, error) {
	rows, err := r.pool.Query(ctx, `
INSERT INTO app_health_alert_rules (
  id, name, app_id, environment, min_level, webhook_url, cooldown_seconds, enabled
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
RETURNING id, name, app_id, environment, min_level, webhook_url, cooldown_seconds, enabled, created_at, updated_at`,
		rule.ID, rule.Name, rule.AppID, rule.Environment, string(rule.MinLevel),
		rule.WebhookURL, rule.CooldownSeconds, rule.Enabled,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.AlertRule{}, ErrDuplicate
		}
		return domain.AlertRule{}, err
	}
	defer rows.Close()
	created, err := pgx.CollectOneRow(rows, scanAlertRule)
	if isUniqueViolation(err) {
		return domain.AlertRule{}, ErrDuplicate
	}
	return maskAlertRule(created), err
}

func (r *PostgresAlertRuleRepository) List(ctx context.Context, query domain.AlertRuleQuery) ([]domain.AlertRule, int, error) {
	where, args := alertRuleWhere(query)
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM app_health_alert_rules`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	page, pageSize := normalizeAlertPage(query.Page, query.PageSize)
	args = append(args, pageSize, (page-1)*pageSize)
	rows, err := r.pool.Query(ctx, `
SELECT id, name, app_id, environment, min_level, webhook_url, cooldown_seconds, enabled, created_at, updated_at
FROM app_health_alert_rules`+where+`
ORDER BY created_at DESC
LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items, err := pgx.CollectRows(rows, scanAlertRule)
	for i := range items {
		items[i] = maskAlertRule(items[i])
	}
	return items, total, err
}

func (r *PostgresAlertRuleRepository) ListEnabled(ctx context.Context) ([]domain.AlertRule, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, name, app_id, environment, min_level, webhook_url, cooldown_seconds, enabled, created_at, updated_at
FROM app_health_alert_rules
WHERE enabled = true
ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, scanAlertRule)
}

func (r *PostgresAlertRuleRepository) Get(ctx context.Context, id string) (domain.AlertRule, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, name, app_id, environment, min_level, webhook_url, cooldown_seconds, enabled, created_at, updated_at
FROM app_health_alert_rules
WHERE id = $1`, id)
	if err != nil {
		return domain.AlertRule{}, err
	}
	defer rows.Close()
	rule, err := pgx.CollectOneRow(rows, scanAlertRule)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.AlertRule{}, ErrNotFound
	}
	return rule, err
}

func (r *PostgresAlertRuleRepository) Update(ctx context.Context, rule domain.AlertRule) (domain.AlertRule, error) {
	rows, err := r.pool.Query(ctx, `
UPDATE app_health_alert_rules SET
  name = $2,
  app_id = $3,
  environment = $4,
  min_level = $5,
  webhook_url = $6,
  cooldown_seconds = $7,
  enabled = $8,
  updated_at = now()
WHERE id = $1
RETURNING id, name, app_id, environment, min_level, webhook_url, cooldown_seconds, enabled, created_at, updated_at`,
		rule.ID, rule.Name, rule.AppID, rule.Environment, string(rule.MinLevel),
		rule.WebhookURL, rule.CooldownSeconds, rule.Enabled,
	)
	if err != nil {
		return domain.AlertRule{}, err
	}
	defer rows.Close()
	updated, err := pgx.CollectOneRow(rows, scanAlertRule)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.AlertRule{}, ErrNotFound
	}
	return maskAlertRule(updated), err
}

func (r *PostgresAlertRuleRepository) Delete(ctx context.Context, id string) error {
	commandTag, err := r.pool.Exec(ctx, `DELETE FROM app_health_alert_rules WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type PostgresAlertDeliveryRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresAlertDeliveryRepository(pool *pgxpool.Pool) *PostgresAlertDeliveryRepository {
	return &PostgresAlertDeliveryRepository{pool: pool}
}

func (r *PostgresAlertDeliveryRepository) Create(ctx context.Context, delivery domain.AlertDelivery) (domain.AlertDelivery, error) {
	rows, err := r.pool.Query(ctx, `
INSERT INTO app_health_alert_deliveries (
  id, rule_id, app_id, environment, level, fingerprint, event_id, issue_id,
  status, http_status, error_message, duration_ms, test
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
RETURNING id, rule_id, app_id, environment, level, fingerprint, event_id, issue_id,
  status, http_status, error_message, duration_ms, test, created_at`,
		delivery.ID, delivery.RuleID, delivery.AppID, delivery.Environment, string(delivery.Level),
		delivery.Fingerprint, delivery.EventID, delivery.IssueID, string(delivery.Status),
		nullInt(delivery.HTTPStatus), delivery.ErrorMessage, delivery.DurationMs, delivery.Test,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.AlertDelivery{}, ErrDuplicate
		}
		return domain.AlertDelivery{}, err
	}
	defer rows.Close()
	created, err := pgx.CollectOneRow(rows, scanAlertDelivery)
	if isUniqueViolation(err) {
		return domain.AlertDelivery{}, ErrDuplicate
	}
	return created, err
}

func (r *PostgresAlertDeliveryRepository) List(ctx context.Context, query domain.AlertDeliveryQuery) ([]domain.AlertDelivery, int, error) {
	where, args := alertDeliveryWhere(query)
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM app_health_alert_deliveries d`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	page, pageSize := normalizeAlertPage(query.Page, query.PageSize)
	args = append(args, pageSize, (page-1)*pageSize)
	rows, err := r.pool.Query(ctx, `
SELECT d.id, d.rule_id, COALESCE(r.name, ''), d.app_id, d.environment, d.level, d.fingerprint,
  d.event_id, d.issue_id, d.status, d.http_status, d.error_message, d.duration_ms, d.test, d.created_at
FROM app_health_alert_deliveries d
LEFT JOIN app_health_alert_rules r ON r.id = d.rule_id`+where+`
ORDER BY d.created_at DESC
LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items, err := pgx.CollectRows(rows, scanAlertDeliveryWithRuleName)
	return items, total, err
}

func alertRuleWhere(query domain.AlertRuleQuery) (string, []any) {
	clauses := []string{}
	args := []any{}
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if query.AppID != "" {
		add("(app_id = '' OR app_id = $%d)", query.AppID)
	}
	if query.Enabled != nil {
		add("enabled = $%d", *query.Enabled)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func alertDeliveryWhere(query domain.AlertDeliveryQuery) (string, []any) {
	clauses := []string{}
	args := []any{}
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if query.RuleID != "" {
		add("d.rule_id = $%d", query.RuleID)
	}
	if query.AppID != "" {
		add("d.app_id = $%d", query.AppID)
	}
	if query.Status != "" {
		add("d.status = $%d", query.Status)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func scanAlertRule(row pgx.CollectableRow) (domain.AlertRule, error) {
	var rule domain.AlertRule
	var minLevel string
	err := row.Scan(
		&rule.ID, &rule.Name, &rule.AppID, &rule.Environment, &minLevel, &rule.WebhookURL,
		&rule.CooldownSeconds, &rule.Enabled, &rule.CreatedAt, &rule.UpdatedAt,
	)
	rule.MinLevel = domain.EventLevel(minLevel)
	rule.WebhookURLMasked = MaskWebhookURL(rule.WebhookURL)
	return rule, err
}

func scanAlertDelivery(row pgx.CollectableRow) (domain.AlertDelivery, error) {
	var delivery domain.AlertDelivery
	var level, status string
	var httpStatus sql.NullInt32
	err := row.Scan(
		&delivery.ID, &delivery.RuleID, &delivery.AppID, &delivery.Environment, &level,
		&delivery.Fingerprint, &delivery.EventID, &delivery.IssueID, &status, &httpStatus,
		&delivery.ErrorMessage, &delivery.DurationMs, &delivery.Test, &delivery.CreatedAt,
	)
	delivery.Level = domain.EventLevel(level)
	delivery.Status = domain.AlertDeliveryStatus(status)
	if httpStatus.Valid {
		delivery.HTTPStatus = int(httpStatus.Int32)
	}
	return delivery, err
}

func scanAlertDeliveryWithRuleName(row pgx.CollectableRow) (domain.AlertDelivery, error) {
	var delivery domain.AlertDelivery
	var level, status string
	var httpStatus sql.NullInt32
	err := row.Scan(
		&delivery.ID, &delivery.RuleID, &delivery.RuleName, &delivery.AppID, &delivery.Environment, &level,
		&delivery.Fingerprint, &delivery.EventID, &delivery.IssueID, &status, &httpStatus,
		&delivery.ErrorMessage, &delivery.DurationMs, &delivery.Test, &delivery.CreatedAt,
	)
	delivery.Level = domain.EventLevel(level)
	delivery.Status = domain.AlertDeliveryStatus(status)
	if httpStatus.Valid {
		delivery.HTTPStatus = int(httpStatus.Int32)
	}
	return delivery, err
}

func maskAlertRule(rule domain.AlertRule) domain.AlertRule {
	rule.WebhookURLMasked = MaskWebhookURL(rule.WebhookURL)
	rule.WebhookURL = ""
	return rule
}

func nullInt(value int) any {
	if value == 0 {
		return nil
	}
	return value
}

func normalizeAlertPage(page int, pageSize int) (int, int) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize
}
