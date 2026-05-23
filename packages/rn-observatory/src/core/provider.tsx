import { useEffect, useRef, useState } from 'react';
import { AppObservatoryContext, noopAppObservatoryReporter } from './context';
import { createAppObservatoryClient } from './client';
import type { AppObservatoryProviderProps, AppObservatoryReporter } from './types';

export function AppObservatoryProvider({ children, ...config }: AppObservatoryProviderProps) {
  const configRef = useRef(config);
  configRef.current = config;
  const [client, setClient] = useState<AppObservatoryReporter | null>(null);

  useEffect(() => {
    let mounted = true;
    let activeClient: AppObservatoryReporter | null = null;

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
  }, []);

  const resolvedClient = client ?? noopAppObservatoryReporter;

  return (
    <AppObservatoryContext.Provider value={resolvedClient}>
      {typeof children === 'function' ? (client ? children(client) : null) : children}
    </AppObservatoryContext.Provider>
  );
}
