package domain

import "time"

type AnalyticsTimelineQuery struct {
	AppID  string
	UserID string
	From   time.Time
	To     time.Time
	Limit  int
}

type AnalyticsStatsQuery struct {
	AppID string
	From  time.Time
	To    time.Time
	Limit int
}

type AnalyticsDistributionQuery struct {
	AppID     string
	Dimension string
	From      time.Time
	To        time.Time
	Limit     int
}

type AnalyticsTimelineItem struct {
	ID        string            `json:"id"`
	Type      string            `json:"type"`
	Level     EventLevel        `json:"level"`
	CreatedAt time.Time         `json:"createdAt"`
	App       AppInfo           `json:"app"`
	Device    DeviceInfo        `json:"device"`
	Session   SessionInfo       `json:"session"`
	User      *UserInfo         `json:"user,omitempty"`
	Analytics *AnalyticsInfo    `json:"analytics,omitempty"`
	Error     *ErrorInfo        `json:"error,omitempty"`
	Tags      map[string]string `json:"tags,omitempty"`
}

type AnalyticsTimelineResponse struct {
	Items []AnalyticsTimelineItem `json:"items"`
}

type ScreenStatsItem struct {
	Screen     string    `json:"screen"`
	Views      int       `json:"views"`
	Users      int       `json:"users"`
	Sessions   int       `json:"sessions"`
	LastSeenAt time.Time `json:"lastSeenAt"`
}

type ScreenStatsResponse struct {
	Items []ScreenStatsItem `json:"items"`
}

type AnalyticsDistributionItem struct {
	Value string `json:"value"`
	Count int    `json:"count"`
}

type AnalyticsDistributionResponse struct {
	Dimension string                      `json:"dimension"`
	Items     []AnalyticsDistributionItem `json:"items"`
}
