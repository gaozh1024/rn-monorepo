export interface HealthIssue {
  id: string;
  appId: string;
  fingerprint: string;
  title: string;
  level: string;
  status: 'open' | 'resolved' | 'ignored';
  eventCount: number;
  affectedUserCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastEventId?: string;
  sampleEventId?: string;
  lastAppVersion?: string;
  lastBuildNumber?: string;
  lastPlatform?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HealthEvent {
  id: string;
  type: string;
  level: string;
  timestamp: number;
  app: { id: string; version?: string; buildNumber?: string; environment?: string };
  device: { platform?: string; osVersion?: string; model?: string };
  session: { id: string; startedAt: number };
  user?: { id?: string };
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    componentStack?: string;
    fingerprint?: string;
  };
  breadcrumbs?: Array<{
    timestamp?: number;
    category?: string;
    level?: string;
    message: string;
    data?: unknown;
  }>;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  issueId?: string;
  createdAt?: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StatsOverview {
  openIssues: number;
  eventsToday: number;
  affectedUsersToday: number;
  fatalEventsToday: number;
}
