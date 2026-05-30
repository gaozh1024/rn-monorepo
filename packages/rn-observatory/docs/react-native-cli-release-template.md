# React Native CLI Release Template

Use this template when the app builds bundles through React Native CLI or a custom native CI pipeline.

## Runtime setup

```tsx
<AppObservatoryProvider
  release={{
    id: BuildConfig.OBSERVATORY_RELEASE_ID,
    channel: BuildConfig.OBSERVATORY_CHANNEL,
    commitSha: BuildConfig.OBSERVATORY_COMMIT_SHA,
  }}
  endpoint="https://your-domain.com/api/app-observatory/events"
  ingestToken="your-ingest-token"
>
  {children}
</AppObservatoryProvider>
```

## Bundle / source map expectations

Typical artifacts:

- Android bundle: `index.android.bundle`
- Android source map: `index.android.bundle.map`
- iOS bundle: `main.jsbundle`
- iOS source map: `main.jsbundle.map`

## CLI flow

```bash
rn-observatory-release create-release \
  --api-base "$APP_OBSERVATORY_BASE_URL" \
  --admin-token "$APP_OBSERVATORY_ADMIN_TOKEN" \
  --application-id "$APPLICATION_ID" \
  --version "$APP_VERSION" \
  --build-number "$BUILD_NUMBER" \
  --channel "$RELEASE_CHANNEL" \
  --commit-sha "$COMMIT_SHA"

rn-observatory-release upload-sourcemap \
  --api-base "$APP_OBSERVATORY_BASE_URL" \
  --admin-token "$APP_OBSERVATORY_ADMIN_TOKEN" \
  --release-id "$RELEASE_ID" \
  --platform android \
  --file ./android/app/build/generated/sourcemaps/react/release/index.android.bundle.map \
  --bundle-file-name index.android.bundle

rn-observatory-release upload-sourcemap \
  --api-base "$APP_OBSERVATORY_BASE_URL" \
  --admin-token "$APP_OBSERVATORY_ADMIN_TOKEN" \
  --release-id "$RELEASE_ID" \
  --platform ios \
  --file ./ios/main.jsbundle.map \
  --bundle-file-name main.jsbundle
```

## Notes

- React Native CLI app id, version, and build number are read automatically from the bundled native metadata module.
- The exact bundle/map paths depend on your build pipeline; keep the `bundle-file-name` aligned with the stack traces your release actually produces.
- If the app ships only one platform in a given release train, upload only that platform’s source map artifact.
