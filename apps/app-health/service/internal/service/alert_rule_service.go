package service

import (
	"context"
	"errors"
	"strings"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/alert"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
	"github.com/google/uuid"
)

var ErrInvalidAlertRule = errors.New("invalid alert rule")

type AlertRuleService struct {
	rules      repository.AlertRuleRepository
	deliveries repository.AlertDeliveryRepository
	dispatcher *alert.RuleDispatcher
}

func NewAlertRuleService(rules repository.AlertRuleRepository, deliveries repository.AlertDeliveryRepository, dispatcher *alert.RuleDispatcher) *AlertRuleService {
	return &AlertRuleService{rules: rules, deliveries: deliveries, dispatcher: dispatcher}
}

func (s *AlertRuleService) ListRules(ctx context.Context, query domain.AlertRuleQuery) (domain.AlertRuleListResponse, error) {
	items, total, err := s.rules.List(ctx, query)
	if err != nil {
		return domain.AlertRuleListResponse{}, err
	}
	page, pageSize := normalizeAlertQuery(query.Page, query.PageSize)
	return domain.AlertRuleListResponse{Items: items, Total: total, Page: page, PageSize: pageSize}, nil
}

func (s *AlertRuleService) CreateRule(ctx context.Context, request domain.CreateAlertRuleRequest) (domain.AlertRule, error) {
	rule, err := normalizeNewAlertRule(request)
	if err != nil {
		return domain.AlertRule{}, err
	}
	return s.rules.Create(ctx, rule)
}

func (s *AlertRuleService) GetRule(ctx context.Context, id string) (domain.AlertRule, error) {
	rule, err := s.rules.Get(ctx, id)
	if err != nil {
		return domain.AlertRule{}, err
	}
	rule.WebhookURL = ""
	return rule, nil
}

func (s *AlertRuleService) UpdateRule(ctx context.Context, id string, request domain.UpdateAlertRuleRequest) (domain.AlertRule, error) {
	current, err := s.rules.Get(ctx, id)
	if err != nil {
		return domain.AlertRule{}, err
	}
	updated, err := normalizeAlertRuleUpdate(current, request)
	if err != nil {
		return domain.AlertRule{}, err
	}
	return s.rules.Update(ctx, updated)
}

func (s *AlertRuleService) EnableRule(ctx context.Context, id string) (domain.AlertRule, error) {
	current, err := s.rules.Get(ctx, id)
	if err != nil {
		return domain.AlertRule{}, err
	}
	current.Enabled = true
	return s.rules.Update(ctx, current)
}

func (s *AlertRuleService) DisableRule(ctx context.Context, id string) (domain.AlertRule, error) {
	current, err := s.rules.Get(ctx, id)
	if err != nil {
		return domain.AlertRule{}, err
	}
	current.Enabled = false
	return s.rules.Update(ctx, current)
}

func (s *AlertRuleService) DeleteRule(ctx context.Context, id string) (domain.AlertRule, error) {
	current, err := s.rules.Get(ctx, id)
	if err != nil {
		return domain.AlertRule{}, err
	}
	if err := s.rules.Delete(ctx, id); err != nil {
		return domain.AlertRule{}, err
	}
	current.WebhookURL = ""
	return current, nil
}

func (s *AlertRuleService) TestRule(ctx context.Context, id string, request domain.TestAlertRuleRequest) (domain.AlertDelivery, error) {
	rule, err := s.rules.Get(ctx, id)
	if err != nil {
		return domain.AlertDelivery{}, err
	}
	return s.dispatcher.Test(ctx, rule, strings.TrimSpace(request.Message))
}

func (s *AlertRuleService) ListDeliveries(ctx context.Context, query domain.AlertDeliveryQuery) (domain.AlertDeliveryListResponse, error) {
	items, total, err := s.deliveries.List(ctx, query)
	if err != nil {
		return domain.AlertDeliveryListResponse{}, err
	}
	page, pageSize := normalizeAlertQuery(query.Page, query.PageSize)
	return domain.AlertDeliveryListResponse{Items: items, Total: total, Page: page, PageSize: pageSize}, nil
}

func normalizeNewAlertRule(request domain.CreateAlertRuleRequest) (domain.AlertRule, error) {
	name := strings.TrimSpace(request.Name)
	webhookURL := strings.TrimSpace(request.WebhookURL)
	if name == "" || webhookURL == "" {
		return domain.AlertRule{}, ErrInvalidAlertRule
	}
	if err := alert.ValidateWebhookURL(webhookURL); err != nil {
		return domain.AlertRule{}, ErrInvalidAlertRule
	}
	minLevel, err := alert.ParseLevel(string(request.MinLevel))
	if err != nil {
		return domain.AlertRule{}, ErrInvalidAlertRule
	}
	enabled := true
	if request.Enabled != nil {
		enabled = *request.Enabled
	}
	return domain.AlertRule{
		ID:              "rule_" + uuid.NewString(),
		Name:            name,
		AppID:           strings.TrimSpace(request.AppID),
		Environment:     normalizeAlertEnvironment(request.Environment),
		MinLevel:        minLevel,
		WebhookURL:      webhookURL,
		CooldownSeconds: normalizeCooldown(request.CooldownSeconds),
		Enabled:         enabled,
	}, nil
}

func normalizeAlertRuleUpdate(current domain.AlertRule, request domain.UpdateAlertRuleRequest) (domain.AlertRule, error) {
	name := strings.TrimSpace(request.Name)
	if name == "" {
		return domain.AlertRule{}, ErrInvalidAlertRule
	}
	webhookURL := strings.TrimSpace(request.WebhookURL)
	if webhookURL == "" {
		webhookURL = current.WebhookURL
	}
	if webhookURL == "" {
		return domain.AlertRule{}, ErrInvalidAlertRule
	}
	if err := alert.ValidateWebhookURL(webhookURL); err != nil {
		return domain.AlertRule{}, ErrInvalidAlertRule
	}
	minLevel, err := alert.ParseLevel(string(request.MinLevel))
	if err != nil {
		return domain.AlertRule{}, ErrInvalidAlertRule
	}
	current.Name = name
	current.AppID = strings.TrimSpace(request.AppID)
	current.Environment = normalizeAlertEnvironment(request.Environment)
	current.MinLevel = minLevel
	current.WebhookURL = webhookURL
	current.CooldownSeconds = normalizeCooldown(request.CooldownSeconds)
	if request.Enabled != nil {
		current.Enabled = *request.Enabled
	}
	return current, nil
}

func normalizeAlertEnvironment(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func normalizeCooldown(value int) int {
	if value < 0 {
		return 300
	}
	if value > 86400 {
		return 86400
	}
	if value == 0 {
		return 300
	}
	return value
}

func normalizeAlertQuery(page int, pageSize int) (int, int) {
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
