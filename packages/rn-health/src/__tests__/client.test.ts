import { describe, expect, it } from 'vitest';
import { createAppHealthClient, MemoryHealthStorage } from '..';
import type { AppHealthEvent } from '..';

describe('createAppHealthClient', () => {
  it('captures exceptions with breadcrumbs and flushes them', async () => {
    const delivered: AppHealthEvent[] = [];
    const client = await createAppHealthClient({
      appId: 'mobile-app',
      appVersion: '1.0.0',
      storage: new MemoryHealthStorage(),
      flushIntervalMs: 0,
      transports: [events => delivered.push(...events)],
    });

    client.addBreadcrumb({ category: 'ui', message: 'tap submit' });
    await client.captureException(new TypeError('boom'), {
      source: 'checkout',
      componentStack: 'CheckoutScreen',
      tags: { scene: 'submit' },
    });
    await client.flush();

    const errorEvent = delivered.find(event => event.error?.message === 'boom');
    expect(errorEvent).toMatchObject({
      type: 'js_error',
      level: 'error',
      app: { id: 'mobile-app', version: '1.0.0' },
      error: { name: 'TypeError', message: 'boom', componentStack: 'CheckoutScreen' },
      breadcrumbs: [{ category: 'ui', message: 'tap submit' }],
      tags: { scene: 'submit', source: 'checkout' },
    });
    expect(errorEvent?.error?.fingerprint).toMatch(/^fp_/);
  });

  it('keeps queued events when transport fails and removes them after a later flush', async () => {
    const storage = new MemoryHealthStorage();
    let fail = true;
    const delivered: AppHealthEvent[] = [];
    const client = await createAppHealthClient({
      storage,
      flushIntervalMs: 0,
      onError: () => undefined,
      transports: [
        events => {
          if (fail) throw new Error('network down');
          delivered.push(...events);
        },
      ],
    });

    await client.captureMessage('manual event');
    await client.flush();

    fail = false;
    await client.flush();

    expect(
      delivered.some(event => event.type === 'custom' && event.tags?.source === 'message')
    ).toBe(true);
  });

  it('reports previous ungraceful session on next startup', async () => {
    const storage = new MemoryHealthStorage();
    const firstClient = await createAppHealthClient({ storage, flushIntervalMs: 0 });
    await firstClient.captureMessage('keep session open');

    const delivered: AppHealthEvent[] = [];
    const secondClient = await createAppHealthClient({
      storage,
      flushIntervalMs: 0,
      transports: [events => delivered.push(...events)],
    });
    await secondClient.flush();

    expect(delivered.some(event => event.type === 'previous_session_crash')).toBe(true);
  });
});
