# Native Crash Adapters

`rn-observatory` captures JavaScript errors directly, but native process crashes require an adapter.

The maintained pattern is:

1. let a native crash SDK collect the crash
2. expose pending crash reports to JavaScript on next launch
3. pass those reports through `nativeCrashAdapter`

The core adapter surface is:

```ts
nativeCrashAdapter={{
  install: async () => { ... },
  getPendingCrashReports: async () => [
    {
      id: 'native_report_1',
      timestamp: Date.now(),
      name: 'NativeCrash',
      message: 'segmentation fault',
      stack: '...',
      extra: { sdk: 'sentry' },
    },
  ],
  clearPendingCrashReports: async ids => { ... },
  setUser: async user => { ... },
  setTags: async tags => { ... },
}}
```

## Required report fields

Each pending report should provide:

- `id`
- `message`

Recommended:

- `timestamp`
- `name`
- `stack`
- `extra`

## Official recipes

- `docs/sentry-native-crash-recipe.md`
- `docs/crashlytics-native-crash-recipe.md`

## Operational rules

- Treat native crash reports as fatal events
- Clear reports only after they are successfully handed to the SDK bridge
- Keep the adapter vendor-specific and keep `rn-observatory` vendor-neutral
