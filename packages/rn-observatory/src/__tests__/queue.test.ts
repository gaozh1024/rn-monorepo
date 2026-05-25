import { describe, expect, it } from 'vitest';
import { createAppObservatoryQueue, MemoryObservatoryStorage } from '..';
import type { AppObservatoryEvent, AppObservatoryStorageAdapter } from '..';

function event(id: string): AppObservatoryEvent {
  return {
    id,
    type: 'custom',
    level: 'info',
    timestamp: 1,
    app: {},
    device: { platform: 'ios' },
    session: { id: 'sess', startedAt: 1 },
  };
}

class SlowMemoryStorage implements AppObservatoryStorageAdapter {
  private readonly store = new Map<string, string>();

  async getItem(key: string) {
    await Promise.resolve();
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string) {
    await Promise.resolve();
    this.store.set(key, value);
  }

  async removeItem(key: string) {
    await Promise.resolve();
    this.store.delete(key);
  }
}

describe('createAppObservatoryQueue', () => {
  it('enqueues, peeks and removes events', async () => {
    const queue = createAppObservatoryQueue({ storage: new MemoryObservatoryStorage() });

    await queue.enqueue(event('a'));
    await queue.enqueue(event('b'));

    expect(await queue.size()).toBe(2);
    expect((await queue.peek(1)).map(item => item.id)).toEqual(['a']);

    await queue.remove(['a']);
    expect((await queue.peek()).map(item => item.id)).toEqual(['b']);
  });

  it('keeps the latest events when maxQueueSize is exceeded', async () => {
    const queue = createAppObservatoryQueue({
      storage: new MemoryObservatoryStorage(),
      maxQueueSize: 2,
    });

    await queue.enqueue(event('a'));
    await queue.enqueue(event('b'));
    await queue.enqueue(event('c'));

    expect((await queue.peek()).map(item => item.id)).toEqual(['b', 'c']);
  });

  it('serializes concurrent enqueue operations', async () => {
    const queue = createAppObservatoryQueue({ storage: new SlowMemoryStorage() });

    await Promise.all([
      queue.enqueue(event('a')),
      queue.enqueue(event('b')),
      queue.enqueue(event('c')),
    ]);

    expect((await queue.peek()).map(item => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('preserves newer events while removing older ones concurrently', async () => {
    const queue = createAppObservatoryQueue({ storage: new SlowMemoryStorage() });

    await queue.enqueue(event('a'));
    await queue.enqueue(event('b'));

    await Promise.all([queue.remove(['a']), queue.enqueue(event('c'))]);

    expect((await queue.peek()).map(item => item.id)).toEqual(['b', 'c']);
  });
});
