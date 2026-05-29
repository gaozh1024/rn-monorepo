# @gaozh1024/rn-observatory

Observability and product analytics SDK for Expo / React Native apps.

It captures global JavaScript errors, unhandled promise rejections, API failures, manual business exceptions, breadcrumbs, app/session observability events, queued uploads, and inferred previous-session crashes. Native process crashes are intentionally adapter-based so the core package stays vendor-neutral.

## Install

```bash
pnpm add @gaozh1024/rn-observatory
```

Peer dependencies are provided by your app:

```bash
pnpm add react react-native
```

## Web support

`rn-observatory` is a React Native ecosystem SDK, not a generic browser-only SDK.

- Supported: React Native iOS / Android, Expo, Expo Web, and React Native Web.
- Not recommended: plain React + Vite / Next.js browser apps that do not run through `react-native-web`.

The practical rule is simple: if your app runs on top of the React Native runtime model, `rn-observatory` can usually run there too. Web is supported through Expo Web / React Native Web because the package depends on `react-native` APIs such as `Platform` and `AppState`.

## Quick start with rn-kit

```tsx
import { AppProvider } from '@gaozh1024/rn-kit';
import { AppObservatoryProvider } from '@gaozh1024/rn-observatory';

const appMetadata = getAppMetadataFromExpoOrNativeConfig();

export default function App() {
  return (
    <AppObservatoryProvider
      enabled={!__DEV__}
      appId={appMetadata.appId}
      appVersion={appMetadata.version}
      buildNumber={appMetadata.buildNumber}
      endpoint="https://api.example.com/api/app-observatory/events"
      ingestToken="your-ingest-token"
    >
      {observatory => (
        <AppProvider enableErrorBoundary enableLogger={__DEV__} healthReporter={observatory}>
          <RootNavigator />
        </AppProvider>
      )}
    </AppObservatoryProvider>
  );
}
```

When connected to `rn-kit`, React render errors from `AppErrorBoundary` are reported through `captureException`, and logger writes become health breadcrumbs.

## Anonymous identity and consent

For behavior analytics, use a stable anonymous install ID instead of phone numbers, emails, or real names. `rn-observatory` can generate and persist an install ID through the configured storage adapter:

```tsx
<AppObservatoryProvider
  enabled={!__DEV__}
  appId="mobile-app"
  endpoint="https://api.example.com/api/app-observatory/events"
  ingestToken="your-ingest-token"
  storage={createAsyncStorageObservatoryStorage(AsyncStorage)}
  identity={{ autoInstallId: true }}
  consent={{
    crash: privacyConsent.diagnostics,
    analytics: privacyConsent.analytics,
    device: privacyConsent.analytics,
  }}
>
  {observatory => (
    <AppProvider enableErrorBoundary healthReporter={observatory}>
      {children}
    </AppProvider>
  )}
</AppObservatoryProvider>
```

When `identity.autoInstallId` is enabled, events are tagged with `installId`. If no `userId` is provided, the install ID is also used as the anonymous `user.id`. After login, prefer a hashed business user ID:

```ts
observatory.setUser({ id: `user_${hashUserId(user.id)}` });
```

After logout, switch back to the anonymous install ID if you still want anonymous diagnostics.

`consent` separates diagnostics from analytics:

- `crash`: JavaScript errors, React errors, unhandled rejections, previous-session crash inference, native crash adapter.
- `analytics`: `trackEvent`, `trackScreen`, and app lifecycle analytics events.
- `device`: optional extended device information such as model and brand.

## Behavior analytics

Use `trackScreen` for page visits and `trackEvent` for user actions. Both are no-ops unless `consent.analytics` is `true`.

```ts
const observatory = useAppObservatory();

await observatory.trackScreen('Home');

await observatory.trackEvent('button.click', {
  screen: 'Home',
  target: 'submit-order',
});

await observatory.trackEvent('order.success', {
  screen: 'Checkout',
  paymentMethod: 'wechat',
});
```

Analytics events are uploaded through the same queue and transport as error events, with `type: "analytics_event"` or `type: "screen_view"` and an `analytics` payload.

## Release metadata

If the app already has a release pipeline, attach release metadata so the backend can correlate events with a concrete release record instead of relying only on `version + buildNumber`.

```tsx
<AppObservatoryProvider
  appId={appMetadata.appId}
  appVersion={appMetadata.version}
  buildNumber={appMetadata.buildNumber}
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

For release and source map registration flow, see:

- `docs/release-integration.md`
- `docs/app-usage-guide.md`
- `docs/expo-eas-release-template.md`
- `docs/react-native-cli-release-template.md`

The current platform flow is:

1. attach `release` metadata on app events
2. create the matching release record in `app-observatory`
3. upload the source map artifact for that release
4. inspect symbolicated stack traces in Issue / Event detail views

## React Navigation screen tracking

If the app uses React Navigation, prefer automatic screen tracking instead of repeating `trackScreen()` in every page.

```ts
import { createNavigationObservatoryTracker } from '@gaozh1024/rn-observatory';

const tracker = createNavigationObservatoryTracker(observatory, {
  mapRouteName: route => route.name,
});
```

Recommended behavior:

- call `tracker.onReady(() => getCurrentRoute())` after navigation is ready
- call `tracker.onStateChange(() => getCurrentRoute())` on navigation state changes

The helper:

- sends the initial `screen_view`
- sends the next `screen_view` only when the route name changes
- automatically includes `screen`, `routeName`, and `fromScreen`

This is the preferred path for apps that already use React Navigation and want stable page analytics with less manual work.

## Extended device information

The core SDK does not depend on `expo-device` or `react-native-device-info`. Provide device model/brand yourself when the user has granted analytics/device consent:

```tsx
import * as Device from 'expo-device';

<AppObservatoryProvider
  consent={{ analytics: privacyConsent.analytics, device: privacyConsent.analytics }}
  deviceInfoProvider={() => ({
    model: Device.modelName ?? undefined,
    brand: Device.brand ?? undefined,
  })}
/>;
```

For official device-info recipes, see:

- `docs/device-info-recipes.md`
- `docs/analytics-schema.md`
- `docs/event-taxonomy.md`
- `docs/analytics-tracking-template.md`
- `docs/maintainer-governance.md`

## Manual capture

```tsx
import { useAppObservatory } from '@gaozh1024/rn-observatory';

function SubmitButton() {
  const observatory = useAppObservatory();

  async function submit() {
    observatory.addBreadcrumb({ category: 'ui', message: '点击提交订单' });

    try {
      await submitOrder();
    } catch (error) {
      await observatory.captureException(error, {
        source: 'order.submit',
        tags: { scene: 'checkout' },
      });
    }
  }
}
```

## Upload protocol

The built-in fetch transport sends batches to:

```http
POST /api/app-observatory/events
Content-Type: application/json
```

Payload:

```json
{
  "events": [
    {
      "id": "evt_xxx",
      "type": "js_error",
      "level": "error",
      "timestamp": 1710000000000,
      "app": { "id": "mobile-app", "version": "1.2.3", "buildNumber": "45" },
      "device": { "platform": "ios", "osVersion": "17.0" },
      "session": { "id": "sess_xxx", "startedAt": 1710000000000 },
      "error": { "name": "TypeError", "message": "boom", "stack": "...", "fingerprint": "fp_xxx" },
      "breadcrumbs": []
    }
  ]
}
```

A 2xx response is treated as success. Failed uploads remain queued and are retried on later `flush()` calls. If `ingestToken` is provided, the built-in fetch transport sends `authorization: Bearer <ingestToken>` automatically; explicit `headers.authorization` takes precedence. If you configure multiple transports, `rn-observatory` treats the first transport as the authoritative delivery path and sends any additional transports as best-effort mirrors so mirror failures do not cause duplicate retries on the primary path.

## Production setup checklist

For production apps, prefer the full setup below:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from '@gaozh1024/rn-kit';
import {
  AppObservatoryProvider,
  createAsyncStorageObservatoryStorage,
} from '@gaozh1024/rn-observatory';

const appMetadata = getAppMetadataFromExpoOrNativeConfig();

export default function App() {
  return (
    <AppObservatoryProvider
      enabled={!__DEV__}
      appId={appMetadata.appId}
      appVersion={appMetadata.version}
      buildNumber={appMetadata.buildNumber}
      environment="production"
      endpoint="https://api.example.com/api/app-observatory/events"
      ingestToken="your-ingest-token"
      transportTimeoutMs={10_000}
      storage={createAsyncStorageObservatoryStorage(AsyncStorage)}
    >
      {observatory => (
        <AppProvider enableErrorBoundary healthReporter={observatory}>
          <RootNavigator />
        </AppProvider>
      )}
    </AppObservatoryProvider>
  );
}
```

Production notes:

- `MemoryObservatoryStorage` is only for tests and demos; inject persistent storage so queued events and previous-session crash inference survive process restarts.
- When using `@gaozh1024/rn-kit`, explicitly set `enableErrorBoundary` in production if you want React render errors reported.
- Unhandled rejection capture is best-effort across React Native runtimes; it supports DOM `unhandledrejection`, global event targets, and `globalThis.onunhandledrejection` fallback when available.
- Native process crashes require `nativeCrashAdapter`; the core package stays vendor-neutral and does not include a native crash SDK.
- Release metadata, source map artifact upload, and backend-side symbolication are part of the current recommended production workflow when the app uses `app-observatory`.
- Do not upload raw authorization headers, cookies, request/response bodies, phone numbers, or tokens. Keep or customize the sanitizer.

## Persistent storage

The default `MemoryObservatoryStorage` is useful for tests and simple demos. Production apps should inject persistent storage so queued events and previous-session crash inference survive process restarts.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStorageObservatoryStorage } from '@gaozh1024/rn-observatory';

<AppObservatoryProvider storage={createAsyncStorageObservatoryStorage(AsyncStorage)} />;
```

## Transport timeout

The built-in fetch transport aborts uploads after `10_000ms` by default so monitoring cannot hang indefinitely behind a stuck network request. Override it with `transportTimeoutMs`, or set `0` to disable the abort timeout.

```tsx
<AppObservatoryProvider
  endpoint="https://api.example.com/api/app-observatory/events"
  transportTimeoutMs={5_000}
/>
```

## API error capture

`0.2.0` adds dependency-free helpers for API monitoring. They capture network errors and 5xx responses by default. 4xx capture is opt-in to avoid noisy user-input errors. URLs are sanitized by default by removing query strings and hashes; request/response bodies and headers are not uploaded.

### fetch

```ts
import { createMonitoredFetch, useAppObservatory } from '@gaozh1024/rn-observatory';

function useApiFetch() {
  const observatory = useAppObservatory();
  return createMonitoredFetch(fetch, observatory, {
    tags: { client: 'fetch' },
    capture4xx: false,
  });
}
```

### axios

```ts
import axios from 'axios';
import {
  installAxiosObservatoryInterceptor,
  type AppObservatoryReporter,
} from '@gaozh1024/rn-observatory';

function installApiMonitoring(observatory: AppObservatoryReporter) {
  return installAxiosObservatoryInterceptor(axios, observatory, {
    tags: { client: 'axios' },
    capture4xx: false,
  });
}
```

Call the disposer returned by `installAxiosObservatoryInterceptor` when the axios instance or app shell is torn down.

## Sanitization

The default sanitizer recursively redacts keys containing:

- `password`
- `token`
- `accessToken`
- `refreshToken`
- `authorization`
- `cookie`
- `phone`
- `idCard`
- `email`

You can provide a custom sanitizer:

```ts
<AppObservatoryProvider
  sanitize={event => ({
    ...event,
    extra: undefined,
  })}
/>
```

## Native crash adapter

Pure JavaScript cannot reliably capture native process crashes after the process dies. Use `nativeCrashAdapter` to bridge Sentry, Firebase Crashlytics, or a self-hosted native crash module.

```ts
<AppObservatoryProvider
  nativeCrashAdapter={{
    install: () => nativeCrashSdk.install(),
    getPendingCrashReports: () => nativeCrashSdk.getPendingReports(),
    clearPendingCrashReports: ids => nativeCrashSdk.clearReports(ids),
  }}
/>
```

Official adapter guidance:

- `docs/native-crash-adapters.md`
- `docs/sentry-native-crash-recipe.md`
- `docs/crashlytics-native-crash-recipe.md`
- `docs/native-crash-bridge-template.md`

## Public APIs

- `AppObservatoryProvider`
- `useAppObservatory`
- `createAppObservatoryClient`
- `appObservatoryEventTypes`
- `appObservatoryLifecycleEventTypes`
- `appObservatoryErrorEventTypes`
- `appObservatoryAnalyticsEventTypes`
- `appObservatoryCustomEventTypes`
- `createAppObservatoryQueue`
- `createFetchObservatoryTransport`
- `createAsyncStorageObservatoryStorage`
- `createMonitoredFetch`
- `installAxiosObservatoryInterceptor`
- `defaultAppObservatorySanitizer`
- `MemoryObservatoryStorage`
- `installGlobalErrorHandlers`

## Notes

- `previous_session_crash` is an abnormal-exit inference, not a guaranteed native crash report.
- Do not upload raw authorization headers, request bodies, phone numbers, or tokens without a sanitizer.
- Do not block user operations on monitoring upload success.
- Keep the SDK aligned with the platform’s three long-term lanes: `Analytics`, `Release / Symbolication`, and `Crash / Alerts`.
- Maintainers can synchronize the current canonical event taxonomy into `app-observatory` with `pnpm --dir packages/rn-observatory sync:taxonomy`.
- Maintainers can verify cross-repo event taxonomy alignment with `pnpm --dir packages/rn-observatory verify:taxonomy`.
