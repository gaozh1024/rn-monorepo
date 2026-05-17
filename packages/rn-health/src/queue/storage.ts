import type { AppHealthStorageAdapter } from '../core/types';

export class MemoryHealthStorage implements AppHealthStorageAdapter {
  private readonly store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

export const defaultHealthStorage = new MemoryHealthStorage();
