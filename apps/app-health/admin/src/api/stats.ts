import { apiGet, buildQuery } from './client';
import type { StatsOverview } from './types';

export interface StatsOverviewParams {
  appId?: string;
}

export function getStatsOverview(params: StatsOverviewParams = {}) {
  return apiGet<StatsOverview>(`/api/app-health/stats/overview${buildQuery(params)}`);
}
