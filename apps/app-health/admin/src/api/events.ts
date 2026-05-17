import { apiGet, buildQuery } from './client';
import type { HealthEvent, ListResponse } from './types';

export interface EventListParams {
  appId?: string;
  issueId?: string;
  userId?: string;
  level?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export function listEvents(params: EventListParams = {}) {
  return apiGet<ListResponse<HealthEvent>>(`/api/app-health/events${buildQuery(params)}`);
}

export function getEvent(id: string) {
  return apiGet<{ event: HealthEvent }>(`/api/app-health/events/${id}`);
}
