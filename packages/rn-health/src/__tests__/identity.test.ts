import { describe, expect, it } from 'vitest';
import {
  createAppHealthClient,
  getOrCreateInstallId,
  MemoryHealthStorage,
  type AppHealthEvent,
} from '..';

describe('install identity', () => {
  it('creates and reuses a stable install id in storage', async () => {
    const storage = new MemoryHealthStorage();
    const first = await getOrCreateInstallId(storage);
    const second = await getOrCreateInstallId(storage);

    expect(first).toMatch(/^inst_/);
    expect(second).toBe(first);
  });

  it('uses install id as anonymous user id when configured', async () => {
    const delivered: AppHealthEvent[] = [];
    const storage = new MemoryHealthStorage();
    const client = await createAppHealthClient({
      consent: { analytics: true },
      flushIntervalMs: 0,
      identity: { autoInstallId: true },
      storage,
      transports: [events => delivered.push(...events)],
    });
    await client.flush();
    delivered.length = 0;

    await client.trackEvent('app.action');
    await client.flush();

    const event = delivered.find(item => item.type === 'analytics_event');
    expect(event?.user?.id).toMatch(/^inst_/);
    expect(event?.tags?.installId).toBe(event?.user?.id);
  });

  it('lets explicit userId override install id', async () => {
    const delivered: AppHealthEvent[] = [];
    const client = await createAppHealthClient({
      consent: { analytics: true },
      flushIntervalMs: 0,
      identity: { autoInstallId: true },
      storage: new MemoryHealthStorage(),
      transports: [events => delivered.push(...events)],
      userId: 'user_hash_1',
    });
    await client.flush();
    delivered.length = 0;

    await client.trackEvent('app.action');
    await client.flush();

    const event = delivered.find(item => item.type === 'analytics_event');
    expect(event?.user?.id).toBe('user_hash_1');
    expect(event?.tags?.installId).toMatch(/^inst_/);
  });
});
