import type { AppHealthEvent, AppHealthStorageAdapter } from '../core/types';
import { defaultHealthStorage } from './storage';

export interface AppHealthQueueOptions {
  storage?: AppHealthStorageAdapter;
  storageKey?: string;
  maxQueueSize?: number;
}

export interface AppHealthQueue {
  enqueue: (event: AppHealthEvent) => Promise<void>;
  peek: (batchSize?: number) => Promise<AppHealthEvent[]>;
  remove: (ids: readonly string[]) => Promise<void>;
  clear: () => Promise<void>;
  size: () => Promise<number>;
}

const DEFAULT_STORAGE_KEY = 'rn-health.queue';
const DEFAULT_MAX_QUEUE_SIZE = 100;

export function createAppHealthQueue(options: AppHealthQueueOptions = {}): AppHealthQueue {
  const storage = options.storage ?? defaultHealthStorage;
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;

  async function readQueue() {
    const raw = await storage.getItem(storageKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as AppHealthEvent[]) : [];
    } catch {
      return [];
    }
  }

  async function writeQueue(events: readonly AppHealthEvent[]) {
    await storage.setItem(storageKey, JSON.stringify(events.slice(-maxQueueSize)));
  }

  return {
    async enqueue(event) {
      const events = await readQueue();
      events.push(event);
      await writeQueue(events);
    },
    async peek(batchSize = 20) {
      const events = await readQueue();
      return events.slice(0, batchSize);
    },
    async remove(ids) {
      const idSet = new Set(ids);
      const events = await readQueue();
      await writeQueue(events.filter(event => !idSet.has(event.id)));
    },
    async clear() {
      await storage.removeItem(storageKey);
    },
    async size() {
      const events = await readQueue();
      return events.length;
    },
  };
}
