package httpapi

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"

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
	assertRequest(t, router, http.MethodGet, "/readyz", "", "", http.StatusOK, `"databaseConfigured":false`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer ingest_test", examplePayload, http.StatusOK, `"accepted":1`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer ingest_test", examplePayload, http.StatusOK, `"duplicated":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/issues", "Bearer admin_test", "", http.StatusOK, `"total":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/issues?status=open&level=error&platform=ios", "Bearer admin_test", "", http.StatusOK, `"total":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/issues?status=resolved", "Bearer admin_test", "", http.StatusOK, `"total":0`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/events?appId=mobile-app&level=error&type=js_error&userId=user_1", "Bearer admin_test", "", http.StatusOK, `"total":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/events?appVersion=1.0.0&platform=ios&fingerprint=fp_test&message=boom&from=2000-01-01T00:00:00Z&to=2100-01-01T00:00:00Z", "Bearer admin_test", "", http.StatusOK, `"total":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/events?appVersion=9.9.9", "Bearer admin_test", "", http.StatusOK, `"total":0`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/issues?appVersion=1.0.0&fingerprint=fp_test&message=TypeError&from=2000-01-01T00:00:00Z&to=2100-01-01T00:00:00Z", "Bearer admin_test", "", http.StatusOK, `"total":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/issues?fingerprint=missing", "Bearer admin_test", "", http.StatusOK, `"total":0`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/stats/overview", "Bearer admin_test", "", http.StatusOK, `"openIssues":1`)
}

func TestRouterCreatesApplicationAndUsesApplicationIngestToken(t *testing.T) {
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

	createBody := `{"name":"Mobile App","slug":"mobile-app","defaultEnvironment":"production","platforms":["ios","android"]}`
	request := httptest.NewRequest(http.MethodPost, "/api/app-health/applications", strings.NewReader(createBody))
	request.Header.Set("authorization", "Bearer admin_test")
	request.Header.Set("content-type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body=%s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"plainText":"ah_ingest_`) {
		t.Fatalf("create body did not include one-time token: %s", response.Body.String())
	}
	plainText := extractJSONValue(t, response.Body.String(), "plainText")

	assertRequest(t, router, http.MethodGet, "/api/app-health/applications", "Bearer admin_test", "", http.StatusOK, `"total":1`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/applications", "Bearer admin_test", createBody, http.StatusConflict, `"application already exists"`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer "+plainText, examplePayload, http.StatusOK, `"accepted":1`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer "+plainText, strings.Replace(examplePayload, "mobile-app", "other-app", 1), http.StatusForbidden, `"event app id does not match ingest token"`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer ingest_test", strings.Replace(examplePayload, "evt_test_001", "evt_global_001", 1), http.StatusOK, `"accepted":1`)
}

func TestRouterPreservesDottedApplicationID(t *testing.T) {
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

	createBody := `{"name":"Dev App","slug":"com.llys.app.dev","defaultEnvironment":"production","platforms":["android"]}`
	assertRequest(t, router, http.MethodPost, "/api/app-health/applications", "Bearer admin_test", createBody, http.StatusCreated, `"slug":"com.llys.app.dev"`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/applications", "Bearer admin_test", "", http.StatusOK, `"slug":"com.llys.app.dev"`)
}

func TestRouterApplicationLifecycleActions(t *testing.T) {
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

	createBody := `{"name":"Lifecycle App","slug":"lifecycle-app","defaultEnvironment":"production","platforms":["ios"]}`
	response := performRequest(router, http.MethodPost, "/api/app-health/applications", "Bearer admin_test", createBody)
	if response.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body=%s", response.Code, response.Body.String())
	}
	plainText := extractJSONValue(t, response.Body.String(), "plainText")

	lifecyclePayload := strings.Replace(examplePayload, "mobile-app", "lifecycle-app", 1)
	lifecyclePayload = strings.Replace(lifecyclePayload, "evt_test_001", "evt_lifecycle_001", 1)
	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer "+plainText, lifecyclePayload, http.StatusOK, `"accepted":1`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/applications/lifecycle-app/disable", "Bearer admin_test", "", http.StatusOK, `"status":"disabled"`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer "+plainText, strings.Replace(lifecyclePayload, "evt_lifecycle_001", "evt_lifecycle_002", 1), http.StatusUnauthorized, `"unauthorized"`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/applications/lifecycle-app/enable", "Bearer admin_test", "", http.StatusOK, `"status":"active"`)

	assertRequest(t, router, http.MethodDelete, "/api/app-health/applications/lifecycle-app", "Bearer admin_test", "", http.StatusOK, `"slug":"lifecycle-app"`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/applications", "Bearer admin_test", "", http.StatusOK, `"total":0`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/events?appId=lifecycle-app", "Bearer admin_test", "", http.StatusOK, `"total":1`)
}

func TestRouterDeletesApplicationWithDataAfterConfirmation(t *testing.T) {
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

	createBody := `{"name":"Delete App","slug":"delete-app","defaultEnvironment":"production","platforms":["android"]}`
	response := performRequest(router, http.MethodPost, "/api/app-health/applications", "Bearer admin_test", createBody)
	if response.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body=%s", response.Code, response.Body.String())
	}
	plainText := extractJSONValue(t, response.Body.String(), "plainText")
	deletePayload := strings.Replace(examplePayload, "mobile-app", "delete-app", 1)
	deletePayload = strings.Replace(deletePayload, "evt_test_001", "evt_delete_001", 1)
	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer "+plainText, deletePayload, http.StatusOK, `"accepted":1`)
	assertRequest(t, router, http.MethodDelete, "/api/app-health/applications/delete-app/data", "Bearer admin_test", `{"confirmAppId":"wrong"}`, http.StatusBadRequest, `"invalid application"`)
	assertRequest(t, router, http.MethodDelete, "/api/app-health/applications/delete-app/data", "Bearer admin_test", `{"confirmAppId":"delete-app"}`, http.StatusOK, `"deletedEvents":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/events?appId=delete-app", "Bearer admin_test", "", http.StatusOK, `"total":0`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/issues?appId=delete-app", "Bearer admin_test", "", http.StatusOK, `"total":0`)
}

func TestRouterAdminSessionLoginMeAndLogout(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("secret-pass"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{
		IngestToken:       "ingest_test",
		AdminToken:        "admin_test",
		AdminEmail:        "admin@example.com",
		AdminPasswordHash: string(hash),
		SessionSecret:     "01234567890123456789012345678901",
		SessionTTLHours:   24,
		CORSOrigins:       []string{"http://localhost:5173"},
		Env:               "test",
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	container, err := app.NewContainer(t.Context(), cfg, logger)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(container.Close)
	router := NewRouter(cfg, logger, container)

	loginRequest := httptest.NewRequest(http.MethodPost, "/api/app-health/auth/login", strings.NewReader(`{"email":"admin@example.com","password":"secret-pass"}`))
	loginRequest.Header.Set("content-type", "application/json")
	loginResponse := httptest.NewRecorder()
	router.ServeHTTP(loginResponse, loginRequest)
	if loginResponse.Code != http.StatusOK {
		t.Fatalf("login status = %d, body=%s", loginResponse.Code, loginResponse.Body.String())
	}
	cookies := loginResponse.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatalf("login did not set a session cookie")
	}

	meRequest := httptest.NewRequest(http.MethodGet, "/api/app-health/auth/me", nil)
	for _, cookie := range cookies {
		meRequest.AddCookie(cookie)
	}
	meResponse := httptest.NewRecorder()
	router.ServeHTTP(meResponse, meRequest)
	if meResponse.Code != http.StatusOK {
		t.Fatalf("me status = %d, body=%s", meResponse.Code, meResponse.Body.String())
	}
	if !strings.Contains(meResponse.Body.String(), `"email":"admin@example.com"`) {
		t.Fatalf("me body = %s", meResponse.Body.String())
	}

	logoutRequest := httptest.NewRequest(http.MethodPost, "/api/app-health/auth/logout", nil)
	logoutResponse := httptest.NewRecorder()
	router.ServeHTTP(logoutResponse, logoutRequest)
	if logoutResponse.Code != http.StatusOK {
		t.Fatalf("logout status = %d, body=%s", logoutResponse.Code, logoutResponse.Body.String())
	}
	if len(logoutResponse.Result().Cookies()) == 0 || logoutResponse.Result().Cookies()[0].MaxAge != -1 {
		t.Fatalf("logout did not clear the session cookie")
	}
}

func extractJSONValue(t *testing.T, body string, key string) string {
	t.Helper()
	var decoded map[string]any
	if err := json.NewDecoder(strings.NewReader(body)).Decode(&decoded); err != nil {
		t.Fatal(err)
	}
	token, ok := decoded["token"].(map[string]any)
	if !ok {
		t.Fatalf("missing token object: %s", body)
	}
	value, ok := token[key].(string)
	if !ok || value == "" {
		t.Fatalf("missing token.%s: %s", key, body)
	}
	return value
}

func TestRouterAdminSessionLoginRequiresConfiguredAuth(t *testing.T) {
	cfg := config.Config{AdminToken: "admin_test", AdminEmail: "admin@example.com", SessionSecret: "01234567890123456789012345678901"}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	container, err := app.NewContainer(t.Context(), cfg, logger)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(container.Close)
	router := NewRouter(cfg, logger, container)

	request := httptest.NewRequest(http.MethodPost, "/api/app-health/auth/login", strings.NewReader(`{"email":"admin@example.com","password":"secret-pass"}`))
	request.Header.Set("content-type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d, body=%s", response.Code, http.StatusServiceUnavailable, response.Body.String())
	}
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

func TestRouterRejectsOversizedIngestBody(t *testing.T) {
	cfg := config.Config{
		IngestToken:  "ingest_test",
		AdminToken:   "admin_test",
		CORSOrigins:  []string{"*"},
		Env:          "test",
		MaxBodyBytes: 16,
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	container, err := app.NewContainer(t.Context(), cfg, logger)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(container.Close)
	router := NewRouter(cfg, logger, container)

	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer ingest_test", examplePayload, http.StatusRequestEntityTooLarge, `"request body too large"`)
}

func TestRouterRateLimitsIngest(t *testing.T) {
	cfg := config.Config{
		IngestToken:          "ingest_test",
		AdminToken:           "admin_test",
		CORSOrigins:          []string{"*"},
		Env:                  "test",
		IngestRateLimitRPS:   1,
		IngestRateLimitBurst: 1,
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	container, err := app.NewContainer(t.Context(), cfg, logger)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(container.Close)
	router := NewRouter(cfg, logger, container)

	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer ingest_test", examplePayload, http.StatusOK, `"accepted":1`)
	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer ingest_test", examplePayload, http.StatusTooManyRequests, `"rate limit exceeded"`)
}

func TestRouterRejectsInvalidIngestEvents(t *testing.T) {
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

	const invalidPayload = `{
  "events": [
    {
      "id": "evt_invalid_level",
      "type": "js_error",
      "level": "critical",
      "timestamp": 1710000000000,
      "app": { "id": "mobile-app" },
      "device": { "platform": "ios" },
      "session": { "id": "sess_test_001", "startedAt": 1710000000000 },
      "error": { "message": "boom" }
    }
  ]
}`

	assertRequest(t, router, http.MethodPost, "/api/app-health/events", "Bearer ingest_test", invalidPayload, http.StatusOK, `"rejected":1`)
	assertRequest(t, router, http.MethodGet, "/api/app-health/events", "Bearer admin_test", "", http.StatusOK, `"total":0`)
}

func assertRequest(t *testing.T, handler http.Handler, method string, path string, token string, body string, wantStatus int, wantBody string) {
	t.Helper()
	response := performRequest(handler, method, path, token, body)
	if response.Code != wantStatus {
		t.Fatalf("status = %d, want %d, body=%s", response.Code, wantStatus, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), wantBody) {
		t.Fatalf("body %q does not contain %q", response.Body.String(), wantBody)
	}
}

func performRequest(handler http.Handler, method string, path string, token string, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	if token != "" {
		request.Header.Set("authorization", token)
	}
	if body != "" {
		request.Header.Set("content-type", "application/json")
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}
