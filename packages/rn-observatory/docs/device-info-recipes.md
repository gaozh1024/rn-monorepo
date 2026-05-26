# Device Info Recipes

`rn-observatory` always sends:

- `device.platform`
- `device.osVersion`

For the backend’s `Users & Devices` and analytics distribution pages, production apps usually also want:

- `device.model`
- `device.brand`

This document provides maintained recipes for common app stacks.

## 1. Expo Device recipe

```tsx
import * as Device from 'expo-device';

<AppObservatoryProvider
  consent={{
    analytics: privacyConsent.analytics,
    device: privacyConsent.analytics,
  }}
  deviceInfoProvider={() => ({
    model: Device.modelName ?? undefined,
    brand: Device.brand ?? undefined,
  })}
/>;
```

Use this when the app already depends on Expo modules.

## 2. react-native-device-info recipe

```tsx
import DeviceInfo from 'react-native-device-info';

<AppObservatoryProvider
  consent={{
    analytics: privacyConsent.analytics,
    device: privacyConsent.analytics,
  }}
  deviceInfoProvider={async () => ({
    model: await DeviceInfo.getModel(),
    brand: await DeviceInfo.getBrand(),
  })}
/>;
```

Use this when the app is not Expo-first and already has native modules available.

## 3. Minimal custom recipe

If the app already computes device info elsewhere, pass it through directly:

```tsx
<AppObservatoryProvider
  consent={{
    analytics: privacyConsent.analytics,
    device: privacyConsent.analytics,
  }}
  deviceInfoProvider={() => ({
    model: appDeviceContext.model,
    brand: appDeviceContext.brand,
  })}
/>
```

## 4. Recommendation

For stable backend analytics, aim to keep these fields present and consistent:

- `appVersion`
- `buildNumber`
- `device.platform`
- `device.model`
- `device.brand`

If the user has not granted analytics/device consent, do not collect the extra model/brand fields.
