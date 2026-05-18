package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/http/middleware"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type AuthHandler struct {
	auth         *appsvc.AuthService
	sessions     *appsvc.SessionService
	cookieSecure bool
}

func NewAuthHandler(auth *appsvc.AuthService, sessions *appsvc.SessionService, cookieSecure bool) *AuthHandler {
	return &AuthHandler{auth: auth, sessions: sessions, cookieSecure: cookieSecure}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var request domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, err := h.auth.Login(r.Context(), request.Email, request.Password)
	if err != nil {
		if errors.Is(err, appsvc.ErrAuthNotConfigured) {
			writeError(w, http.StatusServiceUnavailable, "admin authentication is not configured")
			return
		}
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	sessionValue, expiresAt, err := h.sessions.Create(user)
	if err != nil {
		if errors.Is(err, appsvc.ErrAuthNotConfigured) {
			writeError(w, http.StatusServiceUnavailable, "admin session is not configured")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	http.SetCookie(w, h.cookie(sessionValue, expiresAt, h.sessionsTTLSeconds(expiresAt)))
	writeJSON(w, http.StatusOK, domain.AuthUserResponse{User: user})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, _ *http.Request) {
	http.SetCookie(w, h.cookie("", time.Unix(0, 0), -1))
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.AdminUserFromContext(r.Context())
	if !ok {
		user = domain.AdminUser{ID: "admin", Email: "token-admin", Role: "owner"}
	}
	writeJSON(w, http.StatusOK, domain.AuthUserResponse{User: user})
}

func (h *AuthHandler) cookie(value string, expiresAt time.Time, maxAge int) *http.Cookie {
	return &http.Cookie{
		Name:     appsvc.SessionCookieName,
		Value:    value,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
	}
}

func (h *AuthHandler) sessionsTTLSeconds(expiresAt time.Time) int {
	seconds := int(time.Until(expiresAt).Seconds())
	if seconds < 1 {
		return 1
	}
	return seconds
}
