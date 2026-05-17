import { describe, expect, it, vi } from 'vitest';
import { createFetchHealthTransport } from '..';
import type { AppHealthEvent } from '..';

const event: AppHealthEvent = {
  id: 'evt',
  type: 'custom',
  level: 'info',
  timestamp: 1,
  app: {},
  device: { platform: 'ios' },
  session: { id: 'sess', startedAt: 1 },
};

describe('createFetchHealthTransport', () => {
  it('posts events to endpoint', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 202 })) as unknown as typeof fetch;
    const transport = createFetchHealthTransport({
      endpoint: 'https://example.com/events',
      fetcher,
    });

    await transport([event]);

    expect(fetcher).toHaveBeenCalledWith(
      'https://example.com/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ events: [event] }),
      })
    );
  });

  it('throws on non-ok response', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
    const transport = createFetchHealthTransport({
      endpoint: 'https://example.com/events',
      fetcher,
    });

    await expect(transport([event])).rejects.toThrow('Health transport failed with status 500');
  });

  it('uses ingestToken as bearer authorization', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 202 })) as unknown as typeof fetch;
    const transport = createFetchHealthTransport({
      endpoint: 'https://example.com/events',
      ingestToken: 'ingest_123',
      fetcher,
    });

    await transport([event]);

    expect(fetcher).toHaveBeenCalledWith(
      'https://example.com/events',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer ingest_123' }),
      })
    );
  });

  it('lets explicit authorization headers override ingestToken', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 202 })) as unknown as typeof fetch;
    const transport = createFetchHealthTransport({
      endpoint: 'https://example.com/events',
      ingestToken: 'ingest_123',
      headers: { authorization: 'Bearer custom' },
      fetcher,
    });

    await transport([event]);

    expect(fetcher).toHaveBeenCalledWith(
      'https://example.com/events',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer custom' }),
      })
    );
  });

  it('supports async headers with ingestToken fallback', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 202 })) as unknown as typeof fetch;
    const transport = createFetchHealthTransport({
      endpoint: 'https://example.com/events',
      ingestToken: 'ingest_123',
      headers: async () => ({ 'x-app': 'mobile-app' }),
      fetcher,
    });

    await transport([event]);

    expect(fetcher).toHaveBeenCalledWith(
      'https://example.com/events',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer ingest_123',
          'x-app': 'mobile-app',
        }),
      })
    );
  });
});
