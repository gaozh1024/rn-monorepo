# Streaming API

`rn-kit` now provides a lightweight streaming API foundation for React Native / Expo / Web apps.

It is designed for:

- SSE (`text/event-stream`)
- incremental chat / AI output
- long-running server-side generation
- stream cancellation through `AbortController`

## Public APIs

- `createApiStreamRequest`
- `readApiSSEStream`
- `useStreamRequest`

## 1. Create a streaming request

```ts
import { createApiStreamRequest } from '@gaozh1024/rn-kit';

const request = await createApiStreamRequest('https://api.example.com/chat', {
  method: 'POST',
  protocol: 'sse',
  body: {
    message: 'hello',
  },
});
```

Return shape:

```ts
{
  stream: ReadableStream<Uint8Array>;
  response: Response;
  abort: () => void;
}
```

## 2. Read SSE events

```ts
import { readApiSSEStream } from '@gaozh1024/rn-kit';

await readApiSSEStream(request.stream, {
  onEvent(message) {
    console.log(message.event, message.data);
  },
  onDone() {
    console.log('stream done');
  },
});
```

## 3. Hook usage

```ts
import { createApiStreamRequest, useStreamRequest } from '@gaozh1024/rn-kit';

const streamRequest = useStreamRequest(async () => {
  const request = await createApiStreamRequest('https://api.example.com/chat', {
    method: 'POST',
    protocol: 'sse',
    body: { message: 'hello' },
  });

  return {
    data: request.stream,
    abort: request.abort,
  };
});
```

## 4. React Native / Expo polyfill note

For React Native / Expo apps, streaming usually requires the runtime to support:

- `fetch`
- `ReadableStream`
- `TextDecoder`

In many apps this means adding a polyfill similar to:

```ts
import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch';
import { polyfill as polyfillReadable } from 'react-native-polyfill-globals/src/readable-stream';
import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding';

polyfillFetch();
polyfillReadable();
polyfillEncoding();
```

## 5. Notes

- `createApiStreamRequest` supports SSE and raw stream modes
- when native streaming is unavailable, it falls back to a synthetic one-shot `ReadableStream`
- `readApiSSEStream` parses `event:` / `data:` frames and optionally JSON-decodes `data`
- use `abort()` or `useStreamRequest().stop()` to cancel long-running requests
