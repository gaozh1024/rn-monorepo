import { apiGet } from './client';
import type { StatsOverview } from './types';

export function getStatsOverview() {
  return apiGet<StatsOverview>('/api/app-health/stats/overview');
}
