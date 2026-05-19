package domain

import "time"

type RetentionRunMode string

const (
	RetentionRunModeDryRun RetentionRunMode = "dry-run"
	RetentionRunModeRun    RetentionRunMode = "run"
)

type RetentionRunStatus string

const (
	RetentionRunStatusSuccess RetentionRunStatus = "success"
	RetentionRunStatusFailed  RetentionRunStatus = "failed"
)

type RetentionRun struct {
	ID                 string             `json:"id"`
	Mode               RetentionRunMode   `json:"mode"`
	EventRetentionDays int                `json:"eventRetentionDays"`
	Cutoff             *time.Time         `json:"cutoff,omitempty"`
	ProtectedEventIDs  int                `json:"protectedEventIds"`
	DeletedEvents      int                `json:"deletedEvents"`
	DryRun             bool               `json:"dryRun"`
	Status             RetentionRunStatus `json:"status"`
	ErrorMessage       string             `json:"errorMessage,omitempty"`
	RequestedBy        string             `json:"requestedBy,omitempty"`
	Source             string             `json:"source"`
	CreatedAt          time.Time          `json:"createdAt"`
}

type RetentionDryRunRequest struct {
	EventRetentionDays int `json:"eventRetentionDays"`
}

type RetentionRunRequest struct {
	EventRetentionDays int    `json:"eventRetentionDays"`
	DryRunID           string `json:"dryRunId"`
	ConfirmText        string `json:"confirmText"`
	AcknowledgedBackup bool   `json:"acknowledgedBackup"`
	AcknowledgedDryRun bool   `json:"acknowledgedDryRun"`
}

type RetentionRunResponse struct {
	Run RetentionRun `json:"run"`
}

type RetentionRunListResponse struct {
	Items []RetentionRun `json:"items"`
	Total int            `json:"total"`
	Limit int            `json:"limit"`
}

type SettingsSummaryResponse struct {
	Service   RuntimeConfigSummary   `json:"service"`
	Retention RetentionConfigSummary `json:"retention"`
	Alerts    AlertConfigSummary     `json:"alerts"`
	Admin     AdminConfigSummary     `json:"admin"`
	Warnings  []string               `json:"warnings"`
}

type RuntimeConfigSummary struct {
	Env                  string   `json:"env"`
	DatabaseConfigured   bool     `json:"databaseConfigured"`
	DatabaseReady        bool     `json:"databaseReady"`
	CORSOrigins          []string `json:"corsOrigins"`
	MaxBodyBytes         int64    `json:"maxBodyBytes"`
	IngestRateLimitRPS   int      `json:"ingestRateLimitRps"`
	IngestRateLimitBurst int      `json:"ingestRateLimitBurst"`
}

type RetentionConfigSummary struct {
	EventRetentionDays int  `json:"eventRetentionDays"`
	RetentionDryRun    bool `json:"retentionDryRun"`
}

type AlertConfigSummary struct {
	EnvFallbackEnabled bool   `json:"envFallbackEnabled"`
	MinLevel           string `json:"minLevel"`
	CooldownSeconds    int    `json:"cooldownSeconds"`
	TimeoutSeconds     int    `json:"timeoutSeconds"`
}

type AdminConfigSummary struct {
	Email                   string `json:"email"`
	AdminTokenConfigured    bool   `json:"adminTokenConfigured"`
	AdminPasswordConfigured bool   `json:"adminPasswordConfigured"`
	SessionSecretConfigured bool   `json:"sessionSecretConfigured"`
	CookieSecure            bool   `json:"cookieSecure"`
	SessionTTLHours         int    `json:"sessionTtlHours"`
}
