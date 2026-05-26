# Sentry Native Crash Adapter Recipe

Use this recipe when the app already uses Sentry for native crash capture and wants to feed pending native crash reports into `rn-observatory`.

## Adapter shape

```ts
<AppObservatoryProvider
  nativeCrashAdapter={{
    install: async () => {
      await sentryNativeBridge.install();
    },
    getPendingCrashReports: async () => {
      return sentryNativeBridge.getPendingReports();
    },
    clearPendingCrashReports: async ids => {
      await sentryNativeBridge.clearReports(ids);
    },
    setUser: async user => {
      await sentryNativeBridge.setUser(user);
    },
    setTags: async tags => {
      await sentryNativeBridge.setTags(tags);
    },
  }}
/>
```

## Notes

- The exact bridge API is app-owned; `rn-observatory` only defines the adapter contract.
- Normalize each pending report into:
  - `id`
  - `timestamp`
  - `name`
  - `message`
  - `stack`
  - `extra`
- Keep Sentry’s native SDK as the source of truth for crash collection and symbol upload.

## Recommended use

- Use Sentry for native crash capture
- Use `rn-observatory` for the app-owned observability pipeline, issue correlation, release metadata, and platform analytics
