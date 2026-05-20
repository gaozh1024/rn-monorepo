import { FormEvent, useEffect, useState } from 'react';
import {
  getAnalyticsDistribution,
  getEventTimeline,
  getScreenStats,
  getUserTimeline,
} from '../api/analytics';
import type {
  AnalyticsDistributionResponse,
  AnalyticsTimelineItem,
  ScreenStatsItem,
} from '../api/types';
import { getAppDisplayName } from '../app/appScope';
import type { ProjectAppOption } from '../app/appScope';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';

const distributionDimensions = [
  { value: 'deviceModel', label: '设备型号' },
  { value: 'deviceBrand', label: '设备品牌' },
  { value: 'appVersion', label: 'App 版本' },
  { value: 'platform', label: '平台' },
  { value: 'osVersion', label: '系统版本' },
  { value: 'city', label: '城市' },
];

export function AnalyticsPage({ app }: { app: ProjectAppOption }) {
  const [screens, setScreens] = useState<ScreenStatsItem[]>([]);
  const [distribution, setDistribution] = useState<AnalyticsDistributionResponse | null>(null);
  const [timeline, setTimeline] = useState<AnalyticsTimelineItem[]>([]);
  const [eventTimeline, setEventTimeline] = useState<AnalyticsTimelineItem[]>([]);
  const [dimension, setDimension] = useState('deviceModel');
  const [userId, setUserId] = useState('');
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [eventTimelineLoading, setEventTimelineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [eventTimelineError, setEventTimelineError] = useState<string | null>(null);

  async function loadSummary(currentDimension = dimension) {
    setLoading(true);
    setError(null);
    try {
      const [screenResponse, distributionResponse] = await Promise.all([
        getScreenStats({ appId: app.appId, limit: 10 }),
        getAnalyticsDistribution({ appId: app.appId, dimension: currentDimension, limit: 10 }),
      ]);
      setScreens(screenResponse.items);
      setDistribution(distributionResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '行为分析加载失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary(dimension);
  }, [app.appId, dimension]);

  async function submitUserTimeline(event: FormEvent) {
    event.preventDefault();
    if (!userId.trim()) return;
    setTimelineLoading(true);
    setTimelineError(null);
    try {
      const response = await getUserTimeline(userId.trim(), { appId: app.appId, limit: 100 });
      setTimeline(response.items);
    } catch (cause) {
      setTimelineError(cause instanceof Error ? cause.message : '用户路径加载失败。');
    } finally {
      setTimelineLoading(false);
    }
  }

  async function submitEventTimeline(event: FormEvent) {
    event.preventDefault();
    if (!eventId.trim()) return;
    setEventTimelineLoading(true);
    setEventTimelineError(null);
    try {
      const response = await getEventTimeline(eventId.trim(), { windowMinutes: 10 });
      setEventTimeline(response.items);
    } catch (cause) {
      setEventTimelineError(cause instanceof Error ? cause.message : '错误上下文加载失败。');
    } finally {
      setEventTimelineLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">用户行为分析</span>
          <h1>Analytics</h1>
          <p>查看 {getAppDisplayName(app)} 的页面访问、设备分布和匿名用户行为路径。</p>
        </div>
        <Button onClick={() => void loadSummary()}>刷新</Button>
      </div>

      {loading ? <LoadingState label="正在加载行为分析..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void loadSummary()} /> : null}

      <div className="dashboard-grid">
        <Card>
          <CardHeader title="页面访问统计" description="来自 trackScreen / screen_view。" />
          <ScreenStatsTable items={screens} />
        </Card>
        <Card>
          <CardHeader
            title="设备 / 版本 / 地区分布"
            description="只支持白名单维度，避免动态 SQL 风险。"
            actions={
              <select
                className="dropdown-select"
                value={dimension}
                onChange={event => setDimension(event.target.value)}
              >
                {distributionDimensions.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            }
          />
          <DistributionTable response={distribution} />
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card>
          <CardHeader
            title="匿名用户行为路径"
            description="输入 userId / installId 查看行为时间线。"
          />
          <form className="filters" onSubmit={event => void submitUserTimeline(event)}>
            <label>
              用户 ID
              <input
                value={userId}
                onChange={event => setUserId(event.target.value)}
                placeholder="inst_xxx"
              />
            </label>
            <Button type="submit" disabled={!userId.trim()}>
              查询
            </Button>
          </form>
          {timelineLoading ? <LoadingState label="正在加载用户路径..." /> : null}
          {timelineError ? <ErrorState message={timelineError} /> : null}
          <TimelineTable items={timeline} />
        </Card>
        <Card>
          <CardHeader
            title="错误上下文路径"
            description="输入 eventId 查看错误前后 10 分钟行为。"
          />
          <form className="filters" onSubmit={event => void submitEventTimeline(event)}>
            <label>
              错误事件 ID
              <input
                value={eventId}
                onChange={event => setEventId(event.target.value)}
                placeholder="evt_xxx"
              />
            </label>
            <Button type="submit" disabled={!eventId.trim()}>
              查询
            </Button>
          </form>
          {eventTimelineLoading ? <LoadingState label="正在加载错误上下文..." /> : null}
          {eventTimelineError ? <ErrorState message={eventTimelineError} /> : null}
          <TimelineTable items={eventTimeline} />
        </Card>
      </div>
    </div>
  );
}

function ScreenStatsTable({ items }: { items: ScreenStatsItem[] }) {
  if (!items.length) return <EmptyState label="暂无页面访问数据。" />;
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>页面</th>
            <th>访问</th>
            <th>用户</th>
            <th>会话</th>
            <th>最近访问</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.screen}>
              <td>{item.screen}</td>
              <td>{item.views}</td>
              <td>{item.users}</td>
              <td>{item.sessions}</td>
              <td>{formatDate(item.lastSeenAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DistributionTable({ response }: { response: AnalyticsDistributionResponse | null }) {
  if (!response?.items.length) return <EmptyState label="暂无分布数据。" />;
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>值</th>
            <th>数量</th>
          </tr>
        </thead>
        <tbody>
          {response.items.map(item => (
            <tr key={item.value}>
              <td>{item.value}</td>
              <td>{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineTable({ items }: { items: AnalyticsTimelineItem[] }) {
  if (!items.length) return <EmptyState label="暂无时间线数据。" />;
  return (
    <div className="table-card analytics-timeline-table">
      <table>
        <thead>
          <tr>
            <th>时间</th>
            <th>类型</th>
            <th>行为 / 页面</th>
            <th>用户</th>
            <th>设备</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td>
                {formatDate(item.createdAt)}
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
              <td>{item.user?.id ?? '-'}</td>
              <td>
                {item.device.model ?? item.device.platform ?? '-'}
                <span className="table-subtext">
                  {[item.device.brand, item.app.version].filter(Boolean).join(' · ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}
