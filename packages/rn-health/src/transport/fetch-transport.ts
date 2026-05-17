import type { AppHealthEvent } from '../core/types';
import type { FetchHealthTransportOptions } from './types';

export function createFetchHealthTransport(options: FetchHealthTransportOptions) {
  return async (events: readonly AppHealthEvent[]) => {
    if (events.length === 0) return;

    const fetcher = options.fetcher ?? fetch;
    const extraHeaders =
      typeof options.headers === 'function' ? await options.headers() : (options.headers ?? {});

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (options.ingestToken && !hasAuthorizationHeader(extraHeaders)) {
      headers.authorization = `Bearer ${options.ingestToken}`;
    }

    const response = await fetcher(options.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`Health transport failed with status ${response.status}`);
    }
  };
}

function hasAuthorizationHeader(headers: Record<string, string>) {
  return Object.keys(headers).some(key => key.toLowerCase() === 'authorization');
}
