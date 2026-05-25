# GitHub Actions Release Example

This example shows a minimal CI flow for:

1. creating a release record
2. uploading a source map artifact

It assumes:

- the app already knows its `applicationId`
- the backend exposes `app-observatory`
- the CI environment can read the generated source map file

## Example

```yaml
name: observability-release

on:
  workflow_dispatch:
  push:
    tags:
      - 'v*'

jobs:
  upload-observability-artifacts:
    runs-on: ubuntu-latest
    env:
      APP_OBSERVATORY_BASE_URL: ${{ secrets.APP_OBSERVATORY_BASE_URL }}
      APP_OBSERVATORY_ADMIN_TOKEN: ${{ secrets.APP_OBSERVATORY_ADMIN_TOKEN }}
      APPLICATION_ID: app_123
      APP_VERSION: 1.2.3
      BUILD_NUMBER: 45
      RELEASE_CHANNEL: production
      COMMIT_SHA: ${{ github.sha }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install deps
        run: pnpm install

      - name: Build app and source map
        run: |
          # Replace with your real Expo / RN build pipeline
          mkdir -p dist
          echo '{"version":3,"sources":[],"names":[],"mappings":""}' > dist/index.android.bundle.map

      - name: Create release
        id: create_release
        run: |
          node packages/rn-observatory/bin/rn-observatory-release.js create-release \
            --api-base "$APP_OBSERVATORY_BASE_URL" \
            --admin-token "$APP_OBSERVATORY_ADMIN_TOKEN" \
            --application-id "$APPLICATION_ID" \
            --version "$APP_VERSION" \
            --build-number "$BUILD_NUMBER" \
            --channel "$RELEASE_CHANNEL" \
            --commit-sha "$COMMIT_SHA" > release.json
          node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('release.json','utf8')); console.log('release_id=' + data.release.id)" >> $GITHUB_OUTPUT

      - name: Upload sourcemap
        run: |
          node packages/rn-observatory/bin/rn-observatory-release.js upload-sourcemap \
            --api-base "$APP_OBSERVATORY_BASE_URL" \
            --admin-token "$APP_OBSERVATORY_ADMIN_TOKEN" \
            --release-id "${{ steps.create_release.outputs.release_id }}" \
            --platform android \
            --file ./dist/index.android.bundle.map \
            --bundle-file-name index.android.bundle
```

## Notes

- Replace the fake source map generation step with your real Expo / React Native bundle pipeline.
- If you already have a CI-generated release ID strategy, keep it consistent with the value passed into `AppObservatoryProvider.release.id`.
- For iOS, upload the matching iOS source map with `--platform ios`.
