# App Health Service 本地 Docker 发布目录

这个目录只发布 `app-health-service`，不包含 admin 静态站点，也不强制启动 PostgreSQL。
默认使用 service 的内存仓库模式，方便先把 API 跑起来验证。

发布脚本会先在本机编译 Linux 静态二进制，再构建 `scratch` 镜像，因此不依赖 `golang:*` 或 `alpine:*` 基础镜像拉取。

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

## 常用命令

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f app-health-service

# 停止
docker compose down

# 重新构建并发布
./deploy-service.sh
```

## 配置说明

- `.env` 不应提交；请从 `.env.example` 复制。
- `.env.example` 里的 bcrypt hash 使用 `$$` 转义，避免 Docker Compose 把 `$2a$10$...` 当变量展开。
- 默认 `APP_HEALTH_DATABASE_URL=` 为空，表示内存模式，容器重启会丢数据。
- 如需 PostgreSQL，把 `APP_HEALTH_DATABASE_URL` 改为可访问的 DSN，并先执行迁移：

```bash
docker compose run --rm --entrypoint /app/app-health-migrate app-health-service up
```

- 生产环境必须替换：
  - `APP_HEALTH_INGEST_TOKEN`
  - `APP_HEALTH_ADMIN_TOKEN`（如果保留脚本兼容模式）
  - `APP_HEALTH_ADMIN_PASSWORD_HASH`
  - `APP_HEALTH_SESSION_SECRET`
