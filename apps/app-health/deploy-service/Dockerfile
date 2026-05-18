FROM scratch

WORKDIR /app

COPY deploy-service/out/app-health-service /app/app-health-service
COPY deploy-service/out/app-health-migrate /app/app-health-migrate
COPY deploy-service/out/app-health-retention /app/app-health-retention
COPY deploy-service/out/app-health-password /app/app-health-password
COPY service/internal/db/migrations /app/internal/db/migrations

EXPOSE 8080

CMD ["/app/app-health-service"]
