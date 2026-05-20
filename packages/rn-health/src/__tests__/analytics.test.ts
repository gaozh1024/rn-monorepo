import { describe, expect, it } from 'vitest';
import { createAppHealthClient, MemoryHealthStorage } from '..';
import type { AppHealthEvent } from '..';

describe('analytics capture', () => {
  it('tracks custom analytics events when analytics consent is enabled', async () => {
    const delivered: AppHealthEvent[] = [];
    const client = await createAppHealthClient({
      consent: { analytics: true },
      flushIntervalMs: 0,
      storage: new MemoryHealthStorage(),
      transports: [events => delivered.push(...events)],
    });
    await client.flush();
    delivered.length = 0;

    await client.trackEvent('button.click', { screen: 'Home', target: 'pay' });
    await client.flush();

    expect(delivered).toContainEqual(
      expect.objectContaining({
        type: 'analytics_event',
        level: 'info',
        analytics: { name: 'button.click', properties: { screen: 'Home', target: 'pay' } },
        tags: expect.objectContaining({ source: 'analytics.event' }),
      })
    );
  });

  it('does not track analytics events when analytics consent is disabled', async () => {
    const delivered: AppHealthEvent[] = [];
    const client = await createAppHealthClient({
      consent: { analytics: false },
      flushIntervalMs: 0,
      storage: new MemoryHealthStorage(),
      transports: [events => delivered.push(...events)],
    });

    await client.trackEvent('button.click', { screen: 'Home' });
    await client.trackScreen('Home');
    await client.flush();

    expect(delivered.some(event => event.type === 'analytics_event')).toBe(false);
    expect(delivered.some(event => event.type === 'screen_view')).toBe(false);
  });

  it('tracks screen views with screen tag and properties', async () => {
    const delivered: AppHealthEvent[] = [];
    const client = await createAppHealthClient({
      consent: { analytics: true },
      flushIntervalMs: 0,
      storage: new MemoryHealthStorage(),
      transports: [events => delivered.push(...events)],
    });
    await client.flush();
    delivered.length = 0;

    await client.trackScreen('Checkout', { source: 'cart' });
    await client.flush();

    expect(delivered).toContainEqual(
      expect.objectContaining({
        type: 'screen_view',
        analytics: { name: 'screen.view', properties: { screen: 'Checkout', source: 'cart' } },
        tags: expect.objectContaining({ screen: 'Checkout', source: 'analytics.screen' }),
      })
    );
  });
});
