import type {
  AppObservatoryAppInfo,
  AppObservatoryAnalyticsContext,
  AppObservatoryBreadcrumb,
  AppObservatoryClientConfig,
  AppObservatoryConsentOptions,
  AppObservatoryDeviceInfo,
  AppObservatoryErrorContext,
  AppObservatoryEvent,
  AppObservatoryMessageContext,
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
import { appObservatorySdkInfo } from './sdk-info';

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
      sdk: appObservatorySdkInfo,
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

  function createTags(
    source: string | undefined,
    contextTags: Record<string, string> | undefined,
    extraTags: Record<string, string> = {}
  ) {
    const tags = {
      ...runtime.tags,
      ...contextTags,
      ...extraTags,
      ...(source ? { source } : {}),
    };
    return Object.keys(tags).length > 0 ? tags : undefined;
  }

  function createMessageErrorPayload(message: string, level: AppObservatoryEvent['level']) {
    if (level !== 'error' && level !== 'fatal') return undefined;
    return { message, fingerprint: createFingerprint({ message }) };
  }

  async function emitAnalyticsEvent(
    type: 'analytics_event' | 'screen_view',
    analytics: AppObservatoryEvent['analytics'],
    context: AppObservatoryAnalyticsContext,
    extraTags: Record<string, string> = {},
    fallbackSource: string
  ) {
    if (!consent.analytics) return;
    await enqueueAndMaybeFlush({
      ...createBaseEvent(type, context.level ?? 'info'),
      analytics,
      breadcrumbs: runtime.breadcrumbs,
      extra: context.extra,
      tags: createTags(context.source ?? fallbackSource, context.tags, extraTags),
    });
  }

  async function emitMessageEvent(
    type: AppObservatoryEvent['type'],
    message: string,
    context: AppObservatoryMessageContext = {},
    fallbackLevel: AppObservatoryEvent['level'] = 'info',
    fallbackSource = 'message'
  ) {
    await enqueueAndMaybeFlush({
      ...createBaseEvent(type, context.level ?? fallbackLevel),
      error: createMessageErrorPayload(message, context.level ?? fallbackLevel),
      breadcrumbs: runtime.breadcrumbs,
      extra: context.extra,
      analytics: context.analytics,
      tags: createTags(context.source ?? fallbackSource, context.tags),
    });
  }

  async function emitErrorEvent(
    type: AppObservatoryEvent['type'],
    error: unknown,
    context: AppObservatoryErrorContext = {},
    fallbackLevel: AppObservatoryEvent['level'] = 'error',
    fallbackSource = 'exception'
  ) {
    const payload = serializeError(error);
    const errorPayload = {
      ...payload,
      componentStack: context.componentStack,
      fingerprint: createFingerprint(payload),
    };
    await enqueueAndMaybeFlush({
      ...createBaseEvent(type, context.level ?? fallbackLevel),
      error: errorPayload,
      breadcrumbs: runtime.breadcrumbs,
      extra: context.extra,
      analytics: context.analytics,
      tags: createTags(context.source ?? fallbackSource, context.tags),
    });
  }

  async function emitLifecycleEvent(
    type: 'app_start' | 'app_ready' | 'app_background' | 'app_foreground',
    message: string,
    context: AppObservatoryMessageContext = {},
    fallbackSource = 'session'
  ) {
    if (!consent.analytics) return;
    await emitMessageEvent(type, message, context, 'info', fallbackSource);
  }

  async function emitCrashMessageEvent(
    type: 'previous_session_crash',
    message: string,
    context: AppObservatoryMessageContext = {},
    fallbackLevel: AppObservatoryEvent['level'] = 'fatal',
    fallbackSource = 'session'
  ) {
    if (!consent.crash) return;
    await emitMessageEvent(type, message, context, fallbackLevel, fallbackSource);
  }

  async function emitCrashErrorEvent(
    type: 'native_crash' | 'api_error' | 'react_error' | 'unhandled_rejection',
    error: unknown,
    context: AppObservatoryErrorContext = {},
    fallbackLevel: AppObservatoryEvent['level'] = 'error',
    fallbackSource = 'exception'
  ) {
    if (!consent.crash) return;
    await emitErrorEvent(type, error, context, fallbackLevel, fallbackSource);
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
        await emitAnalyticsEvent(
          'analytics_event',
          { name, properties },
          context,
          {},
          'analytics.event'
        );
      });
    },
    async trackScreen(screen, properties, context = {}) {
      await safeRun(async () => {
        await emitAnalyticsEvent(
          'screen_view',
          { name: 'screen.view', properties: { screen, ...properties } },
          context,
          { screen },
          'analytics.screen'
        );
      });
    },
    async captureException(error, context = {}) {
      await safeRun(async () => {
        if (!consent.crash) return;
        await emitErrorEvent('js_error', error, context, 'error', 'exception');
      });
    },
    async captureMessage(message, context = {}) {
      await safeRun(async () => {
        await emitMessageEvent('custom', message, context, 'info', 'message');
      });
    },
    async markAppReady(context = {}) {
      await safeRun(async () => {
        await emitLifecycleEvent('app_ready', 'App ready', context, 'app_shell');
      });
    },
    async captureApiError(errorOrMessage, context = {}) {
      await safeRun(async () => {
        if (!consent.crash) return;
        if (typeof errorOrMessage === 'string') {
          await emitMessageEvent('api_error', errorOrMessage, context, 'error', 'api');
          return;
        }
        await emitCrashErrorEvent('api_error', errorOrMessage, context, 'error', 'api');
      });
    },
    async captureRenderException(error, context = {}) {
      await safeRun(async () => {
        await emitCrashErrorEvent('react_error', error, context, 'error', 'react_error');
      });
    },
    async captureUnhandledRejection(reason, context = {}) {
      await safeRun(async () => {
        await emitCrashErrorEvent(
          'unhandled_rejection',
          reason,
          context,
          'error',
          'global.onunhandledrejection'
        );
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

  await initializeClient({
    client,
    config,
    consent,
    disposers,
    enabled,
    sessionManager,
    emitLifecycleEvent,
    emitCrashMessageEvent,
    emitCrashErrorEvent,
  });

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
  emitLifecycleEvent,
  emitCrashMessageEvent,
  emitCrashErrorEvent,
}: {
  client: AppObservatoryReporter;
  config: AppObservatoryClientConfig;
  consent: ReturnType<typeof resolveConsent>;
  disposers: Array<() => void>;
  enabled: boolean;
  sessionManager: Awaited<ReturnType<typeof createAppObservatorySessionManager>>;
  emitLifecycleEvent: (
    type: 'app_start' | 'app_ready' | 'app_background' | 'app_foreground',
    message: string,
    context?: AppObservatoryMessageContext,
    fallbackSource?: string
  ) => Promise<void>;
  emitCrashMessageEvent: (
    type: 'previous_session_crash',
    message: string,
    context?: AppObservatoryMessageContext,
    fallbackLevel?: AppObservatoryEvent['level'],
    fallbackSource?: string
  ) => Promise<void>;
  emitCrashErrorEvent: (
    type: 'native_crash' | 'api_error' | 'react_error' | 'unhandled_rejection',
    error: unknown,
    context?: AppObservatoryErrorContext,
    fallbackLevel?: AppObservatoryEvent['level'],
    fallbackSource?: string
  ) => Promise<void>;
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
    await emitCrashMessageEvent('previous_session_crash', 'Previous session may have crashed', {
      level: 'fatal',
      source: 'session',
      extra: {
        previousSessionId: sessionManager.previousSession.sessionId,
        previousStartedAt: sessionManager.previousSession.startedAt,
        previousLastHeartbeatAt: sessionManager.previousSession.lastHeartbeatAt,
      },
    });
  }

  await emitLifecycleEvent('app_start', 'App started', { source: 'session' }, 'session');

  const pendingNativeCrashes = consent.crash
    ? await config.nativeCrashAdapter?.getPendingCrashReports?.()
    : undefined;
  if (pendingNativeCrashes?.length) {
    await Promise.all(
      pendingNativeCrashes.map(report =>
        emitCrashErrorEvent(
          'native_crash',
          {
            name: report.name ?? 'NativeCrash',
            message: report.message ?? 'Native crash report',
            stack: report.stack,
          },
          {
            level: 'fatal',
            source: 'native',
            extra: report.extra,
          },
          'fatal',
          'native'
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
        void emitLifecycleEvent(
          'app_foreground',
          'App foregrounded',
          { source: 'app_state' },
          'app_state'
        );
      },
      onBackground: () => {
        void sessionManager.markGracefulClose();
        void emitLifecycleEvent(
          'app_background',
          'App backgrounded',
          { source: 'app_state' },
          'app_state'
        );
        void client.flush();
      },
    })
  );

  void client.flush();
}
