package handlers

import (
	"errors"
	"net/http"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type AnalyticsHandler struct{ analytics *appsvc.AnalyticsService }

func NewAnalyticsHandler(analytics *appsvc.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{analytics: analytics}
}

func (h *AnalyticsHandler) UserTimeline(w http.ResponseWriter, r *http.Request) {
	response, err := h.analytics.UserTimeline(r.Context(), domain.AnalyticsTimelineQuery{
		AppID:  r.URL.Query().Get("appId"),
		UserID: r.PathValue("userId"),
		From:   queryTime(r, "from"),
		To:     queryTime(r, "to"),
		Limit:  queryInt(r, "limit", 100),
	})
	writeAnalyticsResponse(w, response, err)
}

func (h *AnalyticsHandler) EventTimeline(w http.ResponseWriter, r *http.Request) {
	response, err := h.analytics.EventTimeline(r.Context(), r.PathValue("eventId"), queryInt(r, "windowMinutes", 10))
	writeAnalyticsResponse(w, response, err)
}

func (h *AnalyticsHandler) ScreenStats(w http.ResponseWriter, r *http.Request) {
	response, err := h.analytics.ScreenStats(r.Context(), domain.AnalyticsStatsQuery{
		AppID: r.URL.Query().Get("appId"),
		From:  queryTime(r, "from"),
		To:    queryTime(r, "to"),
		Limit: queryInt(r, "limit", 50),
	})
	writeAnalyticsResponse(w, response, err)
}

func (h *AnalyticsHandler) Distribution(w http.ResponseWriter, r *http.Request) {
	response, err := h.analytics.Distribution(r.Context(), domain.AnalyticsDistributionQuery{
		AppID:     r.URL.Query().Get("appId"),
		Dimension: r.URL.Query().Get("dimension"),
		From:      queryTime(r, "from"),
		To:        queryTime(r, "to"),
		Limit:     queryInt(r, "limit", 20),
	})
	writeAnalyticsResponse(w, response, err)
}

func writeAnalyticsResponse(w http.ResponseWriter, response any, err error) {
	if err != nil {
		if errors.Is(err, appsvc.ErrInvalidAnalyticsQuery) {
			writeError(w, http.StatusBadRequest, "invalid analytics query")
			return
		}
		writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}
