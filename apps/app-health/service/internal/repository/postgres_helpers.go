package repository

import (
	"encoding/json"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

func jsonBytes(value any) []byte {
	if value == nil {
		return nil
	}
	bytes, err := json.Marshal(value)
	if err != nil {
		return nil
	}
	return bytes
}

func decodeJSON[T any](bytes []byte, fallback T) T {
	if len(bytes) == 0 {
		return fallback
	}
	var value T
	if err := json.Unmarshal(bytes, &value); err != nil {
		return fallback
	}
	return value
}

func eventTimestamp(ms int64) *time.Time {
	if ms <= 0 {
		return nil
	}
	t := time.UnixMilli(ms).UTC()
	return &t
}

func eventTimestampMillis(t *time.Time) int64 {
	if t == nil {
		return 0
	}
	return t.UnixMilli()
}

func userID(event domain.HealthEvent) string {
	if event.User == nil {
		return ""
	}
	return event.User.ID
}

func nullableUser(id string) *domain.UserInfo {
	if id == "" {
		return nil
	}
	return &domain.UserInfo{ID: id}
}

func analyticsName(event domain.HealthEvent) string {
	if event.Analytics == nil {
		return ""
	}
	return event.Analytics.Name
}

func analyticsProperties(event domain.HealthEvent) map[string]any {
	if event.Analytics == nil {
		return nil
	}
	return event.Analytics.Properties
}

func geoCountry(event domain.HealthEvent) string {
	if event.Geo == nil {
		return ""
	}
	return event.Geo.Country
}

func geoProvince(event domain.HealthEvent) string {
	if event.Geo == nil {
		return ""
	}
	return event.Geo.Province
}

func geoCity(event domain.HealthEvent) string {
	if event.Geo == nil {
		return ""
	}
	return event.Geo.City
}
