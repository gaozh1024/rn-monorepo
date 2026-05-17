import { apiGet, apiPatch, buildQuery } from './client';
import type { HealthEvent, HealthIssue, ListResponse } from './types';

export interface IssueListParams {
  appId?: string;
  status?: HealthIssue['status'] | '';
  level?: string;
  platform?: string;
  page?: number;
  pageSize?: number;
}

export function listIssues(params: IssueListParams = {}) {
  return apiGet<ListResponse<HealthIssue>>(`/api/app-health/issues${buildQuery(params)}`);
}

export function getIssue(id: string) {
  return apiGet<{
    issue: HealthIssue;
    sampleEvent?: HealthEvent;
    recentEvents: HealthEvent[];
    versionDistribution: Array<{ name: string; count: number }>;
    platformDistribution: Array<{ name: string; count: number }>;
  }>(`/api/app-health/issues/${id}`);
}

export function updateIssueStatus(id: string, status: HealthIssue['status']) {
  return apiPatch<{ issue: HealthIssue }>(`/api/app-health/issues/${id}/status`, { status });
}
