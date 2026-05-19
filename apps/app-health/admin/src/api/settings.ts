import { apiGet, apiPost, buildQuery } from './client';

export interface SettingsSummary {
  service: {
    env: string;
    databaseConfigured: boolean;
    databaseReady: boolean;
    corsOrigins: string[];
    maxBodyBytes: number;
    ingestRateLimitRps: number;
    ingestRateLimitBurst: number;
  };
  retention: {
    eventRetentionDays: number;
    retentionDryRun: boolean;
  };
  alerts: {
    envFallbackEnabled: boolean;
    minLevel: string;
    cooldownSeconds: number;
    timeoutSeconds: number;
  };
  admin: {
    email: string;
    adminTokenConfigured: boolean;
    adminPasswordConfigured: boolean;
    sessionSecretConfigured: boolean;
    cookieSecure: boolean;
    sessionTtlHours: number;
  };
  warnings: string[];
}

export type RetentionRunMode = 'dry-run' | 'run';
export type RetentionRunStatus = 'failed' | 'success';

export interface RetentionRun {
  id: string;
  mode: RetentionRunMode;
  eventRetentionDays: number;
  cutoff?: string;
  protectedEventIds: number;
  deletedEvents: number;
  dryRun: boolean;
  status: RetentionRunStatus;
  errorMessage?: string;
  requestedBy?: string;
  source: string;
  createdAt: string;
}

export interface RetentionRunListResponse {
  items: RetentionRun[];
  total: number;
  limit: number;
}

export function getSettingsSummary() {
  return apiGet<SettingsSummary>('/api/app-health/settings/summary');
}

export function retentionDryRun(input: { eventRetentionDays: number }) {
  return apiPost<{ run: RetentionRun }>('/api/app-health/retention/dry-run', input);
}

export function retentionRun(input: {
  acknowledgedBackup: boolean;
  acknowledgedDryRun: boolean;
  confirmText: string;
  dryRunId: string;
  eventRetentionDays: number;
}) {
  return apiPost<{ run: RetentionRun }>('/api/app-health/retention/run', input);
}

export function listRetentionRuns(limit = 20) {
  return apiGet<RetentionRunListResponse>(`/api/app-health/retention/runs${buildQuery({ limit })}`);
}
