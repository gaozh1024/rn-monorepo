import type { ReactNode } from 'react';

export type AppHealthEventType =
  | 'app_start'
  | 'app_ready'
  | 'app_background'
  | 'app_foreground'
  | 'js_error'
  | 'react_error'
  | 'unhandled_rejection'
  | 'previous_session_crash'
  | 'native_crash'
  | 'api_error'
  | 'custom';

export type AppHealthLevel = 'info' | 'warning' | 'error' | 'fatal';

export interface AppHealthAppInfo {
  id?: string;
  version?: string;
  buildNumber?: string;
  environment?: string;
}

export interface AppHealthDeviceInfo {
  platform: 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'unknown';
  osVersion?: string;
  model?: string;
  brand?: string;
}

export interface AppHealthSessionInfo {
  id: string;
  startedAt: number;
}

export interface AppHealthUser {
  id?: string;
  [key: string]: unknown;
}

export interface AppHealthErrorPayload {
  name?: string;
  message: string;
  stack?: string;
  componentStack?: string;
  fingerprint?: string;
}

export interface AppHealthBreadcrumb {
  timestamp?: number;
  category?: string;
  level?: AppHealthLevel;
  message: string;
  data?: unknown;
}

export interface AppHealthEvent {
  id: string;
  type: AppHealthEventType;
  level: AppHealthLevel;
  timestamp: number;
  app: AppHealthAppInfo;
  device: AppHealthDeviceInfo;
  session: AppHealthSessionInfo;
  user?: AppHealthUser;
  error?: AppHealthErrorPayload;
  breadcrumbs?: AppHealthBreadcrumb[];
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export interface AppHealthCaptureContext {
  type?: AppHealthEventType;
  level?: AppHealthLevel;
  source?: string;
  componentStack?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export interface AppHealthReporter {
  captureException: (error: unknown, context?: AppHealthCaptureContext) => Promise<void>;
  captureMessage: (message: string, context?: AppHealthCaptureContext) => Promise<void>;
  addBreadcrumb: (breadcrumb: AppHealthBreadcrumb) => void;
  setUser: (user: AppHealthUser | null) => void;
  setTags: (tags: Record<string, string>) => void;
  flush: () => Promise<void>;
  dispose?: () => void;
}

export type AppHealthTransport = (events: readonly AppHealthEvent[]) => void | Promise<void>;

export type AppHealthSanitizer = (event: Readonly<AppHealthEvent>) => AppHealthEvent;

export interface AppHealthStorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export interface NativeCrashReport {
  id: string;
  timestamp?: number;
  message?: string;
  name?: string;
  stack?: string;
  extra?: Record<string, unknown>;
}

export interface NativeCrashAdapter {
  install?: () => void | Promise<void>;
  getPendingCrashReports?: () => Promise<NativeCrashReport[]>;
  clearPendingCrashReports?: (ids: string[]) => void | Promise<void>;
  setUser?: (user: AppHealthUser | null) => void | Promise<void>;
  setTags?: (tags: Record<string, string>) => void | Promise<void>;
}

export interface AppHealthProviderProps extends AppHealthClientConfig {
  children: ReactNode | ((client: AppHealthReporter) => ReactNode);
}

export interface AppHealthClientConfig {
  enabled?: boolean;
  appId?: string;
  appVersion?: string;
  buildNumber?: string;
  environment?: string;
  userId?: string;
  endpoint?: string;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  transports?: AppHealthTransport[];
  storage?: AppHealthStorageAdapter;
  storageKey?: string;
  sessionStorageKey?: string;
  maxBreadcrumbs?: number;
  maxQueueSize?: number;
  flushIntervalMs?: number;
  flushBatchSize?: number;
  captureGlobalErrors?: boolean;
  captureUnhandledRejections?: boolean;
  detectPreviousCrash?: boolean;
  sanitize?: AppHealthSanitizer;
  nativeCrashAdapter?: NativeCrashAdapter;
  onError?: (error: unknown) => void;
}
