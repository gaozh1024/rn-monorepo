/**
 * Toast 子系统 Provider
 * @module overlay/toast/provider
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { ToastContext } from './context';
import { ToastItemView } from './component';
import type { ToastContextType, ToastItem, ToastType } from './types';

/**
 * Toast Provider
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = Math.random().toString(36).substring(7);
      const toast: ToastItem = { id, message, type, duration };

      setToasts(prev => [...prev, toast]);

      const timer = setTimeout(() => remove(id), duration);
      timersRef.current.set(id, timer);
    },
    [remove]
  );

  const success = useCallback(
    (message: string, duration?: number) => show(message, 'success', duration),
    [show]
  );
  const error = useCallback(
    (message: string, duration?: number) => show(message, 'error', duration),
    [show]
  );
  const info = useCallback(
    (message: string, duration?: number) => show(message, 'info', duration),
    [show]
  );
  const warning = useCallback(
    (message: string, duration?: number) => show(message, 'warning', duration),
    [show]
  );

  const contextValue = useMemo<ToastContextType>(
    () => ({ show, success, error, info, warning }),
    [error, info, show, success, warning]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <View style={styles.toastContainer} pointerEvents="none">
        {toasts.map(toast => (
          <ToastItemView key={toast.id} {...toast} onHide={() => remove(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
