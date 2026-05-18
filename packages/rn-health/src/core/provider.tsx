import { useEffect, useRef, useState } from 'react';
import { AppHealthContext, noopAppHealthReporter } from './context';
import { createAppHealthClient } from './client';
import type { AppHealthProviderProps, AppHealthReporter } from './types';

export function AppHealthProvider({ children, ...config }: AppHealthProviderProps) {
  const configRef = useRef(config);
  configRef.current = config;
  const [client, setClient] = useState<AppHealthReporter | null>(null);

  useEffect(() => {
    let mounted = true;
    let activeClient: AppHealthReporter | null = null;

    createAppHealthClient(configRef.current)
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

  const resolvedClient = client ?? noopAppHealthReporter;

  return (
    <AppHealthContext.Provider value={resolvedClient}>
      {typeof children === 'function' ? (client ? children(client) : null) : children}
    </AppHealthContext.Provider>
  );
}
