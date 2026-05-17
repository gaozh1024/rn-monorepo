import { useEffect, useState } from 'react';
import { getStatsOverview } from '../api/stats';
import type { StatsOverview } from '../api/types';
import { ErrorState, LoadingState } from '../components/PageState';

export function StatsPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setStats(await getStatsOverview());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load overview.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section>
      <div className="section-header">
        <h2>Overview</h2>
        <button onClick={() => void load()}>Refresh</button>
      </div>
      {loading ? <LoadingState label="Loading overview..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <div className="stats-grid">
          <article>
            <strong>{stats?.openIssues ?? '-'}</strong>
            <span>Open Issues</span>
          </article>
          <article>
            <strong>{stats?.eventsToday ?? '-'}</strong>
            <span>Events Today</span>
          </article>
          <article>
            <strong>{stats?.affectedUsersToday ?? '-'}</strong>
            <span>Affected Users</span>
          </article>
          <article>
            <strong>{stats?.fatalEventsToday ?? '-'}</strong>
            <span>Fatal Events</span>
          </article>
        </div>
      ) : null}
    </section>
  );
}
