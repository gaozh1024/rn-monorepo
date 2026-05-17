package middleware

import (
	"net/http"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/security"
)

func RequireBearer(expectedToken string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := security.ExtractBearerToken(r.Header.Get("authorization"))
			if !security.ConstantTimeEqual(token, expectedToken) {
				w.Header().Set("content-type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
