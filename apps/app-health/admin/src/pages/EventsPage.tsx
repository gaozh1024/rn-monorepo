import { useEffect, useState } from 'react';
import { listEvents } from '../api/events';
import type { HealthEvent, ListResponse } from '../api/types';
import { JsonViewer } from '../components/JsonViewer';
import { LevelBadge } from '../components/LevelBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

interface EventFilters {
  appId: string;
  issueId: string;
  userId: string;
  level: string;
  type: string;
}

const defaultFilters: EventFilters = {
  appId: '',
  issueId: '',
  userId: '',
  level: '',
  type: '',
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

  async function load(currentFilters = filters) {
    setLoading(true);
    setError(null);
    try {
      setResponse(await listEvents(currentFilters));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters);
  }, [filters]);

  function updateFilter<K extends keyof EventFilters>(key: K, value: EventFilters[K]) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters({ ...defaultFilters, issueId: issueId ?? '' });
    setSelected(null);
  }

  const events = response?.items ?? [];

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
            <option value="crash">Crash</option>
            <option value="error">Error</option>
            <option value="log">Log</option>
            <option value="health_check">Health Check</option>
          </select>
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
        </>
      ) : null}
      {selected ? <JsonViewer value={selected} /> : null}
    </section>
  );
}
