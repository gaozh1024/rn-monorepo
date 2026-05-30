import { fetch as expoFetch } from 'expo/fetch';
import { createApiStreamRequest, readApiSSEStream } from '@gaozh1024/rn-kit';

export interface StreamSseOptions {
  url: string;
  token: string;
  body: unknown;
  onMessage: (event: string, data: string) => void;
}

export async function streamSse({ url, token, body, onMessage }: StreamSseOptions) {
  const request = await createApiStreamRequest(url, {
    method: 'POST',
    protocol: 'sse',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  await readApiSSEStream(request.stream, {
    parseJson: false,
    onMessage,
  });
}

export async function streamSseWithExpoFetch({ url, token, body, onMessage }: StreamSseOptions) {
  const response = await expoFetch(url, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream request failed: ${response.status}`);
  }

  await readApiSSEStream(response.body, {
    parseJson: false,
    onMessage,
  });
}
