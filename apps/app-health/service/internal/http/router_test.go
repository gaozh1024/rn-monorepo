package httpapi

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/app"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/config"
)

const examplePayload = `{
  "events": [
    {
      "id": "evt_test_001",
      "type": "js_error",
      "level": "error",
      "timestamp": 1710000000000,
      "app": { "id": "mobile-app", "version": "1.0.0" },
      "device": { "platform": "ios" },
      "session": { "id": "sess_test_001", "startedAt": 1710000000000 },
      "user": { "id": "user_1" },
      "error": { "name": "TypeError", "message": "boom", "fingerprint": "fp_test" }
    }
  ]
}`

func TestRouterIngestAndAdminQueries(t *testing.T) {
	cfg := config.Config{
		IngestToken: "ingest_test",
		AdminToken:  "admin_test",
		CORSOrigins: []string{"*"},
		Env:         "test",
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	container, err := app.NewContainer(t.Context(), cfg, logger)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(container.Close)
	router := NewRouter(cfg, logger, container)

	assertRequest(t, router, http.MethodGet, "/healthz", "", "", http.StatusOK, `"status":"ok"`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer ingest_test", examplePayload, http.StatusOK, `"accepted":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/issues", "Bearer admin_test", "", http.StatusOK, `"total":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/issues?status=open&level=error&platform=ios", "Bearer admin_test", "", http.StatusOK, `"total":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/issues?status=resolved", "Bearer admin_test", "", http.StatusOK, `"total":0`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/events?appId=mobile-app&level=error&type=js_error&userId=user_1", "Bearer admin_test", "", http.StatusOK, `"total":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/stats/overview", "Bearer admin_test", "", http.StatusOK, `"openIssues":1`)
}

func TestRouterRejectsWrongToken(t *testing.T) {
	cfg := config.Config{IngestToken: "ingest_test", AdminToken: "admin_test"}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	container, err := app.NewContainer(t.Context(), cfg, logger)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(container.Close)
	router := NewRouter(cfg, logger, container)
	assertRequest(t, router, http.MethodGet, "/api/app-health/issues", "Bearer wrong", "", http.StatusUnauthorized, `"unauthorized"`)
}

func assertRequest(t *testing.T, handler http.Handler, method string, path string, token string, body string, wantStatus int, wantBody string) {
	t.Helper()
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	if token != "" {
		request.Header.Set("authorization", token)
	}
	if body != "" {
		request.Header.Set("content-type", "application/json")
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != wantStatus {
		t.Fatalf("status = %d, want %d, body=%s", response.Code, wantStatus, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), wantBody) {
		t.Fatalf("body %q does not contain %q", response.Body.String(), wantBody)
	}
}
