import { useEffect, useState } from 'react';
import { appHealthEventTypes } from '../api/constants';
import { listEvents } from '../api/events';
import type { EventListParams } from '../api/events';
import type { HealthEvent, ListResponse } from '../api/types';
import { JsonViewer } from '../components/JsonViewer';
import { LevelBadge } from '../components/LevelBadge';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

interface EventFilters {
  appId: string;
  issueId: string;
  userId: string;
  level: string;
  type: string;
  from: string;
  to: string;
  appVersion: string;
  buildNumber: string;
  environment: string;
  platform: string;
  osVersion: string;
  sessionId: string;
  fingerprint: string;
  message: string;
}

const defaultFilters: EventFilters = {
  appId: '',
  issueId: '',
  userId: '',
  level: '',
  type: '',
  from: '',
  to: '',
  appVersion: '',
  buildNumber: '',
  environment: '',
  platform: '',
  osVersion: '',
  sessionId: '',
  fingerprint: '',
  message: '',
};

export function EventsPage({ issueId }: { issueId?: string }) {
  const [filters, setFilters] = useState<EventFilters>({
    ...defaultFilters,
    issueId: issueId ?? '',
  });
  const [response, setResponse] = useState<ListResponse<HealthEvent> | null>(null);
  const [selected, setSelected] = useState<HealthEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  async function load(currentFilters = filters, currentPage = page, currentPageSize = pageSize) {
    setLoading(true);
    setError(null);
    try {
      setResponse(
        await listEvents({
          ...toEventListParams(currentFilters),
          page: currentPage,
          pageSize: currentPageSize,
        })
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters, page, pageSize);
  }, [filters, page, pageSize]);

  function updateFilter<K extends keyof EventFilters>(key: K, value: EventFilters[K]) {
    setFilters(current => ({ ...current, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters({ ...defaultFilters, issueId: issueId ?? '' });
    setSelected(null);
    setPage(1);
  }

  function updatePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  const events = response?.items ?? [];
  const total = response?.total ?? 0;

  return (
    <section>
      <div className="section-header">
        <h2>Events</h2>
        <button onClick={() => void load()}>Refresh</button>
      </div>
      <div className="filters" aria-label="Event filters">
        <label>
          App ID
          <input
            value={filters.appId}
            onChange={event => updateFilter('appId', event.target.value)}
            placeholder="mobile-app"
          />
        </label>
        <label>
          Issue ID
          <input
            value={filters.issueId}
            onChange={event => updateFilter('issueId', event.target.value)}
            placeholder="issue_..."
          />
        </label>
        <label>
          User ID
          <input
            value={filters.userId}
            onChange={event => updateFilter('userId', event.target.value)}
            placeholder="user_..."
          />
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
          Type
          <select value={filters.type} onChange={event => updateFilter('type', event.target.value)}>
            <option value="">All</option>
            {appHealthEventTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
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
          Environment
          <input
            value={filters.environment}
            onChange={event => updateFilter('environment', event.target.value)}
            placeholder="production"
          />
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
          OS Version
          <input
            value={filters.osVersion}
            onChange={event => updateFilter('osVersion', event.target.value)}
            placeholder="17.0"
          />
        </label>
        <label>
          Session ID
          <input
            value={filters.sessionId}
            onChange={event => updateFilter('sessionId', event.target.value)}
            placeholder="sess_..."
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
            placeholder="boom"
          />
        </label>
        <button onClick={resetFilters}>Reset</button>
      </div>
      {loading ? <LoadingState label="Loading events..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && !events.length ? (
        <EmptyState label="No events match the current filters." />
      ) : null}
      {!loading && !error && events.length ? (
        <>
          <p className="muted">
            Showing {events.length} of {response?.total ?? events.length} events.
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
                <th>Type</th>
                <th>Level</th>
                <th>App</th>
                <th>User</th>
                <th>Message</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} onClick={() => setSelected(event)}>
                  <td>{event.type}</td>
                  <td>
                    <LevelBadge level={event.level} />
                  </td>
                  <td>
                    {event.app.id}@{event.app.version ?? '-'}
                  </td>
                  <td>{event.user?.id ?? '-'}</td>
                  <td>{event.error?.message ?? '-'}</td>
                  <td>{event.createdAt ? new Date(event.createdAt).toLocaleString() : '-'}</td>
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
      {selected ? <JsonViewer value={selected} /> : null}
    </section>
  );
}

function toEventListParams(filters: EventFilters): EventListParams {
  return {
    ...filters,
    from: toISOStringOrEmpty(filters.from),
    to: toISOStringOrEmpty(filters.to),
  };
}

function toISOStringOrEmpty(value: string) {
  return value ? new Date(value).toISOString() : '';
}
