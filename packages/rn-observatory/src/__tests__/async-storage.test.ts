import { describe, expect, it } from 'vitest';
import { createAppObservatoryQueue, createAsyncStorageObservatoryStorage } from '..';
import type { AppObservatoryEvent } from '..';

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

describe('createAsyncStorageObservatoryStorage', () => {
  it('adapts AsyncStorage-like objects for persistent queue storage', async () => {
    const store = new Map<string, string>();
    const storage = createAsyncStorageObservatoryStorage({
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, value);
      },
      removeItem: key => {
        store.delete(key);
      },
    });

    const firstQueue = createAppObservatoryQueue({ storage });
    await firstQueue.enqueue(event('evt_1'));

    const secondQueue = createAppObservatoryQueue({ storage });

    expect((await secondQueue.peek()).map(item => item.id)).toEqual(['evt_1']);

    await secondQueue.clear();
    expect(await firstQueue.size()).toBe(0);
  });
});
