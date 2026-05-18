package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/repository"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type ApplicationsHandler struct {
	applications *appsvc.ApplicationService
}

func NewApplicationsHandler(applications *appsvc.ApplicationService) *ApplicationsHandler {
	return &ApplicationsHandler{applications: applications}
}

func (h *ApplicationsHandler) List(w http.ResponseWriter, r *http.Request) {
	response, err := h.applications.List(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *ApplicationsHandler) Create(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var request domain.CreateApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	response, err := h.applications.Create(r.Context(), request)
	if err != nil {
		writeApplicationError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, response)
}

func (h *ApplicationsHandler) Get(w http.ResponseWriter, r *http.Request) {
	application, tokens, err := h.applications.Get(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"application": application, "tokens": tokens})
}

func (h *ApplicationsHandler) Update(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var request domain.UpdateApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	application, err := h.applications.Update(r.Context(), r.PathValue("id"), request)
	if err != nil {
		writeApplicationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"application": application})
}

func (h *ApplicationsHandler) CreateToken(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var request domain.CreateTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	token, err := h.applications.CreateToken(r.Context(), r.PathValue("id"), request)
	if err != nil {
		writeApplicationError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"token": token})
}

func (h *ApplicationsHandler) RevokeToken(w http.ResponseWriter, r *http.Request) {
	token, err := h.applications.RevokeToken(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token})
}

func (h *ApplicationsHandler) Enable(w http.ResponseWriter, r *http.Request) {
	application, err := h.applications.Enable(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"application": application})
}

func (h *ApplicationsHandler) Disable(w http.ResponseWriter, r *http.Request) {
	application, err := h.applications.Disable(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"application": application})
}

func (h *ApplicationsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	application, err := h.applications.Delete(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"application": application})
}

func (h *ApplicationsHandler) DeleteData(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var request domain.DeleteApplicationDataRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	application, deletedEvents, deletedIssues, err := h.applications.DeleteWithData(
		r.Context(),
		r.PathValue("id"),
		request.ConfirmAppID,
	)
	if err != nil {
		writeApplicationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"application":   application,
		"deletedEvents": deletedEvents,
		"deletedIssues": deletedIssues,
	})
}

func writeApplicationError(w http.ResponseWriter, err error) {
	if errors.Is(err, appsvc.ErrInvalidApplication) {
		writeError(w, http.StatusBadRequest, "invalid application")
		return
	}
	if errors.Is(err, repository.ErrDuplicate) {
		writeError(w, http.StatusConflict, "application already exists")
		return
	}
	writeServiceError(w, err)
}
