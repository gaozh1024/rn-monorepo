# rn-kit 0.5.6 Release Notes

## Summary

`rn-kit 0.5.6` updates the streaming request foundation to use Expo's current `expo/fetch` streaming implementation by default.

This release keeps the existing public API shape while making Expo / React Native SSE usage closer to the platform-recommended `response.body.getReader()` workflow.

## Highlights

### 1. Expo fetch by default

`createApiStreamRequest` now imports and uses:

```ts
import { fetch } from 'expo/fetch';
```

Apps can still provide `fetcher` when they need a custom transport or test double.

### 2. SSE parser updates

`readApiSSEStream` now:

- defaults missing `event:` fields to `message`
- handles `\r\n\r\n` frame boundaries
- keeps `onEvent(message)` for structured consumers
- adds `onMessage(event, data, message)` for simple SSE callbacks

### 3. Template recipe

The Expo starter now includes:

- `templates/expo-starter/src/recipes/stream-sse.ts`

## Verification

Validated with:

```bash
pnpm --dir packages/rn-kit test
pnpm --dir packages/rn-kit typecheck
pnpm --dir packages/rn-kit build
pnpm --dir templates/expo-starter lint
```
