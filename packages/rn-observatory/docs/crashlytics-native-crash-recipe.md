# Firebase Crashlytics Native Crash Adapter Recipe

Use this recipe when the app already uses Firebase Crashlytics for native crash collection and wants to bridge pending crash reports into `rn-observatory`.

## Adapter shape

```ts
<AppObservatoryProvider
  nativeCrashAdapter={{
    install: async () => {
      await crashlyticsBridge.install();
    },
    getPendingCrashReports: async () => {
      return crashlyticsBridge.getPendingReports();
    },
    clearPendingCrashReports: async ids => {
      await crashlyticsBridge.clearReports(ids);
    },
    setUser: async user => {
      await crashlyticsBridge.setUser(user);
    },
    setTags: async tags => {
      await crashlyticsBridge.setTags(tags);
    },
  }}
/>
```

## Notes

- The native bridge implementation belongs to the app; `rn-observatory` only expects the adapter contract.
- Normalize each pending report into:
  - `id`
  - `timestamp`
  - `name`
  - `message`
  - `stack`
  - `extra`
- Keep Crashlytics as the native crash collector and native-symbol upload owner.

## Recommended use

- Use Crashlytics for native crash capture
- Use `rn-observatory` to unify JS errors, analytics, release metadata, and backend issue correlation
