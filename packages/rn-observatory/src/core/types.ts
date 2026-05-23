import type { ReactNode } from 'react';

export type AppObservatoryEventType =
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
  | 'analytics_event'
  | 'screen_view'
  | 'custom';

export type AppObservatoryLevel = 'info' | 'warning' | 'error' | 'fatal';

export interface AppObservatoryAppInfo {
  id?: string;
  version?: string;
  buildNumber?: string;
  environment?: string;
}

export interface AppObservatoryDeviceInfo {
  platform: 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'unknown';
  osVersion?: string;
  model?: string;
  brand?: string;
}

export interface AppObservatorySessionInfo {
  id: string;
  startedAt: number;
}

export interface AppObservatoryUser {
  id?: string;
  [key: string]: unknown;
}

export interface AppObservatoryErrorPayload {
  name?: string;
  message: string;
  stack?: string;
  componentStack?: string;
  fingerprint?: string;
}

export interface AppObservatoryBreadcrumb {
  timestamp?: number;
  category?: string;
  level?: AppObservatoryLevel;
  message: string;
  data?: unknown;
}

export interface AppObservatoryAnalyticsPayload {
  name: string;
  properties?: Record<string, unknown>;
}

export interface AppObservatoryEvent {
  id: string;
  type: AppObservatoryEventType;
  level: AppObservatoryLevel;
  timestamp: number;
  app: AppObservatoryAppInfo;
  device: AppObservatoryDeviceInfo;
  session: AppObservatorySessionInfo;
  user?: AppObservatoryUser;
  error?: AppObservatoryErrorPayload;
  breadcrumbs?: AppObservatoryBreadcrumb[];
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  analytics?: AppObservatoryAnalyticsPayload;
}

export interface AppObservatoryCaptureContext {
  type?: AppObservatoryEventType;
  level?: AppObservatoryLevel;
  source?: string;
  componentStack?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  analytics?: AppObservatoryAnalyticsPayload;
}

export interface AppObservatoryReporter {
  trackEvent: (
    name: string,
    properties?: Record<string, unknown>,
    context?: AppObservatoryCaptureContext
  ) => Promise<void>;
  trackScreen: (
    screen: string,
    properties?: Record<string, unknown>,
    context?: AppObservatoryCaptureContext
  ) => Promise<void>;
  captureException: (error: unknown, context?: AppObservatoryCaptureContext) => Promise<void>;
  captureMessage: (message: string, context?: AppObservatoryCaptureContext) => Promise<void>;
  addBreadcrumb: (breadcrumb: AppObservatoryBreadcrumb) => void;
  setUser: (user: AppObservatoryUser | null) => void;
  setTags: (tags: Record<string, string>) => void;
  flush: () => Promise<void>;
  dispose?: () => void;
}

export type AppObservatoryTransport = (
  events: readonly AppObservatoryEvent[]
) => void | Promise<void>;

export type AppObservatorySanitizer = (event: Readonly<AppObservatoryEvent>) => AppObservatoryEvent;

export interface AppObservatoryStorageAdapter {
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
  setUser?: (user: AppObservatoryUser | null) => void | Promise<void>;
  setTags?: (tags: Record<string, string>) => void | Promise<void>;
}

export interface AppObservatoryConsentOptions {
  crash?: boolean;
  analytics?: boolean;
  device?: boolean;
  performance?: boolean;
}

export interface AppObservatoryIdentityOptions {
  autoInstallId?: boolean;
  installIdStorageKey?: string;
  anonymousUserId?: string;
  useInstallIdAsUserId?: boolean;
}

export type AppObservatoryDeviceInfoProvider = () =>
  | Partial<AppObservatoryDeviceInfo>
  | Promise<Partial<AppObservatoryDeviceInfo>>;

export interface AppObservatoryProviderProps extends AppObservatoryClientConfig {
  children: ReactNode | ((client: AppObservatoryReporter) => ReactNode);
}

export interface AppObservatoryClientConfig {
  enabled?: boolean;
  appId?: string;
  appVersion?: string;
  buildNumber?: string;
  environment?: string;
  userId?: string;
  consent?: AppObservatoryConsentOptions;
  identity?: AppObservatoryIdentityOptions;
  deviceInfoProvider?: AppObservatoryDeviceInfoProvider;
  endpoint?: string;
  ingestToken?: string;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  transports?: AppObservatoryTransport[];
  storage?: AppObservatoryStorageAdapter;
  storageKey?: string;
  sessionStorageKey?: string;
  maxBreadcrumbs?: number;
  maxQueueSize?: number;
  flushIntervalMs?: number;
  flushBatchSize?: number;
  transportTimeoutMs?: number;
  flushOnFatal?: boolean;
  captureGlobalErrors?: boolean;
  captureUnhandledRejections?: boolean;
  detectPreviousCrash?: boolean;
  sanitize?: AppObservatorySanitizer;
  nativeCrashAdapter?: NativeCrashAdapter;
  onError?: (error: unknown) => void;
}
