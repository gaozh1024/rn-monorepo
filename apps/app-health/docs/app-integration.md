# App Health App Integration

This document explains how a mobile app should configure App Health ingestion.

## Required Values

| Field         | Where to get it                                          | Example                                            | Notes                                                                                                                                           |
| ------------- | -------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `appId`       | Admin console -> Application Management -> App ID        | `com.llys.app.dev`                                 | Must match the registered application. Events using a different `app.id` are rejected for application tokens.                                   |
| `endpoint`    | App Health service public URL + `/api/app-health/events` | `https://health.example.com/api/app-health/events` | Use the URL reachable by the mobile app, not the admin UI URL.                                                                                  |
| `ingestToken` | Admin console -> Application detail -> Token Management  | `ah_ingest_xxx`                                    | Full token is shown only once after creation. Pass it to `AppHealthProvider.ingestToken` and store it in app config or a secure release secret. |
| `environment` | Release environment name                                 | `production`                                       | Recommended values: `production`, `staging`, `development`.                                                                                     |

## React Native Provider

Configure the app at the root of the React Native tree:

```tsx
<AppHealthProvider
  appId="com.llys.app.dev"
  endpoint="https://health.example.com/api/app-health/events"
  ingestToken="ah_ingest_xxx"
  environment="production"
>
  <App />
</AppHealthProvider>
```

Use the same `appId` that was registered in App Health. If the token belongs to
`com.llys.app.dev`, events with `app.id = "com.other.app"` will be rejected.

## Environment Mapping

Use one registered app per product app identity, and use `environment` to split
runtime tracks:

| Build                             | `appId`            | `environment` |
| --------------------------------- | ------------------ | ------------- |
| Production                        | `com.llys.app`     | `production`  |
| TestFlight / internal beta        | `com.llys.app`     | `staging`     |
| Dev build with separate bundle id | `com.llys.app.dev` | `development` |

If dev and production use different bundle IDs, register them as separate
applications. If they share the same bundle ID, keep one application and switch
only the `environment` value.

## Token Management

- Create a token in the application detail drawer.
- Copy the full token immediately; it is not displayed again after refresh.
- Do not commit real tokens to source control.
- Use different tokens for different apps or release tracks when rotation needs to be independent.
- When a token is leaked, revoke it and generate a new token.
- Disabling an application revokes active tokens and stops application-token ingestion.

## Smoke Test

After configuring a token, verify ingestion with curl:

```bash
curl -X POST https://health.example.com/api/app-health/events \
  -H 'authorization: Bearer ah_ingest_xxx' \
  -H 'content-type: application/json' \
  --data '{"events":[{"id":"evt_smoke_001","type":"custom","level":"info","timestamp":1710000000000,"app":{"id":"com.llys.app.dev","environment":"production"},"session":{"id":"sess_smoke","startedAt":1710000000000}}]}'
```

Expected result:

```json
{ "accepted": 1, "rejected": 0, "duplicated": 0 }
```

## Common Mistakes

- Using the admin UI URL as `endpoint`. The endpoint must point to the Go service.
- Typing a different `appId` in the app than the one registered in the console.
- Reusing a revoked token.
- Losing the full token after closing the creation panel. Generate a new token if this happens.
- Shipping a staging token in a production build.
- Passing `token` to `AppHealthProvider`; the SDK prop is named `ingestToken`.

## Behavior analytics integration

After the user has granted analytics consent, apps can send lightweight behavior events:

```ts
await appHealth.trackScreen('Home');
await appHealth.trackEvent('checkout.tap', { sku: 'demo' });
```

Recommended SDK setup:

```ts
<AppHealthProvider
  config={{
    endpoint: 'https://your-app-health.example.com/api/app-health/events',
    token: 'app-ingest-token',
    appId: 'com.example.app',
    identity: { autoInstallId: true, useInstallIdAsUserId: true },
    consent: {
      crash: diagnosticsConsent,
      analytics: analyticsConsent,
      device: analyticsConsent,
    },
  }}
>
  <App />
</AppHealthProvider>
```

Privacy notes:

- Use anonymous IDs unless your privacy policy explicitly allows linking to account IDs.
- Do not put sensitive personal information into `trackEvent` properties.
- `app-health` ignores client-supplied precise geo data by default. If region analytics is needed, prefer server-side coarse IP geolocation and avoid storing raw IP.
