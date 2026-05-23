import type { AppObservatoryReporter } from '../core/types';

export interface MonitoredFetchOptions {
  capture4xx?: boolean;
  sanitizeUrl?: (url: string) => string;
  shouldCapture?: (responseOrError: Response | unknown) => boolean;
  tags?: Record<string, string>;
}

export function createMonitoredFetch(
  fetcher: typeof fetch,
  reporter: AppObservatoryReporter,
  options: MonitoredFetchOptions = {}
): typeof fetch {
  return (async (input, init) => {
    const startedAt = Date.now();
    const method = getFetchMethod(input, init);
    const url = sanitizeFetchUrl(input, options.sanitizeUrl);

    try {
      const response = await fetcher(input, init);
      const durationMs = Date.now() - startedAt;
      if (shouldCaptureFetchResponse(response, options)) {
        await reporter.captureMessage(`HTTP ${response.status} ${method} ${url}`, {
          type: 'api_error',
          level: response.status >= 500 ? 'error' : 'warning',
          source: 'fetch',
          tags: { ...options.tags, status: String(response.status) },
          extra: { durationMs, method, status: response.status, url },
        });
      }
      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      if (shouldCaptureFetchError(error, options)) {
        await reporter.captureException(error, {
          type: 'api_error',
          level: 'error',
          source: 'fetch',
          tags: options.tags,
          extra: { durationMs, method, url },
        });
      }
      throw error;
    }
  }) as typeof fetch;
}

function shouldCaptureFetchResponse(response: Response, options: MonitoredFetchOptions) {
  if (options.shouldCapture) return options.shouldCapture(response);
  return response.status >= 500 || Boolean(options.capture4xx && response.status >= 400);
}

function shouldCaptureFetchError(error: unknown, options: MonitoredFetchOptions) {
  if (options.shouldCapture) return options.shouldCapture(error);
  return true;
}

function getFetchMethod(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request && input.method) {
    return input.method.toUpperCase();
  }
  return 'GET';
}

function sanitizeFetchUrl(input: Parameters<typeof fetch>[0], sanitizer?: (url: string) => string) {
  const rawUrl = getFetchUrl(input);
  return sanitizer ? sanitizer(rawUrl) : stripQuery(rawUrl);
}

function getFetchUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === 'string') return input;
  if (typeof URL !== 'undefined' && input instanceof URL) return input.toString();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return String(input);
}

function stripQuery(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return rawUrl.split('?')[0] ?? rawUrl;
  }
}
