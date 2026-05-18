import { useEffect, useState } from 'react';
import { getStatsOverview } from '../api/stats';
import type { StatsOverview } from '../api/types';
import { ErrorState, LoadingState } from '../components/PageState';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';

export function StatsPage({ appId }: { appId: string }) {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(currentAppId = appId) {
    setLoading(true);
    setError(null);
    try {
      setStats(await getStatsOverview({ appId: currentAppId }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load overview.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(appId);
  }, [appId]);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Health overview</span>
          <h1>Overview</h1>
          <p>Track open issues, fatal events, and affected users for {appId || 'all apps'}.</p>
        </div>
        <Button onClick={() => void load()}>Refresh</Button>
      </div>

      <div className="hero-panel">
        <div>
          <span className="eyebrow">Selected application</span>
          <h2>{appId || 'All applications'}</h2>
          <p>Use the top bar to switch app, environment, and time range.</p>
        </div>
        <div className="hero-status">
          <span className="pulse" />
          Monitoring
        </div>
      </div>

      {loading ? <LoadingState label="Loading overview..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <div className="stats-grid">
          <MetricCard label="Open Issues" value={stats?.openIssues ?? '-'} tone="info" />
          <MetricCard label="Events Today" value={stats?.eventsToday ?? '-'} />
          <MetricCard
            label="Affected Users"
            value={stats?.affectedUsersToday ?? '-'}
            tone="warning"
          />
          <MetricCard label="Fatal Events" value={stats?.fatalEventsToday ?? '-'} tone="danger" />
        </div>
      ) : null}

      <div className="dashboard-grid">
        <Card>
          <CardHeader
            title="Issue workflow"
            description="Open issues that require triage will appear here after ingestion starts."
          />
          <div className="empty-panel">
            No trend chart yet. Phase 4 will add level and issue trend charts.
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Setup checklist"
            description="Next product milestones for making this console production-ready."
          />
          <ol className="checklist">
            <li>
              <span /> Create application registry
            </li>
            <li>
              <span /> Generate per-app ingest token
            </li>
            <li>
              <span /> Configure alert routing
            </li>
            <li>
              <span /> Schedule retention dry-run
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
