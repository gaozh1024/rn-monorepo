package domain

import "time"

type IssueStatus string

const (
	IssueStatusOpen     IssueStatus = "open"
	IssueStatusResolved IssueStatus = "resolved"
	IssueStatusIgnored  IssueStatus = "ignored"
)

type HealthIssue struct {
	ID                string      `json:"id"`
	AppID             string      `json:"appId"`
	Fingerprint       string      `json:"fingerprint"`
	Title             string      `json:"title"`
	Level             EventLevel  `json:"level"`
	Status            IssueStatus `json:"status"`
	EventCount        int         `json:"eventCount"`
	AffectedUserCount int         `json:"affectedUserCount"`
	FirstSeenAt       time.Time   `json:"firstSeenAt"`
	LastSeenAt        time.Time   `json:"lastSeenAt"`
	LastEventID       string      `json:"lastEventId,omitempty"`
	SampleEventID     string      `json:"sampleEventId,omitempty"`
	LastAppVersion    string      `json:"lastAppVersion,omitempty"`
	LastBuildNumber   string      `json:"lastBuildNumber,omitempty"`
	LastPlatform      string      `json:"lastPlatform,omitempty"`
	CreatedAt         time.Time   `json:"createdAt,omitempty"`
	UpdatedAt         time.Time   `json:"updatedAt,omitempty"`
}

type IssueQuery struct {
	AppID       string
	Status      string
	Level       string
	Platform    string
	From        time.Time
	To          time.Time
	AppVersion  string
	BuildNumber string
	Fingerprint string
	Message     string
	Page        int
	PageSize    int
}

type IssueListResponse struct {
	Items    []HealthIssue `json:"items"`
	Total    int           `json:"total"`
	Page     int           `json:"page"`
	PageSize int           `json:"pageSize"`
}

type IssueDetailResponse struct {
	Issue                HealthIssue          `json:"issue"`
	SampleEvent          *HealthEvent         `json:"sampleEvent,omitempty"`
	RecentEvents         []HealthEvent        `json:"recentEvents"`
	VersionDistribution  []DistributionBucket `json:"versionDistribution"`
	PlatformDistribution []DistributionBucket `json:"platformDistribution"`
}

type DistributionBucket struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type IssueStatusUpdateRequest struct {
	Status IssueStatus `json:"status"`
}

type StatsOverviewResponse struct {
	OpenIssues         int `json:"openIssues"`
	EventsToday        int `json:"eventsToday"`
	AffectedUsersToday int `json:"affectedUsersToday"`
	FatalEventsToday   int `json:"fatalEventsToday"`
}
