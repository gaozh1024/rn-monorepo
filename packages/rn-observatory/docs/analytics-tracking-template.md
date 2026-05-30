# Analytics Tracking Template

Use this template when the app wants a stable baseline for the backend’s `Analytics`, `Users & Devices`, and user/device drill-down pages.

## Root integration

```tsx
<AppObservatoryProvider
  enabled={!__DEV__}
  endpoint="https://your-domain.com/api/app-observatory/events"
  ingestToken="your-ingest-token"
  storage={createAsyncStorageObservatoryStorage(AsyncStorage)}
  identity={{ autoInstallId: true }}
  consent={{
    crash: true,
    analytics: true,
    device: true,
  }}
  deviceInfoProvider={() => ({
    model: deviceInfo.model,
    brand: deviceInfo.brand,
  })}
>
  {children}
</AppObservatoryProvider>
```

App id, version, and build number are resolved automatically from Expo metadata or the bundled React Native native metadata module. Only pass `appId`, `appVersion`, or `buildNumber` as compatibility overrides for custom runtimes.

## Navigation template

```ts
const tracker = createNavigationObservatoryTracker(observatory, {
  mapRouteName: route => route.name,
  buildProperties: ({ current, previous }) => ({
    module: inferModule(current.name),
    fromScreen: previous?.name,
  }),
});
```

## Recommended business events

```ts
await observatory.trackEvent('button.click', {
  screen: 'Checkout',
  module: 'checkout',
  scene: 'payment',
  target: 'submit-order',
});

await observatory.trackEvent('checkout.success', {
  screen: 'Checkout',
  module: 'checkout',
  scene: 'payment',
  result: 'success',
});
```

## Minimal analytics checklist

- enable `consent.analytics`
- confirm automatic app metadata is available in the target runtime
- provide `device.model` / `device.brand` when consent allows
- wire automatic `screen_view`
- instrument a small, stable business event set first

## Related docs

- `docs/event-taxonomy.md`
- `docs/analytics-schema.md`
- `docs/device-info-recipes.md`
