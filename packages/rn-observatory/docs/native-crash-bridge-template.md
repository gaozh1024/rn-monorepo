# Native Crash Bridge Template

Use this template when the app already has a native crash SDK and wants a minimal bridge into `rn-observatory`.

## JavaScript side

```tsx
<AppObservatoryProvider
  nativeCrashAdapter={{
    install: async () => {
      await nativeCrashBridge.install();
    },
    getPendingCrashReports: async () => {
      return nativeCrashBridge.getPendingReports();
    },
    clearPendingCrashReports: async ids => {
      await nativeCrashBridge.clearReports(ids);
    },
    setUser: async user => {
      await nativeCrashBridge.setUser(user);
    },
    setTags: async tags => {
      await nativeCrashBridge.setTags(tags);
    },
  }}
>
  {children}
</AppObservatoryProvider>
```

## Expected bridge payload

Each pending report should normalize to:

```ts
{
  id: 'native_report_xxx',
  timestamp: Date.now(),
  name: 'NativeCrash',
  message: 'fatal signal',
  stack: 'optional native stack text',
  extra: {
    sdk: 'your-native-sdk',
    platform: 'ios',
  },
}
```

## Operational rules

- Treat pending reports as one-shot replay artifacts on next launch
- Clear them only after successful handoff
- Keep vendor-native crash collection and symbol upload owned by the native SDK

## Related docs

- `docs/native-crash-adapters.md`
- `docs/sentry-native-crash-recipe.md`
- `docs/crashlytics-native-crash-recipe.md`
