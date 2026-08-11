/**
 * Alert 子系统 Provider
 * @module overlay/alert/provider
 */

import React, { useState, useCallback, useMemo } from 'react';
import { AlertContext } from './context';
import { AlertModal } from './component';
import type { AlertContextType, AlertOptions } from './types';

type AlertState = (AlertOptions & { visible: boolean }) | null;

/**
 * Alert Provider
 */
export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertState>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert({ ...options, visible: true });
  }, []);

  const confirm = useCallback(
    (options: Omit<AlertOptions, 'showCancel'>) => {
      showAlert({ ...options, showCancel: true });
    },
    [showAlert]
  );

  const hide = useCallback(() => {
    setAlert(current => (current ? { ...current, visible: false } : current));
  }, []);

  const handleConfirm = useCallback(() => {
    alert?.onConfirm?.();
    hide();
  }, [alert, hide]);

  const handleCancel = useCallback(() => {
    alert?.onCancel?.();
    hide();
  }, [alert, hide]);

  const handleExited = useCallback(() => {
    setAlert(current => (current?.visible ? current : null));
  }, []);

  const contextValue = useMemo<AlertContextType>(
    () => ({ alert: showAlert, confirm }),
    [confirm, showAlert]
  );

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <AlertModal
        visible={alert?.visible ?? false}
        title={alert?.title}
        message={alert?.message}
        confirmText={alert?.confirmText}
        cancelText={alert?.cancelText}
        showCancel={alert?.showCancel}
        motionPreset={alert?.motionPreset}
        motionDuration={alert?.motionDuration}
        motionEnterDuration={alert?.motionEnterDuration}
        motionExitDuration={alert?.motionExitDuration}
        motionDistance={alert?.motionDistance}
        motionReduceMotion={alert?.motionReduceMotion}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onExited={handleExited}
      />
    </AlertContext.Provider>
  );
}
