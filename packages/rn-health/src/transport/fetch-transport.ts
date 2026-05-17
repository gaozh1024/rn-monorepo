import type { AppHealthEvent } from '../core/types';
import type { FetchHealthTransportOptions } from './types';

export function createFetchHealthTransport(options: FetchHealthTransportOptions) {
  return async (events: readonly AppHealthEvent[]) => {
    if (events.length === 0) return;

    const fetcher = options.fetcher ?? fetch;
    const extraHeaders =
      typeof options.headers === 'function' ? await options.headers() : (options.headers ?? {});

    const response = await fetcher(options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`Health transport failed with status ${response.status}`);
    }
  };
}
