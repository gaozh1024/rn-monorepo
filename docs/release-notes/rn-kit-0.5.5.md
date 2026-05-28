# rn-kit 0.5.5 Release Notes

## Summary

`rn-kit 0.5.5` adds an official streaming request foundation for React Native / Expo / Web apps.

This release focuses on framework-level transport primitives rather than business-specific chat logic, so apps can build:

- SSE clients
- streaming AI/chat responses
- long-running server-side generation flows
- abortable stream requests

## Highlights

### 1. Streaming request primitives

New public APIs:

- `createApiStreamRequest`
- `readApiSSEStream`
- `useStreamRequest`

These APIs establish a stable framework surface for `ReadableStream` and SSE scenarios.

### 2. Typed input/output contracts

New types include:

- `ApiStreamProtocol`
- `ApiStreamRequestOptions`
- `ApiStreamResponse`
- `ApiSSEMessage`
- `ApiSSEReaderOptions`

### 3. Runtime fallback handling

When a runtime cannot expose `response.body`, the stream layer now falls back to a synthetic one-shot `ReadableStream` so consumer code still has a consistent interface.

### 4. Documentation

Added:

- `packages/rn-kit/docs/streaming-api.md`

Updated:

- `packages/rn-kit/README.md`

The docs explicitly describe:

- SSE usage
- abort handling
- fallback behavior
- React Native / Expo polyfill guidance

### 5. Test coverage

Added tests for:

- stream request creation
- SSE parsing
- stream hook lifecycle

## Verification

Validated with:

```bash
pnpm --dir packages/rn-kit test
pnpm --dir packages/rn-kit typecheck
pnpm --dir packages/rn-kit build
```
