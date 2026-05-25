import { useEffect, useRef, useState } from 'react';
import { AppObservatoryContext, noopAppObservatoryReporter } from './context';
import { createAppObservatoryClient } from './client';
import type { AppObservatoryProviderProps, AppObservatoryReporter } from './types';

function createConfigSnapshot(config: Omit<AppObservatoryProviderProps, 'children'>) {
  return JSON.stringify({
    enabled: config.enabled,
    appId: config.appId,
    appVersion: config.appVersion,
    buildNumber: config.buildNumber,
    environment: config.environment,
    userId: config.userId,
    endpoint: config.endpoint,
    ingestToken: config.ingestToken,
    consent: config.consent,
    identity: config.identity,
    storageKey: config.storageKey,
    sessionStorageKey: config.sessionStorageKey,
    maxBreadcrumbs: config.maxBreadcrumbs,
    maxQueueSize: config.maxQueueSize,
    flushIntervalMs: config.flushIntervalMs,
    flushBatchSize: config.flushBatchSize,
    transportTimeoutMs: config.transportTimeoutMs,
    flushOnFatal: config.flushOnFatal,
    captureGlobalErrors: config.captureGlobalErrors,
    captureUnhandledRejections: config.captureUnhandledRejections,
    detectPreviousCrash: config.detectPreviousCrash,
    release: config.release,
  });
}

export function AppObservatoryProvider({ children, ...config }: AppObservatoryProviderProps) {
  const configRef = useRef(config);
  configRef.current = config;
  const [client, setClient] = useState<AppObservatoryReporter | null>(null);
  const configSnapshot = createConfigSnapshot(config);

  useEffect(() => {
    let mounted = true;
    let activeClient: AppObservatoryReporter | null = null;
    setClient(null);

    createAppObservatoryClient(configRef.current)
      .then(nextClient => {
        activeClient = nextClient;
        if (mounted) setClient(nextClient);
      })
      .catch(error => {
        configRef.current.onError?.(error);
      });

    return () => {
      mounted = false;
      activeClient?.dispose?.();
    };
  }, [
    configSnapshot,
    config.headers,
    config.transports,
    config.storage,
    config.deviceInfoProvider,
    config.nativeCrashAdapter,
    config.sanitize,
    config.onError,
  ]);

  const resolvedClient = client ?? noopAppObservatoryReporter;

  return (
    <AppObservatoryContext.Provider value={resolvedClient}>
      {typeof children === 'function' ? children(resolvedClient) : children}
    </AppObservatoryContext.Provider>
  );
}
