# Analytics Recipe

Use the following conventions for behavior analytics so the backend dashboards remain stable and comparable across apps.

## Event naming

Recommended event names:

- `screen.view`
- `button.click`
- `form.submit`
- `login.success`
- `login.failed`
- `checkout.pay_tap`
- `checkout.success`

## Recommended properties

Recommended shared fields:

- `screen`
- `target`
- `module`
- `scene`
- `result`

Example:

```ts
await observatory.trackEvent('button.click', {
  screen: 'Checkout',
  target: 'submit-order',
  module: 'checkout',
  scene: 'payment',
  result: 'attempt',
});
```

## Do not upload

- passwords
- tokens
- cookies
- authorization headers
- phone numbers
- ID card numbers
- precise location

## Minimum first-batch instrumentation

- `trackScreen('Home')`
- `trackScreen('Login')`
- `trackScreen('Checkout')`
- `trackEvent('login.submit')`
- `trackEvent('login.success')`
- `trackEvent('login.failed')`
- `trackEvent('checkout.pay_tap')`
- `trackEvent('checkout.success')`
