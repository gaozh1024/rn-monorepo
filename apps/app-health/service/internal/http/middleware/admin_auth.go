package middleware

import (
	"context"
	"net/http"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/security"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type adminUserContextKey struct{}

func RequireAdmin(expectedBearerToken string, sessions *appsvc.SessionService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if token := security.ExtractBearerToken(r.Header.Get("authorization")); security.ConstantTimeEqual(token, expectedBearerToken) {
				next.ServeHTTP(w, r)
				return
			}
			if sessions != nil {
				if cookie, err := r.Cookie(appsvc.SessionCookieName); err == nil {
					user, err := sessions.Verify(cookie.Value)
					if err == nil {
						next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), adminUserContextKey{}, user)))
						return
					}
				}
			}
			w.Header().Set("content-type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
		})
	}
}

func AdminUserFromContext(ctx context.Context) (domain.AdminUser, bool) {
	user, ok := ctx.Value(adminUserContextKey{}).(domain.AdminUser)
	return user, ok
}
