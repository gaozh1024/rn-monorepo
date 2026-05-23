import type { AppObservatoryStorageAdapter } from '../core/types';

export interface AsyncStorageLike {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export function createAsyncStorageObservatoryStorage(
  storage: AsyncStorageLike
): AppObservatoryStorageAdapter {
  return {
    getItem: key => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: key => storage.removeItem(key),
  };
}
