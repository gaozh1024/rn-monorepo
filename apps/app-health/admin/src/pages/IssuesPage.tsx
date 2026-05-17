import { useEffect, useState } from 'react';
import { listIssues } from '../api/issues';
import type { IssueListParams } from '../api/issues';
import type { HealthIssue, ListResponse } from '../api/types';
import { IssueStatusBadge } from '../components/IssueStatusBadge';
import { LevelBadge } from '../components/LevelBadge';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

interface IssueFilters {
  appId: string;
  status: HealthIssue['status'] | '';
  level: string;
  platform: string;
  from: string;
  to: string;
  appVersion: string;
  buildNumber: string;
  fingerprint: string;
  message: string;
}

const defaultFilters: IssueFilters = {
  appId: '',
  status: 'open',
  level: '',
  platform: '',
  from: '',
  to: '',
  appVersion: '',
  buildNumber: '',
  fingerprint: '',
  message: '',
};

export function IssuesPage({ onSelectIssue }: { onSelectIssue: (id: string) => void }) {
  const [filters, setFilters] = useState<IssueFilters>(defaultFilters);
  const [response, setResponse] = useState<ListResponse<HealthIssue> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  async function load(currentFilters = filters, currentPage = page, currentPageSize = pageSize) {
    setLoading(true);
    setError(null);
    try {
      setResponse(
        await listIssues({
          ...toIssueListParams(currentFilters),
          page: currentPage,
          pageSize: currentPageSize,
        })
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load issues.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters, page, pageSize);
  }, [filters, page, pageSize]);

  function updateFilter<K extends keyof IssueFilters>(key: K, value: IssueFilters[K]) {
    setFilters(current => ({ ...current, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setPage(1);
  }

  function updatePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  const issues = response?.items ?? [];
  const total = response?.total ?? 0;

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
        <label>
          From
          <input
            type="datetime-local"
            value={filters.from}
            onChange={event => updateFilter('from', event.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="datetime-local"
            value={filters.to}
            onChange={event => updateFilter('to', event.target.value)}
          />
        </label>
        <label>
          App Version
          <input
            value={filters.appVersion}
            onChange={event => updateFilter('appVersion', event.target.value)}
            placeholder="1.0.0"
          />
        </label>
        <label>
          Build
          <input
            value={filters.buildNumber}
            onChange={event => updateFilter('buildNumber', event.target.value)}
            placeholder="45"
          />
        </label>
        <label>
          Fingerprint
          <input
            value={filters.fingerprint}
            onChange={event => updateFilter('fingerprint', event.target.value)}
            placeholder="fp_..."
          />
        </label>
        <label>
          Message
          <input
            value={filters.message}
            onChange={event => updateFilter('message', event.target.value)}
            placeholder="TypeError"
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
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={updatePageSize}
          />
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
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={updatePageSize}
          />
        </>
      ) : null}
    </section>
  );
}

function toIssueListParams(filters: IssueFilters): IssueListParams {
  return {
    ...filters,
    from: toISOStringOrEmpty(filters.from),
    to: toISOStringOrEmpty(filters.to),
  };
}

function toISOStringOrEmpty(value: string) {
  return value ? new Date(value).toISOString() : '';
}
