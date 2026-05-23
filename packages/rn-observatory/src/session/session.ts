import type { AppObservatoryStorageAdapter } from '../core/types';
import { createId } from '../utils/id';
import { defaultObservatoryStorage } from '../queue/storage';

export interface StoredObservatorySession {
  sessionId: string;
  startedAt: number;
  lastHeartbeatAt: number;
  closedGracefully: boolean;
}

export interface AppObservatorySessionManager {
  session: StoredObservatorySession;
  previousSession: StoredObservatorySession | null;
  heartbeat: () => Promise<void>;
  markGracefulClose: () => Promise<void>;
}

const DEFAULT_SESSION_STORAGE_KEY = 'rn-observatory.session';

export async function createAppObservatorySessionManager(
  options: {
    storage?: AppObservatoryStorageAdapter;
    sessionStorageKey?: string;
  } = {}
): Promise<AppObservatorySessionManager> {
  const storage = options.storage ?? defaultObservatoryStorage;
  const sessionStorageKey = options.sessionStorageKey ?? DEFAULT_SESSION_STORAGE_KEY;
  const previousSession = await readStoredSession(storage, sessionStorageKey);
  const now = Date.now();
  const session: StoredObservatorySession = {
    sessionId: createId('sess'),
    startedAt: now,
    lastHeartbeatAt: now,
    closedGracefully: false,
  };

  async function persist(nextSession: StoredObservatorySession) {
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
  storage: AppObservatoryStorageAdapter,
  sessionStorageKey: string
): Promise<StoredObservatorySession | null> {
  const raw = await storage.getItem(sessionStorageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredObservatorySession>;
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
