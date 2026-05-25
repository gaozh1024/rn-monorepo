# App Usage Guide

This document is the recommended end-to-end usage guide for app teams using `@gaozh1024/rn-observatory`.

It is written from the perspective of a real mobile app project:

1. prepare the backend
2. integrate the SDK
3. enable analytics
4. track screens and events
5. publish with release metadata
6. upload source maps
7. inspect results in `app-observatory`

## 1. Prepare the backend

Before the app can upload any data, the `app-observatory` platform must already be running.

The backend side is responsible for:

- ingesting app events
- storing issues and raw events
- showing analytics dashboards
- registering releases
- registering source map artifacts
- symbolication

Backend project:

- `/Users/gzh/Projects/framework/app-observatory`

## 2. Create an application in the backend

In the admin console, create an application entry first.

The app team needs at least:

- `appId`
- `ingestToken`

These are required by the SDK at runtime.

## 3. Install the SDK

```bash
pnpm add @gaozh1024/rn-observatory
```

Recommended production storage:

```bash
npx expo install @react-native-async-storage/async-storage
```

## 4. Integrate at app root

Minimum production-ready integration:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from '@gaozh1024/rn-kit';
import {
  AppObservatoryProvider,
  createAsyncStorageObservatoryStorage,
} from '@gaozh1024/rn-observatory';

export default function App() {
  return (
    <AppObservatoryProvider
      enabled={!__DEV__}
      appId="your-app-id"
      appVersion="1.0.0"
      buildNumber="1"
      environment="production"
      endpoint="https://your-domain.com/api/app-observatory/events"
      ingestToken="your-ingest-token"
      storage={createAsyncStorageObservatoryStorage(AsyncStorage)}
      identity={{ autoInstallId: true }}
      consent={{
        crash: true,
        analytics: true,
        device: true,
      }}
    >
      {observatory => (
        <AppProvider enableErrorBoundary healthReporter={observatory}>
          {children}
        </AppProvider>
      )}
    </AppObservatoryProvider>
  );
}
```

This gives you:

- JavaScript error reporting
- app/session context
- queued uploads
- analytics event support
- rn-kit ErrorBoundary bridge

## 5. Critical analytics rule

`rn-observatory` defaults:

- `crash: true`
- `analytics: false`
- `device: false`

So if the app expects behavior analytics in the backend, it must explicitly enable:

```tsx
consent={{
  crash: true,
  analytics: true,
  device: true,
}}
```

If `analytics` is not enabled:

- `trackScreen()` does nothing
- `trackEvent()` does nothing

This is the most common reason the backend analytics pages appear empty.

## 6. Track page views

For React Navigation apps, prefer automatic screen tracking.

```ts
import { createNavigationObservatoryTracker } from '@gaozh1024/rn-observatory';

const tracker = createNavigationObservatoryTracker(observatory, {
  mapRouteName: route => route.name,
});

tracker.onReady(() => getCurrentRoute());
tracker.onStateChange(() => getCurrentRoute());
```

This automatically emits:

- initial `screen_view`
- route change `screen_view`

If the app does not use automatic tracking, call `trackScreen()` manually:

```ts
await observatory.trackScreen('Home');
```

## 7. Track user actions

Use `trackEvent()` for business actions:

```ts
await observatory.trackEvent('button.click', {
  screen: 'Checkout',
  target: 'submit-order',
});
```

Recommended names:

- `button.click`
- `form.submit`
- `login.success`
- `login.failed`
- `checkout.pay_tap`
- `checkout.success`

## 8. Report caught business errors

Use `captureException()` for errors you catch manually:

```ts
try {
  await submitOrder();
} catch (error) {
  await observatory.captureException(error, {
    source: 'order.submit',
    tags: { scene: 'checkout' },
  });
}
```

## 9. Use release metadata

If the app has a real release pipeline, pass release metadata so the backend can correlate each event with a concrete release.

```tsx
<AppObservatoryProvider
  appId="mobile-app"
  appVersion="1.2.3"
  buildNumber="45"
  release={{
    id: 'release_20260525_001',
    channel: 'production',
    commitSha: 'abc123def456',
  }}
  endpoint="https://api.example.com/api/app-observatory/events"
  ingestToken="your-ingest-token"
>
  {children}
</AppObservatoryProvider>
```

Recommended fields:

- `release.id`
- `release.channel`
- `release.commitSha`

Why this matters:

- release health dashboards become accurate
- issue-to-release attribution becomes stable
- source map / symbolication matching becomes reliable

## 10. Release-time workflow

At release time, do two things:

### Step A: create the release

```bash
rn-observatory-release create-release \
  --api-base https://api.example.com \
  --admin-token your-admin-token \
  --application-id app_123 \
  --version 1.2.3 \
  --build-number 45 \
  --channel production \
  --commit-sha abc123def456
```

### Step B: upload the source map

```bash
rn-observatory-release upload-sourcemap \
  --api-base https://api.example.com \
  --admin-token your-admin-token \
  --release-id rel_123 \
  --platform android \
  --file ./index.android.bundle.map \
  --bundle-file-name index.android.bundle
```

Environment fallbacks:

- `APP_OBSERVATORY_BASE_URL`
- `APP_OBSERVATORY_ADMIN_TOKEN`

## 11. What the backend can do after upload

Once the release and source map are registered:

- backend can show release health
- events can be tied to a concrete release
- source map artifacts can be listed in release detail
- issue / event detail can attempt symbolication

That means the backend can start turning:

```text
index.android.bundle:1:248392
```

into:

```text
src/features/order/CheckoutScreen.tsx:86:9
```

## 12. Web support

Supported:

- Expo Web
- React Native Web

Not recommended:

- plain React + Vite
- plain Next.js browser-only apps

Reason:

The SDK depends on `react-native` runtime APIs such as `Platform` and `AppState`.

## 13. Common troubleshooting

If analytics pages are empty:

1. `consent.analytics` is not enabled
2. no `trackScreen()` or no automatic screen tracking
3. no `trackEvent()`
4. wrong `endpoint`
5. wrong `ingestToken`
6. wrong `appId`

If release detail does not show symbolicated stack:

1. release was not created
2. source map artifact was not uploaded
3. `release.id` does not match backend release
4. wrong `platform`
5. wrong `bundleFileName`
6. stack format is not yet supported by the parser

## 14. Recommended rollout checklist

- create application in backend
- get `appId`
- get `ingestToken`
- integrate `AppObservatoryProvider`
- inject persistent storage
- enable `consent.analytics`
- enable `identity.autoInstallId`
- add automatic navigation screen tracking
- add core `trackEvent()` calls
- pass `release metadata`
- create release at publish time
- upload source map at publish time
- verify issue / event detail in backend
