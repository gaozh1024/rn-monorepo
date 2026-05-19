package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type AlertsHandler struct {
	alerts *appsvc.AlertRuleService
}

func NewAlertsHandler(alerts *appsvc.AlertRuleService) *AlertsHandler {
	return &AlertsHandler{alerts: alerts}
}

func (h *AlertsHandler) ListRules(w http.ResponseWriter, r *http.Request) {
	response, err := h.alerts.ListRules(r.Context(), domain.AlertRuleQuery{
		AppID:    r.URL.Query().Get("appId"),
		Enabled:  queryBoolPtr(r, "enabled"),
		Page:     queryInt(r, "page", 1),
		PageSize: queryInt(r, "pageSize", 50),
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *AlertsHandler) CreateRule(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var request domain.CreateAlertRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	rule, err := h.alerts.CreateRule(r.Context(), request)
	if err != nil {
		writeAlertError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"rule": rule})
}

func (h *AlertsHandler) GetRule(w http.ResponseWriter, r *http.Request) {
	rule, err := h.alerts.GetRule(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rule": rule})
}

func (h *AlertsHandler) UpdateRule(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var request domain.UpdateAlertRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	rule, err := h.alerts.UpdateRule(r.Context(), r.PathValue("id"), request)
	if err != nil {
		writeAlertError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rule": rule})
}

func (h *AlertsHandler) EnableRule(w http.ResponseWriter, r *http.Request) {
	rule, err := h.alerts.EnableRule(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rule": rule})
}

func (h *AlertsHandler) DisableRule(w http.ResponseWriter, r *http.Request) {
	rule, err := h.alerts.DisableRule(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rule": rule})
}

func (h *AlertsHandler) DeleteRule(w http.ResponseWriter, r *http.Request) {
	rule, err := h.alerts.DeleteRule(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rule": rule})
}

func (h *AlertsHandler) TestRule(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var request domain.TestAlertRuleRequest
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&request)
	}
	delivery, err := h.alerts.TestRule(r.Context(), r.PathValue("id"), request)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"delivery": delivery})
}

func (h *AlertsHandler) ListDeliveries(w http.ResponseWriter, r *http.Request) {
	response, err := h.alerts.ListDeliveries(r.Context(), domain.AlertDeliveryQuery{
		RuleID:   r.URL.Query().Get("ruleId"),
		AppID:    r.URL.Query().Get("appId"),
		Status:   r.URL.Query().Get("status"),
		Page:     queryInt(r, "page", 1),
		PageSize: queryInt(r, "pageSize", 50),
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func writeAlertError(w http.ResponseWriter, err error) {
	if errors.Is(err, appsvc.ErrInvalidAlertRule) {
		writeError(w, http.StatusBadRequest, "invalid alert rule")
		return
	}
	writeServiceError(w, err)
}

func queryBoolPtr(r *http.Request, key string) *bool {
	value := r.URL.Query().Get(key)
	if value == "" {
		return nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return nil
	}
	return &parsed
}
