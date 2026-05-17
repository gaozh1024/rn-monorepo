package handlers

import (
	"net/http"

	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type StatsHandler struct{ stats *appsvc.StatsService }

func NewStatsHandler(stats *appsvc.StatsService) *StatsHandler { return &StatsHandler{stats: stats} }

func (h *StatsHandler) Overview(w http.ResponseWriter, r *http.Request) {
	response, err := h.stats.Overview(r.Context(), r.URL.Query().Get("appId"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}
