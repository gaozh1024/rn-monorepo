package domain

import "time"

type EventLevel string

const (
	LevelInfo    EventLevel = "info"
	LevelWarning EventLevel = "warning"
	LevelError   EventLevel = "error"
	LevelFatal   EventLevel = "fatal"
)

type HealthEvent struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Level       EventLevel             `json:"level"`
	Timestamp   int64                  `json:"timestamp"`
	App         AppInfo                `json:"app"`
	Device      DeviceInfo             `json:"device"`
	Session     SessionInfo            `json:"session"`
	User        *UserInfo              `json:"user,omitempty"`
	Error       *ErrorInfo             `json:"error,omitempty"`
	Breadcrumbs []Breadcrumb           `json:"breadcrumbs,omitempty"`
	Tags        map[string]string      `json:"tags,omitempty"`
	Extra       map[string]any         `json:"extra,omitempty"`
	IssueID     string                 `json:"issueId,omitempty"`
	RawEvent    map[string]any         `json:"-"`
	CreatedAt   time.Time              `json:"createdAt,omitempty"`
	RawJSON     map[string]interface{} `json:"rawEvent,omitempty"`
}

type AppInfo struct {
	ID          string `json:"id"`
	Version     string `json:"version,omitempty"`
	BuildNumber string `json:"buildNumber,omitempty"`
	Environment string `json:"environment,omitempty"`
}

type DeviceInfo struct {
	Platform  string `json:"platform,omitempty"`
	OSVersion string `json:"osVersion,omitempty"`
	Model     string `json:"model,omitempty"`
}

type SessionInfo struct {
	ID        string `json:"id"`
	StartedAt int64  `json:"startedAt"`
}

type UserInfo struct {
	ID string `json:"id,omitempty"`
}

type ErrorInfo struct {
	Name           string `json:"name,omitempty"`
	Message        string `json:"message,omitempty"`
	Stack          string `json:"stack,omitempty"`
	ComponentStack string `json:"componentStack,omitempty"`
	Fingerprint    string `json:"fingerprint,omitempty"`
}

type Breadcrumb struct {
	Timestamp int64  `json:"timestamp,omitempty"`
	Category  string `json:"category,omitempty"`
	Level     string `json:"level,omitempty"`
	Message   string `json:"message"`
	Data      any    `json:"data,omitempty"`
}

type IngestEventsRequest struct {
	Events []HealthEvent `json:"events"`
}

type IngestEventsResponse struct {
	Accepted int `json:"accepted"`
	Rejected int `json:"rejected"`
}

type EventQuery struct {
	AppID    string
	IssueID  string
	UserID   string
	Level    string
	Type     string
	Page     int
	PageSize int
}

type EventListResponse struct {
	Items    []HealthEvent `json:"items"`
	Total    int           `json:"total"`
	Page     int           `json:"page"`
	PageSize int           `json:"pageSize"`
}
