import { useCallback, useEffect, useMemo, useState } from 'react';
import { createConsoleTransport, createLogEntry, setGlobalLogger, shouldLog } from '@/core/logger';
import type { LogEntry, LogLevel, LoggerTransport } from '@/core/logger';
import { storage } from '@/core/storage';
import { LoggerContext } from './context';
import { LogOverlay } from './component';
import type { LoggerContextType, LoggerProviderProps } from './types';

const DEFAULT_OVERLAY_POSITION_STORAGE_KEY = 'rn-kit.logger.overlay.position';

export function LoggerProvider({
  children,
  enabled = false,
  level = 'debug',
  maxEntries = 200,
  overlayEnabled = false,
  defaultExpanded = false,
  overlayPositionStorageKey = DEFAULT_OVERLAY_POSITION_STORAGE_KEY,
  consoleEnabled = true,
  transports = [],
  healthReporter,
  exportEnabled = true,
  onExport,
}: LoggerProviderProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | undefined>(
    undefined
  );

  const clear = useCallback(() => {
    setEntries([]);
  }, []);

  const persistButtonPosition = useCallback(
    async (position: { x: number; y: number }) => {
      setButtonPosition(position);

      try {
        await storage.setItem(overlayPositionStorageKey, JSON.stringify(position));
      } catch (error) {
        console.warn('Failed to persist logger overlay position:', error);
      }
    },
    [overlayPositionStorageKey]
  );

  const resolvedTransports = useMemo<LoggerTransport[]>(() => {
    const list: LoggerTransport[] = [];

    if (enabled && consoleEnabled) {
      list.push(createConsoleTransport());
    }

    if (transports.length > 0) {
      list.push(...transports);
    }

    return list;
  }, [consoleEnabled, enabled, transports]);

  const write = useCallback(
    (nextLevel: LogLevel, message: string, data?: unknown, namespace?: string) => {
      if (!enabled || !shouldLog(level, nextLevel)) return;

      const entry = createLogEntry({
        level: nextLevel,
        message,
        data,
        namespace,
        source: 'logger',
      });
      setEntries(prev => [entry, ...prev].slice(0, maxEntries));
      resolvedTransports.forEach(transport => transport(entry));
      void healthReporter?.addBreadcrumb?.({
        category: 'logger',
        level: nextLevel,
        message,
        data,
        namespace,
        timestamp: entry.timestamp,
      });
    },
    [enabled, healthReporter, level, maxEntries, resolvedTransports]
  );

  const contextValue = useMemo<LoggerContextType>(
    () => ({
      entries,
      enabled,
      level,
      clear,
      log: write,
      debug: (message, data, namespace) => write('debug', message, data, namespace),
      info: (message, data, namespace) => write('info', message, data, namespace),
      warn: (message, data, namespace) => write('warn', message, data, namespace),
      error: (message, data, namespace) => write('error', message, data, namespace),
    }),
    [clear, enabled, entries, level, write]
  );

  useEffect(() => {
    if (!enabled) {
      setGlobalLogger(null);
      return;
    }

    setGlobalLogger(contextValue);

    return () => {
      setGlobalLogger(null);
    };
  }, [contextValue, enabled]);

  useEffect(() => {
    if (!enabled || !overlayEnabled) return;

    let mounted = true;

    const loadOverlayPosition = async () => {
      try {
        const stored = await storage.getItem(overlayPositionStorageKey);
        if (!stored) return;

        const parsed = JSON.parse(stored) as { x?: unknown; y?: unknown };
        if (!mounted) return;

        setButtonPosition({
          x: typeof parsed.x === 'number' ? parsed.x : 0,
          y: typeof parsed.y === 'number' ? parsed.y : 0,
        });
      } catch (error) {
        console.warn('Failed to restore logger overlay position:', error);
      }
    };

    loadOverlayPosition();

    return () => {
      mounted = false;
    };
  }, [enabled, overlayEnabled, overlayPositionStorageKey]);

  return (
    <LoggerContext.Provider value={contextValue}>
      {children}
      {enabled && overlayEnabled ? (
        <LogOverlay
          entries={entries}
          onClear={clear}
          defaultExpanded={defaultExpanded}
          exportEnabled={exportEnabled}
          onExport={onExport}
          buttonPosition={buttonPosition}
          onButtonPositionChange={persistButtonPosition}
        />
      ) : null}
    </LoggerContext.Provider>
  );
}
