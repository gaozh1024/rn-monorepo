# Expo / EAS Release Template

Use this template when the app is built through Expo / EAS and wants to register:

1. release metadata
2. source map artifacts
3. backend symbolication inputs

## Runtime setup

```tsx
<AppObservatoryProvider
  release={{
    id: process.env.EXPO_PUBLIC_OBSERVATORY_RELEASE_ID,
    channel: process.env.EXPO_PUBLIC_OBSERVATORY_CHANNEL,
    commitSha: process.env.EXPO_PUBLIC_OBSERVATORY_COMMIT_SHA,
  }}
  endpoint="https://your-domain.com/api/app-observatory/events"
  ingestToken="your-ingest-token"
>
  {children}
</AppObservatoryProvider>
```

## CI / release shape

Recommended CI inputs:

- `APP_OBSERVATORY_BASE_URL`
- `APP_OBSERVATORY_ADMIN_EMAIL`
- `APP_OBSERVATORY_ADMIN_PASSWORD`
- `APPLICATION_ID`
- `APP_VERSION`
- `BUILD_NUMBER`
- `RELEASE_CHANNEL`
- `COMMIT_SHA`
- `RELEASE_ID`

## CLI flow

```bash
rn-observatory-release create-release \
  --api-base "$APP_OBSERVATORY_BASE_URL" \
  --admin-email "$APP_OBSERVATORY_ADMIN_EMAIL" \
  --admin-password "$APP_OBSERVATORY_ADMIN_PASSWORD" \
  --application-id "$APPLICATION_ID" \
  --version "$APP_VERSION" \
  --build-number "$BUILD_NUMBER" \
  --channel "$RELEASE_CHANNEL" \
  --commit-sha "$COMMIT_SHA"

rn-observatory-release upload-sourcemap \
  --api-base "$APP_OBSERVATORY_BASE_URL" \
  --admin-email "$APP_OBSERVATORY_ADMIN_EMAIL" \
  --admin-password "$APP_OBSERVATORY_ADMIN_PASSWORD" \
  --release-id "$RELEASE_ID" \
  --platform ios \
  --file ./dist/main.jsbundle.map \
  --bundle-file-name main.jsbundle

rn-observatory-release upload-sourcemap \
  --api-base "$APP_OBSERVATORY_BASE_URL" \
  --admin-email "$APP_OBSERVATORY_ADMIN_EMAIL" \
  --admin-password "$APP_OBSERVATORY_ADMIN_PASSWORD" \
  --release-id "$RELEASE_ID" \
  --platform android \
  --file ./dist/index.android.bundle.map \
  --bundle-file-name index.android.bundle
```

## Notes

- Expo app id, version, and build number should be read in app code from Expo Constants and passed to `AppObservatoryProvider`.
- Keep `release.id` identical between runtime config and CI registration.
- Upload both iOS and Android artifacts when both platforms are released from the same train.
- Treat this template as the maintained baseline for Expo / EAS release health integration.
