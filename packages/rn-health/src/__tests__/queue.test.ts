import { describe, expect, it } from 'vitest';
import { createAppHealthQueue, MemoryHealthStorage } from '..';
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

describe('createAppHealthQueue', () => {
  it('enqueues, peeks and removes events', async () => {
    const queue = createAppHealthQueue({ storage: new MemoryHealthStorage() });

    await queue.enqueue(event('a'));
    await queue.enqueue(event('b'));

    expect(await queue.size()).toBe(2);
    expect((await queue.peek(1)).map(item => item.id)).toEqual(['a']);

    await queue.remove(['a']);
    expect((await queue.peek()).map(item => item.id)).toEqual(['b']);
  });

  it('keeps the latest events when maxQueueSize is exceeded', async () => {
    const queue = createAppHealthQueue({ storage: new MemoryHealthStorage(), maxQueueSize: 2 });

    await queue.enqueue(event('a'));
    await queue.enqueue(event('b'));
    await queue.enqueue(event('c'));

    expect((await queue.peek()).map(item => item.id)).toEqual(['b', 'c']);
  });
});
