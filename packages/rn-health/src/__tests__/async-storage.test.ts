import { describe, expect, it } from 'vitest';
import { createAppHealthQueue, createAsyncStorageHealthStorage } from '..';
import type { AppHealthEvent } from '..';

function event(id: string): AppHealthEvent {
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

describe('createAsyncStorageHealthStorage', () => {
  it('adapts AsyncStorage-like objects for persistent queue storage', async () => {
    const store = new Map<string, string>();
    const storage = createAsyncStorageHealthStorage({
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, value);
      },
      removeItem: key => {
        store.delete(key);
      },
    });

    const firstQueue = createAppHealthQueue({ storage });
    await firstQueue.enqueue(event('evt_1'));

    const secondQueue = createAppHealthQueue({ storage });

    expect((await secondQueue.peek()).map(item => item.id)).toEqual(['evt_1']);

    await secondQueue.clear();
    expect(await firstQueue.size()).toBe(0);
  });
});
