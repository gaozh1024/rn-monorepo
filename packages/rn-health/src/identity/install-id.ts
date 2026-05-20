import type { AppHealthStorageAdapter } from '../core/types';
import { createId } from '../utils/id';

export const DEFAULT_INSTALL_ID_STORAGE_KEY = 'app_health_install_id';

export async function getOrCreateInstallId(
  storage: AppHealthStorageAdapter | undefined,
  storageKey = DEFAULT_INSTALL_ID_STORAGE_KEY
) {
  if (!storage) return createId('inst');
  const cached = await storage.getItem(storageKey);
  if (cached) return cached;
  const installId = createId('inst');
  await storage.setItem(storageKey, installId);
  return installId;
}
