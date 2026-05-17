package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/security"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type IngestHandler struct{ ingest *appsvc.IngestService }

func NewIngestHandler(ingest *appsvc.IngestService) *IngestHandler {
	return &IngestHandler{ingest: ingest}
}

func (h *IngestHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			writeError(w, http.StatusRequestEntityTooLarge, "request body too large")
			return
		}
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	redacted := security.Redact(raw)
	encoded, err := json.Marshal(redacted)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	var request domain.IngestEventsRequest
	if err := json.NewDecoder(bytes.NewReader(encoded)).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid ingest payload")
		return
	}
	response, err := h.ingest.Ingest(r.Context(), request.Events)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, response)
}
