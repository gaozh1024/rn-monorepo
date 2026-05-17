package middleware

import (
	"net/http"
	"slices"
)

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("origin")
			if origin != "" && (slices.Contains(allowedOrigins, "*") || slices.Contains(allowedOrigins, origin)) {
				w.Header().Set("access-control-allow-origin", origin)
				w.Header().Set("vary", "origin")
			}
			w.Header().Set("access-control-allow-methods", "GET,POST,PATCH,OPTIONS")
			w.Header().Set("access-control-allow-headers", "authorization,content-type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
