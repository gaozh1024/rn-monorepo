package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type IssuesHandler struct{ issues *appsvc.IssueService }

func NewIssuesHandler(issues *appsvc.IssueService) *IssuesHandler {
	return &IssuesHandler{issues: issues}
}

func (h *IssuesHandler) List(w http.ResponseWriter, r *http.Request) {
	query := domain.IssueQuery{
		AppID:       r.URL.Query().Get("appId"),
		Status:      r.URL.Query().Get("status"),
		Level:       r.URL.Query().Get("level"),
		Platform:    r.URL.Query().Get("platform"),
		From:        queryTime(r, "from"),
		To:          queryTime(r, "to"),
		AppVersion:  r.URL.Query().Get("appVersion"),
		BuildNumber: r.URL.Query().Get("buildNumber"),
		Fingerprint: r.URL.Query().Get("fingerprint"),
		Message:     r.URL.Query().Get("message"),
		Page:        queryInt(r, "page", 1),
		PageSize:    queryInt(r, "pageSize", 20),
	}
	response, err := h.issues.List(r.Context(), query)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *IssuesHandler) Get(w http.ResponseWriter, r *http.Request) {
	response, err := h.issues.Get(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *IssuesHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var request domain.IssueStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	issue, err := h.issues.UpdateStatus(r.Context(), r.PathValue("id"), request.Status)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"issue": issue})
}
