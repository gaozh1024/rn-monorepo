package repository

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
)

type IssueRepository interface {
	FindByFingerprint(context.Context, string, string) (domain.HealthIssue, error)
	UpsertForEvent(context.Context, domain.HealthEvent, string, string) (domain.HealthIssue, error)
	List(context.Context, domain.IssueQuery) ([]domain.HealthIssue, int, error)
	Get(context.Context, string) (domain.HealthIssue, error)
	UpdateStatus(context.Context, string, domain.IssueStatus) (domain.HealthIssue, error)
	CountOpen(context.Context, string) (int, error)
	ProtectedEventIDs(context.Context) ([]string, error)
	DeleteByAppID(context.Context, string) (int, error)
}

type MemoryIssueRepository struct {
	mu             sync.RWMutex
	issues         map[string]domain.HealthIssue
	byFingerprint  map[string]string
	affectedUsers  map[string]map[string]struct{}
	sequenceNumber int
}

func NewMemoryIssueRepository() *MemoryIssueRepository {
	return &MemoryIssueRepository{
		issues:        map[string]domain.HealthIssue{},
		byFingerprint: map[string]string{},
		affectedUsers: map[string]map[string]struct{}{},
	}
}

func (r *MemoryIssueRepository) FindByFingerprint(_ context.Context, appID string, fingerprint string) (domain.HealthIssue, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	id, ok := r.byFingerprint[fingerprintKey(appID, fingerprint)]
	if !ok {
		return domain.HealthIssue{}, ErrNotFound
	}
	return r.issues[id], nil
}

func (r *MemoryIssueRepository) UpsertForEvent(_ context.Context, event domain.HealthEvent, title string, fingerprint string) (domain.HealthIssue, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := time.Now().UTC()
	key := fingerprintKey(event.App.ID, fingerprint)
	if id, ok := r.byFingerprint[key]; ok {
		issue := r.issues[id]
		issue.EventCount++
		issue.LastSeenAt = now
		issue.LastEventID = event.ID
		issue.LastAppVersion = event.App.Version
		issue.LastBuildNumber = event.App.BuildNumber
		issue.LastPlatform = event.Device.Platform
		issue.UpdatedAt = now
		if severityWeight(event.Level) > severityWeight(issue.Level) {
			issue.Level = event.Level
		}
		r.trackUser(issue.ID, event)
		issue.AffectedUserCount = len(r.affectedUsers[issue.ID])
		r.issues[id] = issue
		return issue, nil
	}

	r.sequenceNumber++
	id := makeIssueID(r.sequenceNumber)
	issue := domain.HealthIssue{
		ID:              id,
		AppID:           event.App.ID,
		Fingerprint:     fingerprint,
		Title:           title,
		Level:           event.Level,
		Status:          domain.IssueStatusOpen,
		EventCount:      1,
		FirstSeenAt:     now,
		LastSeenAt:      now,
		LastEventID:     event.ID,
		SampleEventID:   event.ID,
		LastAppVersion:  event.App.Version,
		LastBuildNumber: event.App.BuildNumber,
		LastPlatform:    event.Device.Platform,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	r.issues[id] = issue
	r.byFingerprint[key] = id
	r.affectedUsers[id] = map[string]struct{}{}
	r.trackUser(id, event)
	issue.AffectedUserCount = len(r.affectedUsers[id])
	r.issues[id] = issue
	return issue, nil
}

func (r *MemoryIssueRepository) List(_ context.Context, query domain.IssueQuery) ([]domain.HealthIssue, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	items := make([]domain.HealthIssue, 0, len(r.issues))
	for _, issue := range r.issues {
		if !matchIssue(issue, query) {
			continue
		}
		items = append(items, issue)
	}
	// Small MVP repository: stable ordering by last seen descending with insertion-order agnostic scan.
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if items[j].LastSeenAt.After(items[i].LastSeenAt) {
				items[i], items[j] = items[j], items[i]
			}
		}
	}
	return paginate(items, query.Page, query.PageSize)
}

func (r *MemoryIssueRepository) Get(_ context.Context, id string) (domain.HealthIssue, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	issue, ok := r.issues[id]
	if !ok {
		return domain.HealthIssue{}, ErrNotFound
	}
	return issue, nil
}

func (r *MemoryIssueRepository) UpdateStatus(_ context.Context, id string, status domain.IssueStatus) (domain.HealthIssue, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	issue, ok := r.issues[id]
	if !ok {
		return domain.HealthIssue{}, ErrNotFound
	}
	issue.Status = status
	issue.UpdatedAt = time.Now().UTC()
	r.issues[id] = issue
	return issue, nil
}

func (r *MemoryIssueRepository) CountOpen(_ context.Context, appID string) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	count := 0
	for _, issue := range r.issues {
		if appID != "" && issue.AppID != appID {
			continue
		}
		if issue.Status == domain.IssueStatusOpen {
			count++
		}
	}
	return count, nil
}

func (r *MemoryIssueRepository) ProtectedEventIDs(_ context.Context) ([]string, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	seen := map[string]struct{}{}
	ids := []string{}
	add := func(id string) {
		if id == "" {
			return
		}
		if _, ok := seen[id]; ok {
			return
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	for _, issue := range r.issues {
		add(issue.SampleEventID)
		add(issue.LastEventID)
	}
	return ids, nil
}

func (r *MemoryIssueRepository) DeleteByAppID(_ context.Context, appID string) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	deleted := 0
	for id, issue := range r.issues {
		if issue.AppID != appID {
			continue
		}
		delete(r.issues, id)
		delete(r.byFingerprint, fingerprintKey(issue.AppID, issue.Fingerprint))
		delete(r.affectedUsers, id)
		deleted++
	}
	return deleted, nil
}

func (r *MemoryIssueRepository) trackUser(issueID string, event domain.HealthEvent) {
	if event.User == nil || event.User.ID == "" {
		return
	}
	if _, ok := r.affectedUsers[issueID]; !ok {
		r.affectedUsers[issueID] = map[string]struct{}{}
	}
	r.affectedUsers[issueID][event.User.ID] = struct{}{}
}

func matchIssue(issue domain.HealthIssue, query domain.IssueQuery) bool {
	if query.AppID != "" && issue.AppID != query.AppID {
		return false
	}
	if query.Status != "" && string(issue.Status) != query.Status {
		return false
	}
	if query.Level != "" && string(issue.Level) != query.Level {
		return false
	}
	if query.Platform != "" && issue.LastPlatform != query.Platform {
		return false
	}
	if !query.From.IsZero() && issue.LastSeenAt.Before(query.From) {
		return false
	}
	if !query.To.IsZero() && issue.LastSeenAt.After(query.To) {
		return false
	}
	if query.AppVersion != "" && issue.LastAppVersion != query.AppVersion {
		return false
	}
	if query.BuildNumber != "" && issue.LastBuildNumber != query.BuildNumber {
		return false
	}
	if query.Fingerprint != "" && issue.Fingerprint != query.Fingerprint {
		return false
	}
	if query.Message != "" && !strings.Contains(strings.ToLower(issue.Title), strings.ToLower(query.Message)) {
		return false
	}
	return true
}

func fingerprintKey(appID string, fingerprint string) string { return appID + "\x00" + fingerprint }

func makeIssueID(sequence int) string {
	return "issue_" + time.Now().UTC().Format("20060102150405") + "_" + itoa(sequence)
}

func itoa(value int) string {
	if value == 0 {
		return "0"
	}
	buf := make([]byte, 0, 10)
	for value > 0 {
		buf = append([]byte{byte('0' + value%10)}, buf...)
		value /= 10
	}
	return string(buf)
}

func severityWeight(level domain.EventLevel) int {
	switch level {
	case domain.LevelFatal:
		return 4
	case domain.LevelError:
		return 3
	case domain.LevelWarning:
		return 2
	default:
		return 1
	}
}
