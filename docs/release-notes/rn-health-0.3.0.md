# @gaozh1024/rn-health 0.3.0 Release Notes

发布日期：2026-05-20

`0.3.0` expands `rn-health` from diagnostics-only capture into lightweight, consent-aware product analytics while keeping the existing error capture APIs compatible.

## Added

- Consent controls for `crash`, `analytics`, `device`, and future `performance` collection lanes.
- Anonymous install identity support through `identity.autoInstallId` and `getOrCreateInstallId`.
- `trackEvent(name, properties, context)` for behavior analytics events.
- `trackScreen(screen, properties, context)` for page/screen view analytics.
- `analytics` payload on events with event types `analytics_event` and `screen_view`.
- Optional `deviceInfoProvider` for app-provided model/brand collection without adding SDK dependencies.
- Noop reporter and public exports for the new APIs.

## Migration

- Existing crash/error capture APIs remain compatible.
- Analytics collection is opt-in. Apps must enable `consent.analytics` before `trackEvent` / `trackScreen` send events.
- Device model/brand enrichment is opt-in through `consent.device` and `deviceInfoProvider`.
- Apps that want stable anonymous timelines should configure a storage adapter and `identity.autoInstallId`.

## Privacy / compliance posture

- Analytics collection is gated by `consent.analytics`.
- Extended device collection is gated by `consent.device`.
- Crash/diagnostic capture can be controlled separately through `consent.crash`.
- Install IDs are anonymous continuity IDs; apps should not upload phone numbers, emails, real names, ID cards, tokens, cookies, raw auth headers, or precise location in analytics properties.

## Rollback

- Rolling back to `0.2.x` removes the new analytics APIs from the SDK surface.
- Existing crash capture payloads remain compatible with the app-health ingest endpoint.
- Apps using `trackEvent`, `trackScreen`, or `identity.autoInstallId` must remove those calls before downgrading.

## Verification

- `pnpm --dir packages/rn-health typecheck`
- `pnpm --dir packages/rn-health test`
- `pnpm --dir packages/rn-health build`
- `npm pack --dry-run --workspace @gaozh1024/rn-health`
