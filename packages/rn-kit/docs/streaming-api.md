# Streaming API

`rn-kit` provides a lightweight streaming API foundation for React Native / Expo / Web apps.

The default transport uses Expo's streaming fetch implementation:

```ts
import { fetch } from 'expo/fetch';
```

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
  headers: {
    Authorization: `Bearer ${token}`,
  },
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
  onMessage(event, data) {
    console.log(event, data);
  },
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

## 4. Direct Expo fetch equivalent

For app code that wants the fully expanded version, this is the equivalent pattern:

```ts
import { fetch } from 'expo/fetch';
import { readApiSSEStream } from '@gaozh1024/rn-kit';

const response = await fetch('https://api.example.com/chat', {
  method: 'POST',
  headers: {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ message: 'hello' }),
});

if (!response.ok || !response.body) {
  throw new Error(`Stream request failed: ${response.status}`);
}

await readApiSSEStream(response.body, {
  parseJson: false,
  onMessage(event, data) {
    console.log(event, data);
  },
});
```

## 5. Notes

- `createApiStreamRequest` supports SSE and raw stream modes
- the default transport is `expo/fetch`; pass `fetcher` only when the app needs a custom transport
- when a custom transport cannot expose `response.body`, it falls back to a synthetic one-shot `ReadableStream`
- `readApiSSEStream` parses `event:` / `data:` frames, defaults missing events to `message`, and optionally JSON-decodes `data`
- use `abort()` or `useStreamRequest().stop()` to cancel long-running requests
