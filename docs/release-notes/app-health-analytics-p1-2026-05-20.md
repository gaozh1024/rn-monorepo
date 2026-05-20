# app-health analytics P1 Release Notes

Date: 2026-05-20

This release turns `app-health` from error monitoring only into a privacy-conscious error + behavior analytics console for `@gaozh1024/rn-health` P0 analytics events.

## Added

- Structured ingest fields for `analytics_event` and `screen_view` events.
- `analytics.name`, `analytics.properties`, and `device.brand` support in event storage.
- Admin analytics APIs for user timeline, event context timeline, screen stats, and distribution stats.
- Admin `Analytics / 行为分析` page for screen stats, user timeline, event context timeline, and whitelisted distribution dimensions.
- Error detail entry point for user behavior around an error event.
- Migration `006_add_app_health_analytics_fields.sql`.
- Smoke coverage for analytics ingest and query APIs.

## Migration

Run app-health migrations before deploying the updated service:

```bash
cd apps/app-health/service
APP_HEALTH_DATABASE_URL=... go run ./cmd/app-health-migrate up
```

Migration `006_add_app_health_analytics_fields.sql` adds nullable columns only, so existing events remain readable.

## Privacy posture

- Analytics APIs require admin auth.
- Raw IP is not stored by default.
- Client-supplied geo is ignored during ingest; coarse geo fields are reserved for future server-side enrichment.
- Analytics properties are size-limited and should not contain sensitive personal information.
- Distribution dimensions are whitelisted to avoid dynamic SQL injection risk.

## Rollback

- Service/admin code can be rolled back independently after traffic is stopped.
- The migration Down path removes `analytics_name`, `analytics_properties`, `device_brand`, `geo_country`, `geo_province`, `geo_city`, and `ip_hash`.
- Back up production data before running Down because analytics data in those columns will be deleted.

## Verification

```bash
pnpm verify:app-health
pnpm smoke:app-health
pnpm ai:check
git diff --check
```
