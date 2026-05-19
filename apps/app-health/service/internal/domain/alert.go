package domain

import "time"

type AlertRule struct {
	ID                 string     `json:"id"`
	Name               string     `json:"name"`
	AppID              string     `json:"appId"`
	Environment        string     `json:"environment"`
	MinLevel           EventLevel `json:"minLevel"`
	WebhookURL         string     `json:"webhookUrl,omitempty"`
	WebhookURLMasked   string     `json:"webhookUrlMasked"`
	CooldownSeconds    int        `json:"cooldownSeconds"`
	Enabled            bool       `json:"enabled"`
	CreatedAt          time.Time  `json:"createdAt,omitempty"`
	UpdatedAt          time.Time  `json:"updatedAt,omitempty"`
	LastDeliveryAt     *time.Time `json:"lastDeliveryAt,omitempty"`
	LastDeliveryStatus string     `json:"lastDeliveryStatus,omitempty"`
}

type AlertDeliveryStatus string

const (
	AlertDeliverySuccess AlertDeliveryStatus = "success"
	AlertDeliveryFailed  AlertDeliveryStatus = "failed"
)

type AlertDelivery struct {
	ID           string              `json:"id"`
	RuleID       string              `json:"ruleId"`
	RuleName     string              `json:"ruleName,omitempty"`
	AppID        string              `json:"appId"`
	Environment  string              `json:"environment"`
	Level        EventLevel          `json:"level"`
	Fingerprint  string              `json:"fingerprint"`
	EventID      string              `json:"eventId"`
	IssueID      string              `json:"issueId"`
	Status       AlertDeliveryStatus `json:"status"`
	HTTPStatus   int                 `json:"httpStatus,omitempty"`
	ErrorMessage string              `json:"errorMessage,omitempty"`
	DurationMs   int                 `json:"durationMs"`
	Test         bool                `json:"test"`
	CreatedAt    time.Time           `json:"createdAt,omitempty"`
}

type AlertRuleQuery struct {
	AppID    string
	Enabled  *bool
	Page     int
	PageSize int
}

type AlertDeliveryQuery struct {
	RuleID   string
	AppID    string
	Status   string
	Page     int
	PageSize int
}

type CreateAlertRuleRequest struct {
	Name            string     `json:"name"`
	AppID           string     `json:"appId"`
	Environment     string     `json:"environment"`
	MinLevel        EventLevel `json:"minLevel"`
	WebhookURL      string     `json:"webhookUrl"`
	CooldownSeconds int        `json:"cooldownSeconds"`
	Enabled         *bool      `json:"enabled,omitempty"`
}

type UpdateAlertRuleRequest struct {
	Name            string     `json:"name"`
	AppID           string     `json:"appId"`
	Environment     string     `json:"environment"`
	MinLevel        EventLevel `json:"minLevel"`
	WebhookURL      string     `json:"webhookUrl"`
	CooldownSeconds int        `json:"cooldownSeconds"`
	Enabled         *bool      `json:"enabled,omitempty"`
}

type TestAlertRuleRequest struct {
	Message string `json:"message"`
}

type AlertRuleListResponse struct {
	Items    []AlertRule `json:"items"`
	Total    int         `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"pageSize"`
}

type AlertDeliveryListResponse struct {
	Items    []AlertDelivery `json:"items"`
	Total    int             `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"pageSize"`
}
