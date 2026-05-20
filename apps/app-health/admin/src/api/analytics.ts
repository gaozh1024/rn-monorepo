import { apiGet, buildQuery } from './client';
import type {
  AnalyticsDistributionResponse,
  AnalyticsTimelineResponse,
  ScreenStatsResponse,
} from './types';

export interface AnalyticsTimeParams {
  appId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface EventTimelineParams {
  windowMinutes?: number;
}

export interface DistributionParams extends AnalyticsTimeParams {
  dimension: string;
}

export function getUserTimeline(userId: string, params: AnalyticsTimeParams = {}) {
  return apiGet<AnalyticsTimelineResponse>(
    `/api/app-health/analytics/users/${encodeURIComponent(userId)}/timeline${buildQuery(params)}`
  );
}

export function getEventTimeline(eventId: string, params: EventTimelineParams = {}) {
  return apiGet<AnalyticsTimelineResponse>(
    `/api/app-health/analytics/events/${encodeURIComponent(eventId)}/timeline${buildQuery(params)}`
  );
}

export function getScreenStats(params: AnalyticsTimeParams = {}) {
  return apiGet<ScreenStatsResponse>(`/api/app-health/analytics/screens${buildQuery(params)}`);
}

export function getAnalyticsDistribution(params: DistributionParams) {
  return apiGet<AnalyticsDistributionResponse>(
    `/api/app-health/analytics/distribution${buildQuery(params)}`
  );
}
