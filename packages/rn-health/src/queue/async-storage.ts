import type { AppHealthStorageAdapter } from '../core/types';

export interface AsyncStorageLike {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export function createAsyncStorageHealthStorage(
  storage: AsyncStorageLike
): AppHealthStorageAdapter {
  return {
    getItem: key => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: key => storage.removeItem(key),
  };
}
