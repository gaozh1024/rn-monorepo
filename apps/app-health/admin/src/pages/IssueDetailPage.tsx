import { useEffect, useState } from 'react';
import { getIssue, updateIssueStatus } from '../api/issues';
import type { HealthEvent, HealthIssue } from '../api/types';
import { BreadcrumbTimeline } from '../components/BreadcrumbTimeline';
import { IssueStatusBadge } from '../components/IssueStatusBadge';
import { JsonViewer } from '../components/JsonViewer';
import { LevelBadge } from '../components/LevelBadge';
import { ErrorState, LoadingState } from '../components/PageState';
import { StackTraceView } from '../components/StackTraceView';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';

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
    <div className="page-stack">
      <Button variant="ghost" onClick={onBack}>
        ← Back to issues
      </Button>
      {loading ? <LoadingState label="Loading issue..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && detail ? (
        <>
          <div className="page-heading detail-title">
            <div>
              <span className="eyebrow">Issue detail</span>
              <h2>{detail.issue.title}</h2>
              <p className="muted">{detail.issue.fingerprint}</p>
            </div>
            <div className="badge-row">
              <LevelBadge level={detail.issue.level} />
              <IssueStatusBadge status={detail.issue.status} />
            </div>
          </div>
          <div className="actions">
            <Button variant="ghost" onClick={() => void setStatus('open')}>
              Open
            </Button>
            <Button variant="primary" onClick={() => void setStatus('resolved')}>
              Resolved
            </Button>
            <Button variant="ghost" onClick={() => void setStatus('ignored')}>
              Ignored
            </Button>
          </div>
          <div className="stats-grid stats-grid-compact">
            <MetricCard label="Events" value={detail.issue.eventCount} />
            <MetricCard label="Users" value={detail.issue.affectedUserCount} tone="warning" />
            <MetricCard label="Platform" value={detail.issue.lastPlatform ?? '-'} />
            <MetricCard label="Version" value={detail.issue.lastAppVersion ?? '-'} />
          </div>
          <Card>
            <CardHeader title="Stack trace" />
            <StackTraceView stack={detail.sampleEvent?.error?.stack} />
          </Card>
          <Card>
            <CardHeader title="Breadcrumbs" />
            <BreadcrumbTimeline breadcrumbs={detail.sampleEvent?.breadcrumbs} />
          </Card>
          <Card>
            <CardHeader title="Recent events" />
            <JsonViewer value={detail.recentEvents} />
          </Card>
          <Card>
            <CardHeader title="Sample event" />
            <JsonViewer value={detail.sampleEvent ?? {}} />
          </Card>
        </>
      ) : null}
    </div>
  );
}
