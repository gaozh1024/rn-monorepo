import type {
  AppHealthAppInfo,
  AppHealthBreadcrumb,
  AppHealthClientConfig,
  AppHealthEvent,
  AppHealthReporter,
  AppHealthTransport,
  AppHealthUser,
} from './types';
import { defaultAppHealthSanitizer } from '../privacy/sanitizer';
import { createAppHealthQueue } from '../queue/queue';
import { createFetchHealthTransport } from '../transport/fetch-transport';
import { createAppHealthSessionManager, type StoredHealthSession } from '../session/session';
import { installGlobalErrorHandlers } from '../capture/global-handlers';
import { installAppStateMonitor } from '../session/app-state';
import { createFingerprint } from '../utils/fingerprint';
import { createId } from '../utils/id';
import { getDeviceInfo } from '../utils/platform';
import { serializeError } from '../utils/serialize-error';

interface ClientRuntime {
  breadcrumbs: AppHealthBreadcrumb[];
  tags: Record<string, string>;
  user: AppHealthUser | undefined;
  session: StoredHealthSession;
}

const DEFAULT_MAX_BREADCRUMBS = 50;
const DEFAULT_FLUSH_BATCH_SIZE = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 30_000;

export async function createAppHealthClient(
  config: AppHealthClientConfig = {}
): Promise<AppHealthReporter> {
  const enabled = config.enabled ?? true;
  const maxBreadcrumbs = config.maxBreadcrumbs ?? DEFAULT_MAX_BREADCRUMBS;
  const flushBatchSize = config.flushBatchSize ?? DEFAULT_FLUSH_BATCH_SIZE;
  const app: AppHealthAppInfo = {
    id: config.appId,
    version: config.appVersion,
    buildNumber: config.buildNumber,
    environment: config.environment,
  };
  const sessionManager = await createAppHealthSessionManager({
    storage: config.storage,
    sessionStorageKey: config.sessionStorageKey,
  });
  const queue = createAppHealthQueue({
    storage: config.storage,
    storageKey: config.storageKey,
    maxQueueSize: config.maxQueueSize,
  });
  const transports = resolveTransports(config);
  const sanitize = config.sanitize ?? defaultAppHealthSanitizer;
  const disposers: Array<() => void> = [];
  const runtime: ClientRuntime = {
    breadcrumbs: [],
    tags: {},
    user: config.userId ? { id: config.userId } : undefined,
    session: sessionManager.session,
  };

  async function safeRun(task: () => Promise<void>) {
    if (!enabled) return;
    try {
      await task();
    } catch (error) {
      config.onError?.(error);
    }
  }

  function createBaseEvent(type: AppHealthEvent['type'], level: AppHealthEvent['level']) {
    return {
      id: createId('evt'),
      type,
      level,
      timestamp: Date.now(),
      app,
      device: getDeviceInfo(),
      session: {
        id: runtime.session.sessionId,
        startedAt: runtime.session.startedAt,
      },
      user: runtime.user,
      tags: Object.keys(runtime.tags).length > 0 ? { ...runtime.tags } : undefined,
    } satisfies Omit<AppHealthEvent, 'error' | 'breadcrumbs' | 'extra'>;
  }

  async function enqueue(event: AppHealthEvent) {
    const sanitized = sanitize(event);
    await queue.enqueue(sanitized);
  }

  async function enqueueAndMaybeFlush(event: AppHealthEvent) {
    await enqueue(event);
    if ((config.flushOnFatal ?? true) && event.level === 'fatal') {
      await flush();
    }
  }

  async function flush() {
    if (!enabled || transports.length === 0) return;

    const events = await queue.peek(flushBatchSize);
    if (events.length === 0) return;

    await Promise.all(transports.map(transport => transport(events)));
    await queue.remove(events.map(event => event.id));
  }

  const client: AppHealthReporter = {
    async captureException(error, context = {}) {
      await safeRun(async () => {
        const payload = serializeError(error);
        const errorPayload = {
          ...payload,
          componentStack: context.componentStack,
          fingerprint: createFingerprint(payload),
        };
        await enqueueAndMaybeFlush({
          ...createBaseEvent(context.type ?? 'js_error', context.level ?? 'error'),
          error: errorPayload,
          breadcrumbs: runtime.breadcrumbs,
          extra: context.extra,
          tags: { ...runtime.tags, ...context.tags, source: context.source ?? 'exception' },
        });
      });
    },
    async captureMessage(message, context = {}) {
      await safeRun(async () => {
        await enqueueAndMaybeFlush({
          ...createBaseEvent(context.type ?? 'custom', context.level ?? 'info'),
          error:
            context.level === 'error' || context.level === 'fatal'
              ? { message, fingerprint: createFingerprint({ message }) }
              : undefined,
          breadcrumbs: runtime.breadcrumbs,
          extra: context.extra,
          tags: { ...runtime.tags, ...context.tags, source: context.source ?? 'message' },
        });
      });
    },
    addBreadcrumb(breadcrumb) {
      if (!enabled) return;
      const nextBreadcrumb: AppHealthBreadcrumb = {
        timestamp: Date.now(),
        level: 'info',
        ...breadcrumb,
      };
      runtime.breadcrumbs = [...runtime.breadcrumbs, nextBreadcrumb].slice(-maxBreadcrumbs);
    },
    setUser(user) {
      runtime.user = user ?? undefined;
      void config.nativeCrashAdapter?.setUser?.(user);
    },
    setTags(tags) {
      runtime.tags = { ...runtime.tags, ...tags };
      void config.nativeCrashAdapter?.setTags?.(runtime.tags);
    },
    async flush() {
      await safeRun(flush);
    },
    dispose() {
      disposers
        .splice(0)
        .reverse()
        .forEach(dispose => dispose());
    },
  };

  await initializeClient({ client, config, disposers, enabled, sessionManager });

  const interval =
    enabled && transports.length > 0 && config.flushIntervalMs !== 0
      ? setInterval(() => void client.flush(), config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS)
      : undefined;
  const maybeInterval = interval as { unref?: () => void } | undefined;
  maybeInterval?.unref?.();
  if (interval !== undefined) disposers.push(() => clearInterval(interval));

  return client;
}

function resolveTransports(config: AppHealthClientConfig) {
  const transports: AppHealthTransport[] = [];

  if (config.endpoint) {
    transports.push(
      createFetchHealthTransport({
        endpoint: config.endpoint,
        ingestToken: config.ingestToken,
        headers: config.headers,
      })
    );
  }

  if (config.transports) transports.push(...config.transports);
  return transports;
}

async function initializeClient({
  client,
  config,
  disposers,
  enabled,
  sessionManager,
}: {
  client: AppHealthReporter;
  config: AppHealthClientConfig;
  disposers: Array<() => void>;
  enabled: boolean;
  sessionManager: Awaited<ReturnType<typeof createAppHealthSessionManager>>;
}) {
  if (!enabled) return;

  await config.nativeCrashAdapter?.install?.();

  disposers.push(
    installGlobalErrorHandlers(client, {
      captureGlobalErrors: config.captureGlobalErrors,
      captureUnhandledRejections: config.captureUnhandledRejections,
    })
  );

  if (
    (config.detectPreviousCrash ?? true) &&
    sessionManager.previousSession?.closedGracefully === false
  ) {
    await client.captureMessage('Previous session may have crashed', {
      type: 'previous_session_crash',
      level: 'fatal',
      source: 'session',
      extra: {
        previousSessionId: sessionManager.previousSession.sessionId,
        previousStartedAt: sessionManager.previousSession.startedAt,
        previousLastHeartbeatAt: sessionManager.previousSession.lastHeartbeatAt,
      },
    });
  }

  await client.captureMessage('App started', {
    type: 'app_start',
    level: 'info',
    source: 'session',
  });

  const pendingNativeCrashes = await config.nativeCrashAdapter?.getPendingCrashReports?.();
  if (pendingNativeCrashes?.length) {
    await Promise.all(
      pendingNativeCrashes.map(report =>
        client.captureException(
          {
            name: report.name ?? 'NativeCrash',
            message: report.message ?? 'Native crash report',
            stack: report.stack,
          },
          {
            type: 'native_crash',
            level: 'fatal',
            source: 'native',
            extra: report.extra,
          }
        )
      )
    );
    await config.nativeCrashAdapter?.clearPendingCrashReports?.(
      pendingNativeCrashes.map(report => report.id)
    );
  }

  disposers.push(
    installAppStateMonitor({
      onForeground: () => {
        void sessionManager.heartbeat();
        void client.captureMessage('App foregrounded', {
          type: 'app_foreground',
          level: 'info',
          source: 'app_state',
        });
      },
      onBackground: () => {
        void sessionManager.markGracefulClose();
        void client.captureMessage('App backgrounded', {
          type: 'app_background',
          level: 'info',
          source: 'app_state',
        });
        void client.flush();
      },
    })
  );

  void client.flush();
}
