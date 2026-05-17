import { useEffect, useState } from 'react';
import { getIssue, updateIssueStatus } from '../api/issues';
import type { HealthEvent, HealthIssue } from '../api/types';
import { BreadcrumbTimeline } from '../components/BreadcrumbTimeline';
import { IssueStatusBadge } from '../components/IssueStatusBadge';
import { JsonViewer } from '../components/JsonViewer';
import { LevelBadge } from '../components/LevelBadge';
import { ErrorState, LoadingState } from '../components/PageState';
import { StackTraceView } from '../components/StackTraceView';

interface IssueDetailState {
  issue: HealthIssue;
  sampleEvent?: HealthEvent;
  recentEvents: HealthEvent[];
  versionDistribution: Array<{ name: string; count: number }>;
  platformDistribution: Array<{ name: string; count: number }>;
}

export function IssueDetailPage({ issueId, onBack }: { issueId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<IssueDetailState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getIssue(issueId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load issue detail.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [issueId]);

  async function setStatus(status: HealthIssue['status']) {
    if (!detail) return;
    const response = await updateIssueStatus(issueId, status);
    setDetail({ ...detail, issue: response.issue });
  }

  return (
    <section>
      <button onClick={onBack}>← Back</button>
      {loading ? <LoadingState label="Loading issue..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && detail ? (
        <>
          <div className="section-header detail-title">
            <div>
              <h2>{detail.issue.title}</h2>
              <p className="muted">{detail.issue.fingerprint}</p>
            </div>
            <div className="badge-row">
              <LevelBadge level={detail.issue.level} />
              <IssueStatusBadge status={detail.issue.status} />
            </div>
          </div>
          <div className="actions">
            <button onClick={() => void setStatus('open')}>Open</button>
            <button onClick={() => void setStatus('resolved')}>Resolved</button>
            <button onClick={() => void setStatus('ignored')}>Ignored</button>
          </div>
          <div className="stats-grid stats-grid-compact">
            <article>
              <strong>{detail.issue.eventCount}</strong>
              <span>Events</span>
            </article>
            <article>
              <strong>{detail.issue.affectedUserCount}</strong>
              <span>Users</span>
            </article>
            <article>
              <strong>{detail.issue.lastPlatform ?? '-'}</strong>
              <span>Platform</span>
            </article>
            <article>
              <strong>{detail.issue.lastAppVersion ?? '-'}</strong>
              <span>Version</span>
            </article>
          </div>
          <h3>Stack</h3>
          <StackTraceView stack={detail.sampleEvent?.error?.stack} />
          <h3>Breadcrumbs</h3>
          <BreadcrumbTimeline breadcrumbs={detail.sampleEvent?.breadcrumbs} />
          <h3>Recent Events</h3>
          <JsonViewer value={detail.recentEvents} />
          <h3>Sample Event</h3>
          <JsonViewer value={detail.sampleEvent ?? {}} />
        </>
      ) : null}
    </section>
  );
}
