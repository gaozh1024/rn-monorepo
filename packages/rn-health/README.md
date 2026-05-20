# @gaozh1024/rn-health

App health and error monitoring SDK for Expo / React Native apps.

It captures global JavaScript errors, unhandled promise rejections, API failures, manual business exceptions, breadcrumbs, app/session health events, queued uploads, and inferred previous-session crashes. Native process crashes are intentionally adapter-based so the core package stays vendor-neutral.

## Install

```bash
pnpm add @gaozh1024/rn-health
```

Peer dependencies are provided by your app:

```bash
pnpm add react react-native
```

## Quick start with rn-kit

```tsx
import { AppProvider } from '@gaozh1024/rn-kit';
import { AppHealthProvider } from '@gaozh1024/rn-health';

export default function App() {
  return (
    <AppHealthProvider
      enabled={!__DEV__}
      appId="mobile-app"
      appVersion="1.2.3"
      buildNumber="45"
      endpoint="https://api.example.com/api/app-health/events"
      ingestToken="your-ingest-token"
    >
      {health => (
        <AppProvider enableErrorBoundary enableLogger={__DEV__} healthReporter={health}>
          <RootNavigator />
        </AppProvider>
      )}
    </AppHealthProvider>
  );
}
```

When connected to `rn-kit`, React render errors from `AppErrorBoundary` are reported through `captureException`, and logger writes become health breadcrumbs.

## Anonymous identity and consent

For behavior analytics, use a stable anonymous install ID instead of phone numbers, emails, or real names. `rn-health` can generate and persist an install ID through the configured storage adapter:

```tsx
<AppHealthProvider
  enabled={!__DEV__}
  appId="mobile-app"
  endpoint="https://api.example.com/api/app-health/events"
  ingestToken="your-ingest-token"
  storage={createAsyncStorageHealthStorage(AsyncStorage)}
  identity={{ autoInstallId: true }}
  consent={{
    crash: privacyConsent.diagnostics,
    analytics: privacyConsent.analytics,
    device: privacyConsent.analytics,
  }}
>
  {health => (
    <AppProvider enableErrorBoundary healthReporter={health}>
      {children}
    </AppProvider>
  )}
</AppHealthProvider>
```

When `identity.autoInstallId` is enabled, events are tagged with `installId`. If no `userId` is provided, the install ID is also used as the anonymous `user.id`. After login, prefer a hashed business user ID:

```ts
health.setUser({ id: `user_${hashUserId(user.id)}` });
```

After logout, switch back to the anonymous install ID if you still want anonymous diagnostics.

`consent` separates diagnostics from analytics:

- `crash`: JavaScript errors, React errors, unhandled rejections, previous-session crash inference, native crash adapter.
- `analytics`: `trackEvent`, `trackScreen`, and app lifecycle analytics events.
- `device`: optional extended device information such as model and brand.

## Behavior analytics

Use `trackScreen` for page visits and `trackEvent` for user actions. Both are no-ops unless `consent.analytics` is `true`.

```ts
const health = useAppHealth();

await health.trackScreen('Home');

await health.trackEvent('button.click', {
  screen: 'Home',
  target: 'submit-order',
});

await health.trackEvent('order.success', {
  screen: 'Checkout',
  paymentMethod: 'wechat',
});
```

Analytics events are uploaded through the same queue and transport as error events, with `type: "analytics_event"` or `type: "screen_view"` and an `analytics` payload.

## Extended device information

The core SDK does not depend on `expo-device` or `react-native-device-info`. Provide device model/brand yourself when the user has granted analytics/device consent:

```tsx
import * as Device from 'expo-device';

<AppHealthProvider
  consent={{ analytics: privacyConsent.analytics, device: privacyConsent.analytics }}
  deviceInfoProvider={() => ({
    model: Device.modelName ?? undefined,
    brand: Device.brand ?? undefined,
  })}
/>;
```

## Manual capture

```tsx
import { useAppHealth } from '@gaozh1024/rn-health';

function SubmitButton() {
  const health = useAppHealth();

  async function submit() {
    health.addBreadcrumb({ category: 'ui', message: '点击提交订单' });

    try {
      await submitOrder();
    } catch (error) {
      await health.captureException(error, {
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
POST /api/app-health/events
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

A 2xx response is treated as success. Failed uploads remain queued and are retried on later `flush()` calls. If `ingestToken` is provided, the built-in fetch transport sends `authorization: Bearer <ingestToken>` automatically; explicit `headers.authorization` takes precedence.

## Production setup checklist

For production apps, prefer the full setup below:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from '@gaozh1024/rn-kit';
import { AppHealthProvider, createAsyncStorageHealthStorage } from '@gaozh1024/rn-health';

export default function App() {
  return (
    <AppHealthProvider
      enabled={!__DEV__}
      appId="mobile-app"
      appVersion="1.2.3"
      buildNumber="45"
      environment="production"
      endpoint="https://api.example.com/api/app-health/events"
      ingestToken="your-ingest-token"
      transportTimeoutMs={10_000}
      storage={createAsyncStorageHealthStorage(AsyncStorage)}
    >
      {health => (
        <AppProvider enableErrorBoundary healthReporter={health}>
          <RootNavigator />
        </AppProvider>
      )}
    </AppHealthProvider>
  );
}
```

Production notes:

- `MemoryHealthStorage` is only for tests and demos; inject persistent storage so queued events and previous-session crash inference survive process restarts.
- When using `@gaozh1024/rn-kit`, explicitly set `enableErrorBoundary` in production if you want React render errors reported.
- Unhandled rejection capture is best-effort across React Native runtimes; it supports DOM `unhandledrejection`, global event targets, and `globalThis.onunhandledrejection` fallback when available.
- Native process crashes require `nativeCrashAdapter`; the core package stays vendor-neutral and does not include a native crash SDK.
- Source map symbolication is not included in `0.2.x`; production stack traces are uploaded raw.
- Do not upload raw authorization headers, cookies, request/response bodies, phone numbers, or tokens. Keep or customize the sanitizer.

## Persistent storage

The default `MemoryHealthStorage` is useful for tests and simple demos. Production apps should inject persistent storage so queued events and previous-session crash inference survive process restarts.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStorageHealthStorage } from '@gaozh1024/rn-health';

<AppHealthProvider storage={createAsyncStorageHealthStorage(AsyncStorage)} />;
```

## Transport timeout

The built-in fetch transport aborts uploads after `10_000ms` by default so monitoring cannot hang indefinitely behind a stuck network request. Override it with `transportTimeoutMs`, or set `0` to disable the abort timeout.

```tsx
<AppHealthProvider
  endpoint="https://api.example.com/api/app-health/events"
  transportTimeoutMs={5_000}
/>
```

## API error capture

`0.2.0` adds dependency-free helpers for API monitoring. They capture network errors and 5xx responses by default. 4xx capture is opt-in to avoid noisy user-input errors. URLs are sanitized by default by removing query strings and hashes; request/response bodies and headers are not uploaded.

### fetch

```ts
import { createMonitoredFetch, useAppHealth } from '@gaozh1024/rn-health';

function useApiFetch() {
  const health = useAppHealth();
  return createMonitoredFetch(fetch, health, {
    tags: { client: 'fetch' },
    capture4xx: false,
  });
}
```

### axios

```ts
import axios from 'axios';
import { installAxiosHealthInterceptor, type AppHealthReporter } from '@gaozh1024/rn-health';

function installApiMonitoring(health: AppHealthReporter) {
  return installAxiosHealthInterceptor(axios, health, {
    tags: { client: 'axios' },
    capture4xx: false,
  });
}
```

Call the disposer returned by `installAxiosHealthInterceptor` when the axios instance or app shell is torn down.

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
<AppHealthProvider
  sanitize={event => ({
    ...event,
    extra: undefined,
  })}
/>
```

## Native crash adapter

Pure JavaScript cannot reliably capture native process crashes after the process dies. Use `nativeCrashAdapter` to bridge Sentry, Firebase Crashlytics, or a self-hosted native crash module.

```ts
<AppHealthProvider
  nativeCrashAdapter={{
    install: () => nativeCrashSdk.install(),
    getPendingCrashReports: () => nativeCrashSdk.getPendingReports(),
    clearPendingCrashReports: ids => nativeCrashSdk.clearReports(ids),
  }}
/>
```

## Public APIs

- `AppHealthProvider`
- `useAppHealth`
- `createAppHealthClient`
- `createAppHealthQueue`
- `createFetchHealthTransport`
- `createAsyncStorageHealthStorage`
- `createMonitoredFetch`
- `installAxiosHealthInterceptor`
- `defaultAppHealthSanitizer`
- `MemoryHealthStorage`
- `installGlobalErrorHandlers`

## Notes

- `previous_session_crash` is an abnormal-exit inference, not a guaranteed native crash report.
- Do not upload raw authorization headers, request bodies, phone numbers, or tokens without a sanitizer.
- Do not block user operations on monitoring upload success.
