# Analytics Tracking Template

Use this template when the app wants a stable baseline for the backend’s `Analytics`, `Users & Devices`, and user/device drill-down pages.

## Root integration

```tsx
<AppObservatoryProvider
  enabled={!__DEV__}
  appId={appMetadata.appId}
  appVersion={appMetadata.version}
  buildNumber={appMetadata.buildNumber}
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

`appMetadata` should come from the app’s own metadata source, such as Expo Constants, React Native CLI `BuildConfig`, `react-native-config`, or CI-generated release constants. Do not hand-maintain these values in the observability setup.

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
- provide stable `appVersion` from app metadata
- provide stable `buildNumber` from app metadata
- provide `device.model` / `device.brand` when consent allows
- wire automatic `screen_view`
- instrument a small, stable business event set first

## Related docs

- `docs/event-taxonomy.md`
- `docs/analytics-schema.md`
- `docs/device-info-recipes.md`
