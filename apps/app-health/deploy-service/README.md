# App Health 本地 Docker 发布目录

这个目录发布完整的本地 `app-health` 栈：

- `app-health-service`：Go API service
- `app-health-postgres`：PostgreSQL 数据库
- `app-health-postgres-data`：数据库持久化 volume

发布脚本会先在本机编译 Linux 静态二进制，再构建 `scratch` service 镜像，因此 service 镜像不依赖 `golang:*` 或 `alpine:*` 基础镜像拉取。
PostgreSQL 使用 `postgres:16-alpine`。

## 快速发布

```bash
cd apps/app-health/deploy-service
cp .env.example .env
./deploy-service.sh
```

默认地址：

```text
http://localhost:8080
```

本地开发账号：

```text
email: admin@example.com
password: admin_dev
```

## Docker 命名

```text
Compose project: app-health
Service 容器: app-health-service
数据库容器: app-health-postgres
数据库 volume: app-health-postgres-data
Service 镜像: app-health-service:latest
```

## 常用命令

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f app-health-service

# 查看数据库日志
docker compose logs -f app-health-postgres

# 运行迁移
docker compose run --rm --entrypoint /app/app-health-migrate app-health-service up

# 查看迁移状态
docker compose run --rm --entrypoint /app/app-health-migrate app-health-service status

# 停止服务和数据库
docker compose down

# 清理数据库数据（会删除本地数据）
docker compose down -v

# 重新构建并发布
./deploy-service.sh
```

## 验证

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
curl -i -X POST http://localhost:8080/api/app-health/auth/login \
  -H 'content-type: application/json' \
  --data '{"email":"admin@example.com","password":"admin_dev"}'
```

`readyz` 应返回：

```json
{ "databaseConfigured": true, "status": "ok" }
```

## 配置说明

- `.env` 不应提交；请从 `.env.example` 复制。
- `.env.example` 里的 bcrypt hash 使用 `$$` 转义，避免 Docker Compose 把 `$2a$10$...` 当变量展开。
- 默认使用 PostgreSQL 持久化，不再是内存模式。
- 生产环境必须替换：
  - `POSTGRES_PASSWORD`
  - `APP_HEALTH_INGEST_TOKEN`
  - `APP_HEALTH_ADMIN_TOKEN`（如果保留脚本兼容模式）
  - `APP_HEALTH_ADMIN_PASSWORD_HASH`
  - `APP_HEALTH_SESSION_SECRET`
