# @gaozh1024/rn-observatory 0.5.0 Release Notes

## Summary

`0.5.0` turns `rn-observatory` from a renamed SDK package into a more formal observability platform SDK surface.

This release focuses on keeping the SDK, `app-observatory` backend/admin, and app integration docs aligned around three official lanes:

- Analytics
- Release / Symbolication
- Crash / Alerts

## Highlights

### 1. Public event taxonomy

The SDK now exports the maintained event vocabulary as typed public constants:

- `appObservatoryEventTypes`
- `appObservatoryLifecycleEventTypes`
- `appObservatoryErrorEventTypes`
- `appObservatoryAnalyticsEventTypes`
- `appObservatoryCustomEventTypes`

The canonical taxonomy document is:

- `packages/rn-observatory/docs/event-taxonomy.md`

### 2. Taxonomy sync and verification

Maintainers can keep SDK, admin, and OpenAPI event lists aligned with:

```bash
pnpm --dir packages/rn-observatory sync:taxonomy
pnpm --dir packages/rn-observatory verify:taxonomy
```

### 3. Release and source map workflow

Release metadata and source map artifact registration are now documented as first-class production setup steps.

Primary docs:

- `packages/rn-observatory/docs/release-integration.md`
- `packages/rn-observatory/docs/github-actions-release-example.md`
- `packages/rn-observatory/docs/expo-eas-release-template.md`
- `packages/rn-observatory/docs/react-native-cli-release-template.md`

The package also ships the `rn-observatory-release` helper CLI for release creation and source map upload flows.

### 4. App metadata guidance

Production docs now recommend reading `appId`, `appVersion`, and `buildNumber` from the app's metadata layer instead of hand-maintaining those values inside observability setup code.

Examples now point to Expo Constants, React Native CLI `BuildConfig`, `react-native-config`, or CI-generated release constants as app-owned sources.

### 5. Maintainer governance

Added governance guidance for protecting the SDK's official product lanes and avoiding SDK/backend/admin drift:

- `packages/rn-observatory/docs/maintainer-governance.md`

## Upgrade Notes

No breaking runtime API changes are expected for apps already using `0.4.0`.

Recommended follow-up for production apps:

1. Replace hard-coded provider metadata with app-owned metadata values.
2. Add `release.id`, `release.channel`, and `release.commitSha` when the app has a release pipeline.
3. Use the taxonomy constants instead of duplicating event type string lists in app or backend integration code.

## Verification

Validated for release with:

```bash
pnpm --dir packages/rn-observatory verify:taxonomy
pnpm --dir packages/rn-observatory test
pnpm --dir packages/rn-observatory typecheck
pnpm --dir packages/rn-observatory build
npm_config_cache=/tmp/rn-observatory-npm-cache npm pack --dry-run
```
