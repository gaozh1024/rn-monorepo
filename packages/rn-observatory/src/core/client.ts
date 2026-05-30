import type {
  AppObservatoryAppInfo,
  AppObservatoryBreadcrumb,
  AppObservatoryClientConfig,
  AppObservatoryConsentOptions,
  AppObservatoryDeviceInfo,
  AppObservatoryEvent,
  AppObservatoryReporter,
  AppObservatoryTransport,
  AppObservatoryUser,
} from './types';
import { defaultAppObservatorySanitizer } from '../privacy/sanitizer';
import { createAppObservatoryQueue } from '../queue/queue';
import { createFetchObservatoryTransport } from '../transport/fetch-transport';
import {
  createAppObservatorySessionManager,
  type StoredObservatorySession,
} from '../session/session';
import { installGlobalErrorHandlers } from '../capture/global-handlers';
import { installAppStateMonitor } from '../session/app-state';
import { createFingerprint } from '../utils/fingerprint';
import { createId } from '../utils/id';
import { getDeviceInfo } from '../utils/platform';
import { getOrCreateInstallId } from '../identity/install-id';
import { serializeError } from '../utils/serialize-error';
import { createMissingAppIdError, resolveAppMetadata } from '../metadata/app-metadata';

interface ClientRuntime {
  breadcrumbs: AppObservatoryBreadcrumb[];
  tags: Record<string, string>;
  user: AppObservatoryUser | undefined;
  session: StoredObservatorySession;
}

const DEFAULT_MAX_BREADCRUMBS = 50;
const DEFAULT_FLUSH_BATCH_SIZE = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 30_000;

function resolveConsent(consent: AppObservatoryConsentOptions | undefined) {
  return {
    crash: consent?.crash ?? true,
    analytics: consent?.analytics ?? false,
    device: consent?.device ?? false,
  };
}

export async function createAppObservatoryClient(
  config: AppObservatoryClientConfig = {}
): Promise<AppObservatoryReporter> {
  const enabled = config.enabled ?? true;
  const consent = resolveConsent(config.consent);
  const maxBreadcrumbs = config.maxBreadcrumbs ?? DEFAULT_MAX_BREADCRUMBS;
  const flushBatchSize = config.flushBatchSize ?? DEFAULT_FLUSH_BATCH_SIZE;
  const metadata = resolveAppMetadata(config);
  const app: AppObservatoryAppInfo = {
    id: metadata.appId,
    version: metadata.version,
    buildNumber: metadata.buildNumber,
    environment: config.environment,
  };
  reportMissingAppId(config, app);
  const release = config.release;
  const sessionManager = await createAppObservatorySessionManager({
    storage: config.storage,
    sessionStorageKey: config.sessionStorageKey,
  });
  const queue = createAppObservatoryQueue({
    storage: config.storage,
    storageKey: config.storageKey,
    maxQueueSize: config.maxQueueSize,
  });
  const transports = resolveTransports(config);
  const sanitize = config.sanitize ?? defaultAppObservatorySanitizer;
  const disposers: Array<() => void> = [];
  const device = await resolveDeviceInfo(config, consent.device);
  const identity = await resolveIdentity(config);
  const runtime: ClientRuntime = {
    breadcrumbs: [],
    tags: identity.installId ? { installId: identity.installId } : {},
    user: resolveInitialUser(config, identity.installId),
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

  function createBaseEvent(type: AppObservatoryEvent['type'], level: AppObservatoryEvent['level']) {
    return {
      id: createId('evt'),
      type,
      level,
      timestamp: Date.now(),
      app,
      device,
      session: {
        id: runtime.session.sessionId,
        startedAt: runtime.session.startedAt,
      },
      release,
      user: runtime.user,
      tags: Object.keys(runtime.tags).length > 0 ? { ...runtime.tags } : undefined,
    } satisfies Omit<AppObservatoryEvent, 'error' | 'breadcrumbs' | 'extra'>;
  }

  async function enqueue(event: AppObservatoryEvent) {
    const sanitized = sanitize(event);
    await queue.enqueue(sanitized);
  }

  async function enqueueAndMaybeFlush(event: AppObservatoryEvent) {
    await enqueue(event);
    if ((config.flushOnFatal ?? true) && event.level === 'fatal') {
      await flush();
    }
  }

  let activeFlush: Promise<void> | null = null;

  async function flush() {
    if (activeFlush) return activeFlush;

    activeFlush = (async () => {
      if (!enabled || transports.length === 0) return;

      const events = await queue.peek(flushBatchSize);
      if (events.length === 0) return;

      const [primaryTransport, ...mirrorTransports] = transports;
      if (!primaryTransport) return;

      await primaryTransport(events);

      const mirrorResults = await Promise.allSettled(
        mirrorTransports.map(transport => Promise.resolve().then(() => transport(events)))
      );
      for (const result of mirrorResults) {
        if (result.status === 'rejected') {
          config.onError?.(result.reason);
        }
      }

      await queue.remove(events.map(event => event.id));
    })();

    try {
      await activeFlush;
    } finally {
      activeFlush = null;
    }
  }

  const client: AppObservatoryReporter = {
    async trackEvent(name, properties, context = {}) {
      await safeRun(async () => {
        if (!consent.analytics) return;
        await enqueueAndMaybeFlush({
          ...createBaseEvent(context.type ?? 'analytics_event', context.level ?? 'info'),
          analytics: { name, properties },
          breadcrumbs: runtime.breadcrumbs,
          extra: context.extra,
          tags: { ...runtime.tags, ...context.tags, source: context.source ?? 'analytics.event' },
        });
      });
    },
    async trackScreen(screen, properties, context = {}) {
      await safeRun(async () => {
        if (!consent.analytics) return;
        await enqueueAndMaybeFlush({
          ...createBaseEvent(context.type ?? 'screen_view', context.level ?? 'info'),
          analytics: { name: 'screen.view', properties: { screen, ...properties } },
          breadcrumbs: runtime.breadcrumbs,
          extra: context.extra,
          tags: {
            ...runtime.tags,
            ...context.tags,
            screen,
            source: context.source ?? 'analytics.screen',
          },
        });
      });
    },
    async captureException(error, context = {}) {
      await safeRun(async () => {
        if (!consent.crash) return;
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
          analytics: context.analytics,
          tags: { ...runtime.tags, ...context.tags, source: context.source ?? 'exception' },
        });
      });
    },
    async captureMessage(message, context = {}) {
      await safeRun(async () => {
        if (!shouldCaptureMessage(context.type, consent)) return;
        await enqueueAndMaybeFlush({
          ...createBaseEvent(context.type ?? 'custom', context.level ?? 'info'),
          error:
            context.level === 'error' || context.level === 'fatal'
              ? { message, fingerprint: createFingerprint({ message }) }
              : undefined,
          breadcrumbs: runtime.breadcrumbs,
          extra: context.extra,
          analytics: context.analytics,
          tags: { ...runtime.tags, ...context.tags, source: context.source ?? 'message' },
        });
      });
    },
    addBreadcrumb(breadcrumb) {
      if (!enabled) return;
      const nextBreadcrumb: AppObservatoryBreadcrumb = {
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

  await initializeClient({ client, config, consent, disposers, enabled, sessionManager });

  const interval =
    enabled && transports.length > 0 && config.flushIntervalMs !== 0
      ? setInterval(() => void client.flush(), config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS)
      : undefined;
  const maybeInterval = interval as { unref?: () => void } | undefined;
  maybeInterval?.unref?.();
  if (interval !== undefined) disposers.push(() => clearInterval(interval));

  return client;
}

function reportMissingAppId(config: AppObservatoryClientConfig, app: AppObservatoryAppInfo) {
  if (app.id) return;

  const error = createMissingAppIdError();
  config.onError?.(error);

  if (isDevelopmentRuntime()) {
    console.warn(error.message);
  }
}

function isDevelopmentRuntime() {
  return (globalThis as { __DEV__?: boolean }).__DEV__ === true;
}

async function resolveDeviceInfo(config: AppObservatoryClientConfig, allowExtendedDevice: boolean) {
  const base = getDeviceInfo();
  if (!allowExtendedDevice || !config.deviceInfoProvider) return base;
  const extra = await config.deviceInfoProvider();
  return { ...base, ...compactDeviceInfo(extra) } satisfies AppObservatoryDeviceInfo;
}

function compactDeviceInfo(value: Partial<AppObservatoryDeviceInfo>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== '')
  ) as Partial<AppObservatoryDeviceInfo>;
}

async function resolveIdentity(config: AppObservatoryClientConfig) {
  const identity = config.identity;
  if (identity?.anonymousUserId) return { installId: identity.anonymousUserId };
  if (!identity?.autoInstallId) return { installId: undefined };
  return {
    installId: await getOrCreateInstallId(config.storage, identity.installIdStorageKey),
  };
}

function resolveInitialUser(config: AppObservatoryClientConfig, installId: string | undefined) {
  if (config.userId) return { id: config.userId };
  if (installId && (config.identity?.useInstallIdAsUserId ?? true)) return { id: installId };
  return undefined;
}

function shouldCaptureMessage(
  type: AppObservatoryEvent['type'] | undefined,
  consent: ReturnType<typeof resolveConsent>
) {
  if (type === 'analytics_event' || type === 'screen_view') return consent.analytics;
  if (
    type === 'js_error' ||
    type === 'react_error' ||
    type === 'unhandled_rejection' ||
    type === 'previous_session_crash' ||
    type === 'native_crash' ||
    type === 'api_error'
  )
    return consent.crash;
  if (
    type === 'app_start' ||
    type === 'app_ready' ||
    type === 'app_background' ||
    type === 'app_foreground'
  )
    return consent.analytics;
  return true;
}

function resolveTransports(config: AppObservatoryClientConfig) {
  const transports: AppObservatoryTransport[] = [];

  if (config.endpoint) {
    transports.push(
      createFetchObservatoryTransport({
        endpoint: config.endpoint,
        ingestToken: config.ingestToken,
        headers: config.headers,
        timeoutMs: config.transportTimeoutMs,
      })
    );
  }

  if (config.transports) transports.push(...config.transports);
  return transports;
}

async function initializeClient({
  client,
  config,
  consent,
  disposers,
  enabled,
  sessionManager,
}: {
  client: AppObservatoryReporter;
  config: AppObservatoryClientConfig;
  consent: ReturnType<typeof resolveConsent>;
  disposers: Array<() => void>;
  enabled: boolean;
  sessionManager: Awaited<ReturnType<typeof createAppObservatorySessionManager>>;
}) {
  if (!enabled) return;

  if (consent.crash) {
    await config.nativeCrashAdapter?.install?.();
  }

  if (consent.crash)
    disposers.push(
      installGlobalErrorHandlers(client, {
        captureGlobalErrors: config.captureGlobalErrors,
        captureUnhandledRejections: config.captureUnhandledRejections,
      })
    );

  if (
    consent.crash &&
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

  const pendingNativeCrashes = consent.crash
    ? await config.nativeCrashAdapter?.getPendingCrashReports?.()
    : undefined;
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
