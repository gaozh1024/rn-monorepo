package domain

import "time"

type ApplicationStatus string

const (
	ApplicationStatusActive   ApplicationStatus = "active"
	ApplicationStatusDisabled ApplicationStatus = "disabled"
)

type Application struct {
	ID                 string            `json:"id"`
	Name               string            `json:"name"`
	Slug               string            `json:"slug"`
	Description        string            `json:"description"`
	DefaultEnvironment string            `json:"defaultEnvironment"`
	Platforms          []string          `json:"platforms"`
	Status             ApplicationStatus `json:"status"`
	CreatedAt          time.Time         `json:"createdAt,omitempty"`
	UpdatedAt          time.Time         `json:"updatedAt,omitempty"`
}

type ApplicationSummary struct {
	Application
	EffectiveTokenCount int        `json:"effectiveTokenCount"`
	EventCount          int        `json:"eventCount"`
	IssueCount          int        `json:"issueCount"`
	LastEventAt         *time.Time `json:"lastEventAt,omitempty"`
}

type ApplicationListResponse struct {
	Items []ApplicationSummary `json:"items"`
	Total int                  `json:"total"`
}

type IngestToken struct {
	ID            string     `json:"id"`
	ApplicationID string     `json:"applicationId"`
	Name          string     `json:"name"`
	TokenHash     string     `json:"-"`
	TokenPrefix   string     `json:"prefix"`
	PlainText     string     `json:"plainText,omitempty"`
	LastUsedAt    *time.Time `json:"lastUsedAt,omitempty"`
	RevokedAt     *time.Time `json:"revokedAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt,omitempty"`
}

type CreateApplicationRequest struct {
	Name               string   `json:"name"`
	Slug               string   `json:"slug"`
	Description        string   `json:"description"`
	DefaultEnvironment string   `json:"defaultEnvironment"`
	Platforms          []string `json:"platforms"`
}

type UpdateApplicationRequest struct {
	Name               string            `json:"name"`
	Description        string            `json:"description"`
	DefaultEnvironment string            `json:"defaultEnvironment"`
	Platforms          []string          `json:"platforms"`
	Status             ApplicationStatus `json:"status"`
}

type CreateTokenRequest struct {
	Name string `json:"name"`
}

type DeleteApplicationDataRequest struct {
	ConfirmAppID string `json:"confirmAppId"`
}

type CreateApplicationResponse struct {
	Application Application `json:"application"`
	Token       IngestToken `json:"token"`
}
