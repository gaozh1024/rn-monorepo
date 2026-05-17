import { useEffect, useState } from 'react';
import { listIssues } from '../api/issues';
import type { HealthIssue, ListResponse } from '../api/types';
import { IssueStatusBadge } from '../components/IssueStatusBadge';
import { LevelBadge } from '../components/LevelBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

interface IssueFilters {
  appId: string;
  status: HealthIssue['status'] | '';
  level: string;
  platform: string;
}

const defaultFilters: IssueFilters = {
  appId: '',
  status: 'open',
  level: '',
  platform: '',
};

export function IssuesPage({ onSelectIssue }: { onSelectIssue: (id: string) => void }) {
  const [filters, setFilters] = useState<IssueFilters>(defaultFilters);
  const [response, setResponse] = useState<ListResponse<HealthIssue> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(currentFilters = filters) {
    setLoading(true);
    setError(null);
    try {
      setResponse(await listIssues(currentFilters));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load issues.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters);
  }, [filters]);

  function updateFilter<K extends keyof IssueFilters>(key: K, value: IssueFilters[K]) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  const issues = response?.items ?? [];

  return (
    <section>
      <div className="section-header">
        <h2>Issues</h2>
        <button onClick={() => void load()}>Refresh</button>
      </div>
      <div className="filters" aria-label="Issue filters">
        <label>
          App ID
          <input
            value={filters.appId}
            onChange={event => updateFilter('appId', event.target.value)}
            placeholder="mobile-app"
          />
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={event => updateFilter('status', event.target.value as IssueFilters['status'])}
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
        </label>
        <label>
          Level
          <select
            value={filters.level}
            onChange={event => updateFilter('level', event.target.value)}
          >
            <option value="">All</option>
            <option value="fatal">Fatal</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </label>
        <label>
          Platform
          <input
            value={filters.platform}
            onChange={event => updateFilter('platform', event.target.value)}
            placeholder="ios / android / web"
          />
        </label>
        <button onClick={resetFilters}>Reset</button>
      </div>
      {loading ? <LoadingState label="Loading issues..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && !issues.length ? (
        <EmptyState label="No issues match the current filters." />
      ) : null}
      {!loading && !error && issues.length ? (
        <>
          <p className="muted">
            Showing {issues.length} of {response?.total ?? issues.length} issues.
          </p>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Level</th>
                <th>Status</th>
                <th>Events</th>
                <th>Users</th>
                <th>Platform</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {issues.map(issue => (
                <tr key={issue.id} onClick={() => onSelectIssue(issue.id)}>
                  <td>{issue.title}</td>
                  <td>
                    <LevelBadge level={issue.level} />
                  </td>
                  <td>
                    <IssueStatusBadge status={issue.status} />
                  </td>
                  <td>{issue.eventCount}</td>
                  <td>{issue.affectedUserCount}</td>
                  <td>{issue.lastPlatform ?? '-'}</td>
                  <td>{new Date(issue.lastSeenAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
