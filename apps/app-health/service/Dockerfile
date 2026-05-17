FROM golang:1.25-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/app-health-service ./cmd/app-health-service
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/app-health-migrate ./cmd/app-health-migrate

FROM alpine:3.22

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /out/app-health-service /app/app-health-service
COPY --from=builder /out/app-health-migrate /app/app-health-migrate
COPY --from=builder /src/internal/db/migrations /app/internal/db/migrations

EXPOSE 8080

CMD ["/app/app-health-service"]
