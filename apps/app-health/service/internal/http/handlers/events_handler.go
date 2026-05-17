package handlers

import (
	"net/http"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type EventsHandler struct{ events *appsvc.EventService }

func NewEventsHandler(events *appsvc.EventService) *EventsHandler {
	return &EventsHandler{events: events}
}

func (h *EventsHandler) List(w http.ResponseWriter, r *http.Request) {
	query := domain.EventQuery{
		AppID:       r.URL.Query().Get("appId"),
		IssueID:     r.URL.Query().Get("issueId"),
		UserID:      r.URL.Query().Get("userId"),
		Level:       r.URL.Query().Get("level"),
		Type:        r.URL.Query().Get("type"),
		From:        queryTime(r, "from"),
		To:          queryTime(r, "to"),
		AppVersion:  r.URL.Query().Get("appVersion"),
		BuildNumber: r.URL.Query().Get("buildNumber"),
		Environment: r.URL.Query().Get("environment"),
		Platform:    r.URL.Query().Get("platform"),
		OSVersion:   r.URL.Query().Get("osVersion"),
		SessionID:   r.URL.Query().Get("sessionId"),
		Fingerprint: r.URL.Query().Get("fingerprint"),
		Message:     r.URL.Query().Get("message"),
		Page:        queryInt(r, "page", 1),
		PageSize:    queryInt(r, "pageSize", 20),
	}
	response, err := h.events.List(r.Context(), query)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *EventsHandler) Get(w http.ResponseWriter, r *http.Request) {
	event, err := h.events.Get(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"event": event})
}
