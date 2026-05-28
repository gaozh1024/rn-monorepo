import { useCallback, useRef, useState } from 'react';

export interface UseStreamRequestResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  start: () => Promise<T>;
  stop: () => void;
  reset: () => void;
}

export function useStreamRequest<T>(factory: () => Promise<{ abort?: () => void; data: T }>) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const abortRef = useRef<(() => void) | undefined>(undefined);

  const start = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await factory();
      abortRef.current = result.abort;
      setData(result.data);
      return result.data;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause));
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [factory]);

  const stop = useCallback(() => {
    abortRef.current?.();
    abortRef.current = undefined;
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
  }, []);

  return {
    data,
    loading,
    error,
    start,
    stop,
    reset,
  } satisfies UseStreamRequestResult<T>;
}
