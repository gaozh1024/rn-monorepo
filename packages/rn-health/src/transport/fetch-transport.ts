import type { AppHealthEvent } from '../core/types';
import type { FetchHealthTransportOptions } from './types';

const DEFAULT_TIMEOUT_MS = 10_000;

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

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const canAbort = timeoutMs > 0 && typeof AbortController !== 'undefined';
    const controller = canAbort ? new AbortController() : undefined;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

    try {
      const response = await fetcher(options.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events }),
        signal: controller?.signal,
      });

      if (!response.ok) {
        throw new Error(`Health transport failed with status ${response.status}`);
      }
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  };
}

function hasAuthorizationHeader(headers: Record<string, string>) {
  return Object.keys(headers).some(key => key.toLowerCase() === 'authorization');
}
