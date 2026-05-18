import type { ReactNode } from 'react';
import type { AppHealthReporter } from '@/core/health-reporter';
import type { LogEntry, LogLevel, LoggerTransport } from '@/core/logger';

export interface LoggerExportPayload {
  entries: LogEntry[];
  serialized: string;
}

export interface LoggerProviderProps {
  children: ReactNode;
  enabled?: boolean;
  level?: LogLevel;
  maxEntries?: number;
  overlayEnabled?: boolean;
  defaultExpanded?: boolean;
  overlayPositionStorageKey?: string;
  consoleEnabled?: boolean;
  transports?: LoggerTransport[];
  healthReporter?: AppHealthReporter;
  exportEnabled?: boolean;
  onExport?: (payload: LoggerExportPayload) => void;
}

export interface LoggerContextType {
  entries: LogEntry[];
  enabled: boolean;
  level: LogLevel;
  clear: () => void;
  log: (level: LogLevel, message: string, data?: unknown, namespace?: string) => void;
  debug: (message: string, data?: unknown, namespace?: string) => void;
  info: (message: string, data?: unknown, namespace?: string) => void;
  warn: (message: string, data?: unknown, namespace?: string) => void;
  error: (message: string, data?: unknown, namespace?: string) => void;
}

export interface ScopedLoggerContextType extends Omit<
  LoggerContextType,
  'log' | 'debug' | 'info' | 'warn' | 'error'
> {
  namespace?: string;
  log: (level: LogLevel, message: string, data?: unknown) => void;
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}
