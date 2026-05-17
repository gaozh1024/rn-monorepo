package middleware

import (
	"net/http"
	"sync"
	"time"
)

type tokenBucket struct {
	mu       sync.Mutex
	rate     float64
	capacity float64
	tokens   float64
	updated  time.Time
}

func RateLimit(rps int, burst int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		if rps <= 0 || burst <= 0 {
			return next
		}
		bucket := &tokenBucket{
			rate:     float64(rps),
			capacity: float64(burst),
			tokens:   float64(burst),
			updated:  time.Now(),
		}
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !bucket.allow(time.Now()) {
				w.Header().Set("content-type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"error":"rate limit exceeded"}`))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (b *tokenBucket) allow(now time.Time) bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	elapsed := now.Sub(b.updated).Seconds()
	b.updated = now
	b.tokens += elapsed * b.rate
	if b.tokens > b.capacity {
		b.tokens = b.capacity
	}
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}
