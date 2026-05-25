import type { AppObservatoryEvent, AppObservatoryStorageAdapter } from '../core/types';
import { defaultObservatoryStorage } from './storage';

export interface AppObservatoryQueueOptions {
  storage?: AppObservatoryStorageAdapter;
  storageKey?: string;
  maxQueueSize?: number;
}

export interface AppObservatoryQueue {
  enqueue: (event: AppObservatoryEvent) => Promise<void>;
  peek: (batchSize?: number) => Promise<AppObservatoryEvent[]>;
  remove: (ids: readonly string[]) => Promise<void>;
  clear: () => Promise<void>;
  size: () => Promise<number>;
}

const DEFAULT_STORAGE_KEY = 'rn-observatory.queue';
const DEFAULT_MAX_QUEUE_SIZE = 100;

export function createAppObservatoryQueue(
  options: AppObservatoryQueueOptions = {}
): AppObservatoryQueue {
  const storage = options.storage ?? defaultObservatoryStorage;
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
  let pendingOperation = Promise.resolve();

  function runExclusive<T>(task: () => Promise<T>) {
    const nextOperation = pendingOperation.then(task, task);
    pendingOperation = nextOperation.then(
      () => undefined,
      () => undefined
    );
    return nextOperation;
  }

  async function readQueue() {
    const raw = await storage.getItem(storageKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as AppObservatoryEvent[]) : [];
    } catch {
      return [];
    }
  }

  async function writeQueue(events: readonly AppObservatoryEvent[]) {
    await storage.setItem(storageKey, JSON.stringify(events.slice(-maxQueueSize)));
  }

  return {
    async enqueue(event) {
      await runExclusive(async () => {
        const events = await readQueue();
        events.push(event);
        await writeQueue(events);
      });
    },
    async peek(batchSize = 20) {
      return runExclusive(async () => {
        const events = await readQueue();
        return events.slice(0, batchSize);
      });
    },
    async remove(ids) {
      await runExclusive(async () => {
        const idSet = new Set(ids);
        const events = await readQueue();
        await writeQueue(events.filter(event => !idSet.has(event.id)));
      });
    },
    async clear() {
      await runExclusive(async () => {
        await storage.removeItem(storageKey);
      });
    },
    async size() {
      return runExclusive(async () => {
        const events = await readQueue();
        return events.length;
      });
    },
  };
}
