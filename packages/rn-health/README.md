# @gaozh1024/rn-health

App health and error monitoring SDK for Expo / React Native apps.

It captures global JavaScript errors, unhandled Web promise rejections, manual business exceptions, breadcrumbs, app/session health events, queued uploads, and inferred previous-session crashes. Native process crashes are intentionally adapter-based so the core package stays vendor-neutral.

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
import { AppHealthProvider } from '@gaozh1024/rn-health';

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
      storage={{
        getItem: key => AsyncStorage.getItem(key),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
        removeItem: key => AsyncStorage.removeItem(key),
      }}
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
- Native process crashes require `nativeCrashAdapter`; the core package stays vendor-neutral and does not include a native crash SDK.
- Source map symbolication is not included in `0.1.x`; production stack traces are uploaded raw.
- Do not upload raw authorization headers, cookies, request/response bodies, phone numbers, or tokens. Keep or customize the sanitizer.

## Persistent storage

The default `MemoryHealthStorage` is useful for tests and simple demos. Production apps should inject persistent storage so queued events and previous-session crash inference survive process restarts.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

<AppHealthProvider
  storage={{
    getItem: key => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: key => AsyncStorage.removeItem(key),
  }}
/>
```

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
- `defaultAppHealthSanitizer`
- `MemoryHealthStorage`
- `installGlobalErrorHandlers`

## Notes

- `previous_session_crash` is an abnormal-exit inference, not a guaranteed native crash report.
- Do not upload raw authorization headers, request bodies, phone numbers, or tokens without a sanitizer.
- Do not block user operations on monitoring upload success.
