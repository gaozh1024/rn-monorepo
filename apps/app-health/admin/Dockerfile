FROM node:24-alpine AS builder

WORKDIR /src

RUN corepack enable

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .

ARG VITE_APP_HEALTH_API_BASE_URL=http://localhost:8080
ARG VITE_APP_HEALTH_ADMIN_TOKEN=admin_dev
ENV VITE_APP_HEALTH_API_BASE_URL=$VITE_APP_HEALTH_API_BASE_URL
ENV VITE_APP_HEALTH_ADMIN_TOKEN=$VITE_APP_HEALTH_ADMIN_TOKEN

RUN pnpm build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /src/dist /usr/share/nginx/html

EXPOSE 80
