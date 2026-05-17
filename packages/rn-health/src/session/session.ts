import type { AppHealthStorageAdapter } from '../core/types';
import { createId } from '../utils/id';
import { defaultHealthStorage } from '../queue/storage';

export interface StoredHealthSession {
  sessionId: string;
  startedAt: number;
  lastHeartbeatAt: number;
  closedGracefully: boolean;
}

export interface AppHealthSessionManager {
  session: StoredHealthSession;
  previousSession: StoredHealthSession | null;
  heartbeat: () => Promise<void>;
  markGracefulClose: () => Promise<void>;
}

const DEFAULT_SESSION_STORAGE_KEY = 'rn-health.session';

export async function createAppHealthSessionManager(
  options: {
    storage?: AppHealthStorageAdapter;
    sessionStorageKey?: string;
  } = {}
): Promise<AppHealthSessionManager> {
  const storage = options.storage ?? defaultHealthStorage;
  const sessionStorageKey = options.sessionStorageKey ?? DEFAULT_SESSION_STORAGE_KEY;
  const previousSession = await readStoredSession(storage, sessionStorageKey);
  const now = Date.now();
  const session: StoredHealthSession = {
    sessionId: createId('sess'),
    startedAt: now,
    lastHeartbeatAt: now,
    closedGracefully: false,
  };

  async function persist(nextSession: StoredHealthSession) {
    await storage.setItem(sessionStorageKey, JSON.stringify(nextSession));
  }

  await persist(session);

  return {
    session,
    previousSession,
    async heartbeat() {
      session.lastHeartbeatAt = Date.now();
      await persist(session);
    },
    async markGracefulClose() {
      session.closedGracefully = true;
      session.lastHeartbeatAt = Date.now();
      await persist(session);
    },
  };
}

async function readStoredSession(
  storage: AppHealthStorageAdapter,
  sessionStorageKey: string
): Promise<StoredHealthSession | null> {
  const raw = await storage.getItem(sessionStorageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredHealthSession>;
    if (typeof parsed.sessionId !== 'string' || typeof parsed.startedAt !== 'number') return null;
    return {
      sessionId: parsed.sessionId,
      startedAt: parsed.startedAt,
      lastHeartbeatAt:
        typeof parsed.lastHeartbeatAt === 'number' ? parsed.lastHeartbeatAt : parsed.startedAt,
      closedGracefully: Boolean(parsed.closedGracefully),
    };
  } catch {
    return null;
  }
}
