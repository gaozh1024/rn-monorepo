import { useEffect, useState } from 'react';
import { getEventTimeline } from '../api/analytics';
import { getIssue, updateIssueStatus } from '../api/issues';
import type { AnalyticsTimelineItem, HealthEvent, HealthIssue } from '../api/types';
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
  const [behaviorTimeline, setBehaviorTimeline] = useState<AnalyticsTimelineItem[]>([]);
  const [behaviorError, setBehaviorError] = useState<string | null>(null);
  const [behaviorLoading, setBehaviorLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getIssue(issueId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '问题详情加载失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [issueId]);

  async function loadBehaviorTimeline(eventId: string) {
    setBehaviorLoading(true);
    setBehaviorError(null);
    try {
      const response = await getEventTimeline(eventId, { windowMinutes: 10 });
      setBehaviorTimeline(response.items);
    } catch (cause) {
      setBehaviorError(cause instanceof Error ? cause.message : '用户行为路径加载失败。');
    } finally {
      setBehaviorLoading(false);
    }
  }

  async function setStatus(status: HealthIssue['status']) {
    if (!detail) return;
    const response = await updateIssueStatus(issueId, status);
    setDetail({ ...detail, issue: response.issue });
  }

  return (
    <div className="page-stack">
      <Button variant="ghost" onClick={onBack}>
        ← 返回问题列表
      </Button>
      {loading ? <LoadingState label="正在加载问题详情..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && detail ? (
        <>
          <div className="page-heading detail-title">
            <div>
              <span className="eyebrow">问题详情</span>
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
              标记未处理
            </Button>
            <Button variant="primary" onClick={() => void setStatus('resolved')}>
              标记已解决
            </Button>
            <Button variant="ghost" onClick={() => void setStatus('ignored')}>
              标记忽略
            </Button>
          </div>
          <div className="stats-grid stats-grid-compact">
            <MetricCard label="事件数" value={detail.issue.eventCount} />
            <MetricCard label="受影响用户" value={detail.issue.affectedUserCount} tone="warning" />
            <MetricCard label="平台" value={detail.issue.lastPlatform ?? '-'} />
            <MetricCard label="版本" value={detail.issue.lastAppVersion ?? '-'} />
          </div>
          <Card>
            <CardHeader title="堆栈信息" />
            <StackTraceView stack={detail.sampleEvent?.error?.stack} />
          </Card>
          <Card>
            <CardHeader title="面包屑" />
            <BreadcrumbTimeline breadcrumbs={detail.sampleEvent?.breadcrumbs} />
          </Card>
          <Card>
            <CardHeader
              title="用户错误时间线"
              description="查看样本事件前后 10 分钟内的匿名用户行为。"
              actions={
                detail.sampleEvent ? (
                  <Button
                    variant="ghost"
                    onClick={() => void loadBehaviorTimeline(detail.sampleEvent!.id)}
                  >
                    查看行为路径
                  </Button>
                ) : null
              }
            />
            {behaviorLoading ? <LoadingState label="正在加载行为路径..." /> : null}
            {behaviorError ? <ErrorState message={behaviorError} /> : null}
            {behaviorTimeline.length ? (
              <div className="table-card analytics-timeline-table">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>类型</th>
                      <th>行为 / 错误</th>
                      <th>设备</th>
                    </tr>
                  </thead>
                  <tbody>
                    {behaviorTimeline.map(item => (
                      <tr key={item.id}>
                        <td>
                          {new Date(item.createdAt).toLocaleString()}
                          <span className="table-subtext">{item.id}</span>
                        </td>
                        <td>
                          <span className={`badge level-${item.level}`}>{item.type}</span>
                        </td>
                        <td>
                          {item.analytics?.name ?? item.error?.message ?? '-'}
                          {item.tags?.screen ? (
                            <span className="table-subtext">screen: {item.tags.screen}</span>
                          ) : null}
                        </td>
                        <td>{item.device.model ?? item.device.platform ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
          <Card>
            <CardHeader title="最近事件" />
            <JsonViewer value={detail.recentEvents} />
          </Card>
          <Card>
            <CardHeader title="样本事件" />
            <JsonViewer value={detail.sampleEvent ?? {}} />
          </Card>
        </>
      ) : null}
    </div>
  );
}
