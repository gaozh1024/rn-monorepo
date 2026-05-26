# Analytics Schema

This document defines the maintained analytics contract for `rn-observatory` when data is intended for `app-observatory`.

The goal is not to force every app into one taxonomy, but to keep the platform’s three analytics-heavy backend surfaces stable:

- `Analytics`
- `Users & Devices`
- `User / Device detail drill-down`

## 1. Core event types

Use these runtime event types consistently:

- `screen_view`
- `analytics_event`

Related lifecycle / crash event types that the platform also understands:

- `app_start`
- `app_ready` (reserved for app-shell readiness if the app explicitly emits it)
- `app_background`
- `app_foreground`
- `js_error`
- `react_error`
- `unhandled_rejection`
- `previous_session_crash`
- `native_crash`
- `api_error`
- `custom`

The backend already consumes:

- `screen_view` for page visits
- `analytics.name` such as `screen.view`, `button.click`, `checkout.success` for behavior analysis

## 2. Screen events

Recommended shape:

```ts
await observatory.trackScreen('Checkout', {
  module: 'checkout',
  scene: 'payment',
});
```

Expected outcome:

- `type = "screen_view"`
- `analytics.name = "screen.view"`
- `analytics.properties.screen = "Checkout"`

Recommended screen properties:

- `screen` — stable business-facing page name
- `module` — feature area such as `checkout`, `order`, `profile`
- `scene` — sub-context inside the module
- `fromScreen` — previous screen when available

Prefer stable business names over component names.

Good:

- `Home`
- `Checkout`
- `OrderDetail`

Avoid:

- `HomeScreenV2`
- `CheckoutContainer`
- `OrderDetailPageImpl`

## 3. Business events

Use `trackEvent()` for user actions and business outcomes.

Recommended naming style:

- `button.click`
- `form.submit`
- `login.success`
- `login.failed`
- `checkout.pay_tap`
- `checkout.success`
- `order.cancel_confirm`

Recommended properties:

- `screen`
- `module`
- `scene`
- `target`
- `result`
- `sku` / `orderId` / domain identifier only when privacy-safe

Example:

```ts
await observatory.trackEvent('button.click', {
  screen: 'Checkout',
  module: 'checkout',
  scene: 'payment',
  target: 'submit-order',
});
```

## 4. User and device identity

For the backend’s `Users & Devices` pages to stay useful, prefer:

- anonymous `user.id` or install ID
- `app.appVersion`
- `app.buildNumber`
- `device.platform`
- `device.model`
- `device.brand`

Recommended anonymous identity strategy:

- before login: use install ID
- after login: use hashed/stable business user ID
- after logout: fall back to anonymous install ID

## 5. Recommended device fields

The core SDK always provides:

- `device.platform`
- `device.osVersion`

Production apps should usually also provide:

- `device.model`
- `device.brand`

See:

- `docs/device-info-recipes.md`

## 6. Privacy rules

Do not upload:

- password
- token
- authorization
- cookie
- raw request/response body
- phone
- email
- idCard

If a property is not clearly safe, keep it out of analytics events and route it through product review first.

## 7. Why this schema matters

Keeping this contract stable directly improves:

- screen stats in the backend
- user/device drill-down quality
- event filtering consistency
- release-to-behavior correlation

If an app wants to extend the event taxonomy, treat this file as the baseline and document the extension explicitly.
