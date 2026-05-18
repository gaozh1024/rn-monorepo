package middleware

import (
	"context"
	"net/http"

	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/domain"
	"github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/security"
	appsvc "github.com/gaozh1024/rn-monorepo/apps/app-health/service/internal/service"
)

type ingestApplicationContextKey struct{}

func RequireIngest(auth *appsvc.IngestAuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := security.ExtractBearerToken(r.Header.Get("authorization"))
			application, global, err := auth.Verify(r.Context(), token)
			if err != nil {
				w.Header().Set("content-type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
				return
			}
			if !global {
				r = r.WithContext(context.WithValue(r.Context(), ingestApplicationContextKey{}, application))
			}
			next.ServeHTTP(w, r)
		})
	}
}

func IngestApplicationFromContext(ctx context.Context) (domain.Application, bool) {
	application, ok := ctx.Value(ingestApplicationContextKey{}).(domain.Application)
	return application, ok
}
