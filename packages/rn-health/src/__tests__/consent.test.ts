import { describe, expect, it, vi } from 'vitest';
import { createAppHealthClient, MemoryHealthStorage, type AppHealthEvent } from '..';

describe('consent controls', () => {
  it('does not capture exceptions when crash consent is disabled', async () => {
    const delivered: AppHealthEvent[] = [];
    const client = await createAppHealthClient({
      consent: { crash: false },
      flushIntervalMs: 0,
      storage: new MemoryHealthStorage(),
      transports: [events => delivered.push(...events)],
    });

    await client.captureException(new Error('private boom'));
    await client.flush();

    expect(delivered.some(event => event.error?.message === 'private boom')).toBe(false);
  });

  it('collects extended device info only with device consent', async () => {
    const withDevice: AppHealthEvent[] = [];
    const withoutDevice: AppHealthEvent[] = [];
    const provider = vi.fn(() => ({ brand: 'Apple', model: 'iPhone 15 Pro' }));

    const denied = await createAppHealthClient({
      consent: { analytics: true, device: false },
      deviceInfoProvider: provider,
      flushIntervalMs: 0,
      storage: new MemoryHealthStorage(),
      transports: [events => withoutDevice.push(...events)],
    });
    await denied.flush();
    withoutDevice.length = 0;
    await denied.trackEvent('device.denied');
    await denied.flush();

    const allowed = await createAppHealthClient({
      consent: { analytics: true, device: true },
      deviceInfoProvider: provider,
      flushIntervalMs: 0,
      storage: new MemoryHealthStorage(),
      transports: [events => withDevice.push(...events)],
    });
    await allowed.flush();
    withDevice.length = 0;
    await allowed.trackEvent('device.allowed');
    await allowed.flush();

    expect(
      withoutDevice.find(event => event.type === 'analytics_event')?.device.model
    ).toBeUndefined();
    expect(withDevice.find(event => event.type === 'analytics_event')?.device).toMatchObject({
      brand: 'Apple',
      model: 'iPhone 15 Pro',
    });
    expect(provider).toHaveBeenCalledTimes(1);
  });
});
