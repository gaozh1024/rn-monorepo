import { apiDelete, apiGet, apiPatch, apiPost, buildQuery } from './client';
import type { ListResponse } from './types';

export type AlertLevel = 'error' | 'fatal' | 'info' | 'warning';
export type AlertDeliveryStatus = 'failed' | 'success';

export interface AlertRule {
  id: string;
  name: string;
  appId: string;
  environment: string;
  minLevel: AlertLevel;
  webhookUrlMasked: string;
  cooldownSeconds: number;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlertDelivery {
  id: string;
  ruleId: string;
  ruleName?: string;
  appId: string;
  environment: string;
  level: AlertLevel;
  fingerprint: string;
  eventId: string;
  issueId: string;
  status: AlertDeliveryStatus;
  httpStatus?: number;
  errorMessage?: string;
  durationMs: number;
  test: boolean;
  createdAt?: string;
}

export interface AlertRuleInput {
  name: string;
  appId: string;
  environment: string;
  minLevel: AlertLevel;
  webhookUrl?: string;
  cooldownSeconds: number;
  enabled?: boolean;
}

export function listAlertRules(params: { appId?: string; enabled?: boolean } = {}) {
  return apiGet<ListResponse<AlertRule>>(`/api/app-health/alert-rules${buildQuery(params)}`);
}

export function createAlertRule(input: AlertRuleInput) {
  return apiPost<{ rule: AlertRule }>('/api/app-health/alert-rules', input);
}

export function updateAlertRule(id: string, input: AlertRuleInput) {
  return apiPatch<{ rule: AlertRule }>(`/api/app-health/alert-rules/${id}`, input);
}

export function enableAlertRule(id: string) {
  return apiPost<{ rule: AlertRule }>(`/api/app-health/alert-rules/${id}/enable`);
}

export function disableAlertRule(id: string) {
  return apiPost<{ rule: AlertRule }>(`/api/app-health/alert-rules/${id}/disable`);
}

export function deleteAlertRule(id: string) {
  return apiDelete<{ rule: AlertRule }>(`/api/app-health/alert-rules/${id}`);
}

export function testAlertRule(id: string, message?: string) {
  return apiPost<{ delivery: AlertDelivery }>(`/api/app-health/alert-rules/${id}/test`, {
    message,
  });
}

export function listAlertDeliveries(
  params: { appId?: string; ruleId?: string; status?: AlertDeliveryStatus } = {}
) {
  return apiGet<ListResponse<AlertDelivery>>(
    `/api/app-health/alert-deliveries${buildQuery(params)}`
  );
}
