import { describe, expect, it, vi } from 'vitest';
import { createMonitoredFetch } from '..';
import type { AppHealthReporter } from '..';

function reporter(): AppHealthReporter {
  return {
    captureException: vi.fn(async () => undefined),
    captureMessage: vi.fn(async () => undefined),
    addBreadcrumb: vi.fn(),
    setUser: vi.fn(),
    setTags: vi.fn(),
    flush: vi.fn(async () => undefined),
  };
}

function response(status: number) {
  return new Response(null, { status });
}

describe('createMonitoredFetch', () => {
  it('captures 5xx responses without changing the response', async () => {
    const health = reporter();
    const baseFetch = vi.fn(async () => response(503)) as unknown as typeof fetch;
    const monitoredFetch = createMonitoredFetch(baseFetch, health, { tags: { api: 'orders' } });

    const result = await monitoredFetch('https://api.example.com/orders?token=secret', {
      method: 'POST',
    });

    expect(result.status).toBe(503);
    expect(health.captureMessage).toHaveBeenCalledWith(
      'HTTP 503 POST https://api.example.com/orders',
      expect.objectContaining({
        type: 'api_error',
        level: 'error',
        source: 'fetch',
        tags: { api: 'orders', status: '503' },
        extra: expect.objectContaining({
          method: 'POST',
          status: 503,
          url: 'https://api.example.com/orders',
        }),
      })
    );
  });

  it('does not capture 4xx responses by default', async () => {
    const health = reporter();
    const monitoredFetch = createMonitoredFetch(
      vi.fn(async () => response(404)) as unknown as typeof fetch,
      health
    );

    await monitoredFetch('https://api.example.com/missing');

    expect(health.captureMessage).not.toHaveBeenCalled();
  });

  it('captures 4xx responses when capture4xx is enabled', async () => {
    const health = reporter();
    const monitoredFetch = createMonitoredFetch(
      vi.fn(async () => response(404)) as unknown as typeof fetch,
      health,
      { capture4xx: true }
    );

    await monitoredFetch('https://api.example.com/missing');

    expect(health.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('HTTP 404'),
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('captures network errors and rethrows them', async () => {
    const health = reporter();
    const error = new Error('network down');
    const monitoredFetch = createMonitoredFetch(
      vi.fn(async () => {
        throw error;
      }) as unknown as typeof fetch,
      health
    );

    await expect(monitoredFetch('https://api.example.com/orders')).rejects.toThrow('network down');
    expect(health.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        type: 'api_error',
        level: 'error',
        source: 'fetch',
        extra: expect.objectContaining({ url: 'https://api.example.com/orders' }),
      })
    );
  });
});
