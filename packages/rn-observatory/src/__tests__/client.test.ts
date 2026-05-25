import { describe, expect, it } from 'vitest';
import { createAppObservatoryClient, MemoryObservatoryStorage } from '..';
import type { AppObservatoryEvent } from '..';

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(nextResolve => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('createAppObservatoryClient', () => {
  it('captures exceptions with breadcrumbs and flushes them', async () => {
    const delivered: AppObservatoryEvent[] = [];
    const client = await createAppObservatoryClient({
      appId: 'mobile-app',
      appVersion: '1.0.0',
      storage: new MemoryObservatoryStorage(),
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

  it('attaches release metadata to emitted events', async () => {
    const delivered: AppObservatoryEvent[] = [];
    const client = await createAppObservatoryClient({
      appId: 'mobile-app',
      appVersion: '1.2.3',
      buildNumber: '45',
      release: {
        id: 'release_20260524_001',
        channel: 'production',
        commitSha: 'abc123def456',
      },
      storage: new MemoryObservatoryStorage(),
      flushIntervalMs: 0,
      transports: [events => delivered.push(...events)],
      consent: { analytics: true },
    });
    await client.flush();
    delivered.length = 0;

    await client.trackEvent('checkout.success');
    await client.flush();

    expect(delivered).toContainEqual(
      expect.objectContaining({
        release: {
          id: 'release_20260524_001',
          channel: 'production',
          commitSha: 'abc123def456',
        },
      })
    );
  });

  it('keeps queued events when transport fails and removes them after a later flush', async () => {
    const storage = new MemoryObservatoryStorage();
    let fail = true;
    const delivered: AppObservatoryEvent[] = [];
    const client = await createAppObservatoryClient({
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
    const storage = new MemoryObservatoryStorage();
    const firstClient = await createAppObservatoryClient({ storage, flushIntervalMs: 0 });
    await firstClient.captureMessage('keep session open');

    const delivered: AppObservatoryEvent[] = [];
    const secondClient = await createAppObservatoryClient({
      storage,
      flushIntervalMs: 0,
      transports: [events => delivered.push(...events)],
    });
    await secondClient.flush();

    expect(delivered.some(event => event.type === 'previous_session_crash')).toBe(true);
  });

  it('flushes fatal exceptions immediately by default', async () => {
    const delivered: AppObservatoryEvent[] = [];
    const client = await createAppObservatoryClient({
      storage: new MemoryObservatoryStorage(),
      flushIntervalMs: 0,
      transports: [events => delivered.push(...events)],
    });
    await client.flush();
    delivered.length = 0;

    await client.captureException(new Error('fatal boom'), { level: 'fatal' });

    expect(
      delivered.some(event => event.level === 'fatal' && event.error?.message === 'fatal boom')
    ).toBe(true);
  });

  it('keeps fatal exceptions queued when immediate flush fails', async () => {
    const storage = new MemoryObservatoryStorage();
    const delivered: AppObservatoryEvent[] = [];
    const errors: unknown[] = [];
    let fail = false;
    const client = await createAppObservatoryClient({
      storage,
      flushIntervalMs: 0,
      onError: error => errors.push(error),
      transports: [
        events => {
          if (fail) throw new Error('fatal network down');
          delivered.push(...events);
        },
      ],
    });
    await client.flush();
    delivered.length = 0;

    fail = true;
    await client.captureException(new Error('fatal kept'), { level: 'fatal' });

    expect(
      errors.some(error => error instanceof Error && error.message === 'fatal network down')
    ).toBe(true);
    expect(delivered.some(event => event.error?.message === 'fatal kept')).toBe(false);

    fail = false;
    await client.flush();

    expect(delivered.some(event => event.error?.message === 'fatal kept')).toBe(true);
  });

  it('does not immediately flush non-fatal exceptions', async () => {
    const delivered: AppObservatoryEvent[] = [];
    const client = await createAppObservatoryClient({
      storage: new MemoryObservatoryStorage(),
      flushIntervalMs: 0,
      transports: [events => delivered.push(...events)],
    });
    await client.flush();
    delivered.length = 0;

    await client.captureException(new Error('non fatal boom'));

    expect(delivered.some(event => event.error?.message === 'non fatal boom')).toBe(false);

    await client.flush();

    expect(delivered.some(event => event.error?.message === 'non fatal boom')).toBe(true);
  });

  it('allows disabling fatal immediate flush', async () => {
    const delivered: AppObservatoryEvent[] = [];
    const client = await createAppObservatoryClient({
      storage: new MemoryObservatoryStorage(),
      flushIntervalMs: 0,
      flushOnFatal: false,
      transports: [events => delivered.push(...events)],
    });
    await client.flush();
    delivered.length = 0;

    await client.captureException(new Error('fatal delayed'), { level: 'fatal' });

    expect(delivered.some(event => event.error?.message === 'fatal delayed')).toBe(false);

    await client.flush();

    expect(delivered.some(event => event.error?.message === 'fatal delayed')).toBe(true);
  });

  it('prevents concurrent flushes from sending the same batch twice', async () => {
    const firstTransport = createDeferred();
    const delivered: AppObservatoryEvent[][] = [];
    const client = await createAppObservatoryClient({
      storage: new MemoryObservatoryStorage(),
      flushIntervalMs: 0,
      consent: { analytics: false },
      transports: [
        async events => {
          delivered.push([...events]);
          await firstTransport.promise;
        },
      ],
    });
    await client.flush();
    delivered.length = 0;

    await client.captureMessage('manual event');
    const flushOne = client.flush();
    const flushTwo = client.flush();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(delivered).toHaveLength(1);

    firstTransport.resolve();
    await Promise.all([flushOne, flushTwo]);

    expect(delivered).toHaveLength(1);
  });

  it('treats the first transport as authoritative and mirrors as best effort', async () => {
    const primaryDelivered: AppObservatoryEvent[] = [];
    const mirrorDelivered: AppObservatoryEvent[] = [];
    const errors: unknown[] = [];
    const storage = new MemoryObservatoryStorage();
    let mirrorShouldFail = true;
    const client = await createAppObservatoryClient({
      storage,
      flushIntervalMs: 0,
      consent: { analytics: false },
      onError: error => errors.push(error),
      transports: [
        events => primaryDelivered.push(...events),
        events => {
          mirrorDelivered.push(...events);
          if (mirrorShouldFail) throw new Error('mirror failed');
        },
      ],
    });
    await client.flush();
    primaryDelivered.length = 0;
    mirrorDelivered.length = 0;

    await client.captureMessage('manual event');
    await client.flush();

    expect(primaryDelivered).toHaveLength(1);
    expect(mirrorDelivered).toHaveLength(1);
    expect(errors.some(error => error instanceof Error && error.message === 'mirror failed')).toBe(
      true
    );
    expect(storage.getItem('rn-observatory.queue')).toBe('[]');

    mirrorShouldFail = false;

    await client.flush();

    expect(primaryDelivered).toHaveLength(1);
    expect(mirrorDelivered).toHaveLength(1);
  });
});
