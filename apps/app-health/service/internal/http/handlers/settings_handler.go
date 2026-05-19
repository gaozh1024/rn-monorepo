package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/http/middleware"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type SettingsHandler struct {
	settings  *appsvc.SettingsService
	retention *appsvc.RetentionOperationService
}

func NewSettingsHandler(settings *appsvc.SettingsService, retention *appsvc.RetentionOperationService) *SettingsHandler {
	return &SettingsHandler{settings: settings, retention: retention}
}

func (h *SettingsHandler) Summary(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	writeJSON(w, http.StatusOK, h.settings.Summary(ctx))
}

func (h *SettingsHandler) RetentionDryRun(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var request domain.RetentionDryRunRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	run, err := h.retention.DryRun(r.Context(), appsvc.RetentionDryRunInput{
		EventRetentionDays: request.EventRetentionDays,
		RequestedBy:        adminEmail(r),
	})
	if err != nil {
		writeRetentionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, domain.RetentionRunResponse{Run: run})
}

func (h *SettingsHandler) RetentionRun(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var request domain.RetentionRunRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	run, err := h.retention.Run(r.Context(), appsvc.RetentionRunInput{
		EventRetentionDays: request.EventRetentionDays,
		DryRunID:           request.DryRunID,
		ConfirmText:        request.ConfirmText,
		AcknowledgedBackup: request.AcknowledgedBackup,
		AcknowledgedDryRun: request.AcknowledgedDryRun,
		RequestedBy:        adminEmail(r),
	})
	if err != nil {
		writeRetentionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, domain.RetentionRunResponse{Run: run})
}

func (h *SettingsHandler) RetentionRuns(w http.ResponseWriter, r *http.Request) {
	response, err := h.retention.List(r.Context(), queryInt(r, "limit", 20))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func writeRetentionError(w http.ResponseWriter, err error) {
	if errors.Is(err, appsvc.ErrInvalidRetentionRequest) {
		writeError(w, http.StatusBadRequest, "invalid retention request")
		return
	}
	if errors.Is(err, appsvc.ErrRetentionRunNotConfirmed) {
		writeError(w, http.StatusBadRequest, "retention run requires recent dry-run and explicit confirmation")
		return
	}
	writeServiceError(w, err)
}

func adminEmail(r *http.Request) string {
	if user, ok := middleware.AdminUserFromContext(r.Context()); ok {
		return strings.TrimSpace(user.Email)
	}
	return ""
}
