import { describe, expect, it, vi } from 'vitest';
import { createApiStreamRequest } from '../../api/stream';

describe('createApiStreamRequest', () => {
  it('creates an SSE stream request with the expected headers', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: hello\n\n'));
        controller.close();
      },
    });

    const fetcher = vi.fn(async () => new Response(stream, { status: 200 }));

    const result = await createApiStreamRequest('https://api.example.com/stream', {
      method: 'POST',
      protocol: 'sse',
      body: { hello: 'world' },
      fetcher,
    });

    expect(result.stream).toBeDefined();
    expect(result.abort).toBeTypeOf('function');

    const [, init] = fetcher.mock.calls[0]!;
    const headers = new Headers(init?.headers);

    expect(init?.method).toBe('POST');
    expect(headers.get('accept')).toBe('text/event-stream');
    expect(headers.get('content-type')).toBe('application/json');
    expect(init?.body).toBe(JSON.stringify({ hello: 'world' }));
  });

  it('falls back to a synthetic stream when response.body is unavailable', async () => {
    const response = {
      ok: true,
      status: 200,
      body: null,
      text: vi.fn(async () => 'data: fallback\n\n'),
    } as unknown as Response;

    const fetcher = vi.fn(async () => response);

    const result = await createApiStreamRequest('https://api.example.com/stream', {
      protocol: 'sse',
      fetcher,
    });

    const reader = result.stream.getReader();
    const { value, done } = await reader.read();
    expect(done).toBe(false);
    expect(new TextDecoder().decode(value)).toContain('data: fallback');
    reader.releaseLock();
  });

  it('throws on non-2xx responses', async () => {
    const fetcher = vi.fn(async () => new Response('nope', { status: 500 }));

    await expect(
      createApiStreamRequest('https://api.example.com/stream', {
        fetcher,
      })
    ).rejects.toThrow('Stream request failed with status 500');
  });
});
