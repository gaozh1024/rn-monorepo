/**
 * Loading 子系统 Provider
 * @module overlay/loading/provider
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { LoadingContext } from './context';
import { LoadingModal } from './component';
import type { LoadingContextType, LoadingState } from './types';

const MIN_VISIBLE_DURATION = 500;

/**
 * Loading Provider
 */
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadingState>({ visible: false });
  const shownAtRef = useRef(0);
  const pendingCountRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (!hideTimerRef.current) return;
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const show = useCallback(
    (text?: string) => {
      pendingCountRef.current += 1;
      clearHideTimer();

      setState(previous => {
        if (!previous.visible) {
          shownAtRef.current = Date.now();
        }

        return { visible: true, text };
      });
    },
    [clearHideTimer]
  );

  const hide = useCallback(() => {
    pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);

    if (pendingCountRef.current > 0) return;

    const elapsed = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_DURATION - elapsed);

    clearHideTimer();

    if (remaining === 0) {
      setState({ visible: false });
      return;
    }

    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setState({ visible: false });
    }, remaining);
  }, [clearHideTimer]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const contextValue = useMemo<LoadingContextType>(() => ({ show, hide }), [hide, show]);

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      <LoadingModal {...state} onRequestClose={hide} />
    </LoadingContext.Provider>
  );
}
