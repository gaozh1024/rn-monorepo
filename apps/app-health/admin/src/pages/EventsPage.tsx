import { useEffect, useState } from 'react';
import { appHealthEventTypes } from '../api/constants';
import { listEvents } from '../api/events';
import type { EventListParams } from '../api/events';
import type { HealthEvent, ListResponse } from '../api/types';
import { getAppDisplayName } from '../app/appScope';
import type { ProjectAppOption } from '../app/appScope';
import { JsonViewer } from '../components/JsonViewer';
import { LevelBadge } from '../components/LevelBadge';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { DropdownSelect } from '../components/ui/DropdownSelect';
import type { DropdownOption } from '../components/ui/DropdownSelect';

interface EventFilters {
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

const eventLevelOptions: DropdownOption[] = [
  { value: '', label: '全部' },
  { value: 'fatal', label: '致命' },
  { value: 'error', label: '错误' },
  { value: 'warning', label: '警告' },
  { value: 'info', label: '信息' },
];

export function EventsPage({
  issueId,
  app,
  environment = '',
}: {
  issueId?: string;
  app: ProjectAppOption;
  environment?: string;
}) {
  const [filters, setFilters] = useState<EventFilters>({
    ...defaultFilters,
    issueId: issueId ?? '',
    environment,
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
          appId: app.appId,
          ...toEventListParams(currentFilters),
          page: currentPage,
          pageSize: currentPageSize,
        })
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '事件列表加载失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters, page, pageSize);
  }, [app.appId, filters, page, pageSize]);

  useEffect(() => {
    setFilters(current => ({
      ...current,
      environment,
      issueId: issueId ?? current.issueId,
    }));
    setPage(1);
  }, [app.appId, environment, issueId]);

  function updateFilter<K extends keyof EventFilters>(key: K, value: EventFilters[K]) {
    setFilters(current => ({ ...current, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters({ ...defaultFilters, environment, issueId: issueId ?? '' });
    setSelected(null);
    setPage(1);
  }

  function updatePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  const events = response?.items ?? [];
  const total = response?.total ?? 0;
  const appDisplayName = getAppDisplayName(app);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">原始遥测</span>
          <h1>事件</h1>
          <p>查看 {appDisplayName} 的原始健康事件、会话、用户、面包屑和完整 payload。</p>
          <div className="context-meta">
            <span>App ID: {app.appId}</span>
            <span>{environment || '全部环境'}</span>
          </div>
        </div>
        <Button onClick={() => void load()}>刷新</Button>
      </div>

      <Card>
        <CardHeader title="筛选" description="按事件类型、级别、版本、会话、指纹或消息搜索。" />
        <div className="filters" aria-label="事件筛选">
          <label>
            问题 ID
            <input
              value={filters.issueId}
              onChange={event => updateFilter('issueId', event.target.value)}
              placeholder="issue_..."
            />
          </label>
          <label>
            用户 ID
            <input
              value={filters.userId}
              onChange={event => updateFilter('userId', event.target.value)}
              placeholder="user_..."
            />
          </label>
          <label>
            级别
            <DropdownSelect
              value={filters.level}
              options={eventLevelOptions}
              onChange={value => updateFilter('level', value)}
            />
          </label>
          <label>
            类型
            <DropdownSelect
              value={filters.type}
              options={[
                { value: '', label: '全部' },
                ...appHealthEventTypes.map(type => ({ value: type, label: type })),
              ]}
              onChange={value => updateFilter('type', value)}
            />
          </label>
          <label>
            开始时间
            <input
              type="datetime-local"
              value={filters.from}
              onChange={event => updateFilter('from', event.target.value)}
            />
          </label>
          <label>
            结束时间
            <input
              type="datetime-local"
              value={filters.to}
              onChange={event => updateFilter('to', event.target.value)}
            />
          </label>
          <label>
            应用版本
            <input
              value={filters.appVersion}
              onChange={event => updateFilter('appVersion', event.target.value)}
              placeholder="1.0.0"
            />
          </label>
          <label>
            构建号
            <input
              value={filters.buildNumber}
              onChange={event => updateFilter('buildNumber', event.target.value)}
              placeholder="45"
            />
          </label>
          <label>
            环境
            <input
              value={filters.environment}
              onChange={event => updateFilter('environment', event.target.value)}
              placeholder="production"
            />
          </label>
          <label>
            平台
            <input
              value={filters.platform}
              onChange={event => updateFilter('platform', event.target.value)}
              placeholder="ios / android / web"
            />
          </label>
          <label>
            系统版本
            <input
              value={filters.osVersion}
              onChange={event => updateFilter('osVersion', event.target.value)}
              placeholder="17.0"
            />
          </label>
          <label>
            会话 ID
            <input
              value={filters.sessionId}
              onChange={event => updateFilter('sessionId', event.target.value)}
              placeholder="sess_..."
            />
          </label>
          <label>
            指纹
            <input
              value={filters.fingerprint}
              onChange={event => updateFilter('fingerprint', event.target.value)}
              placeholder="fp_..."
            />
          </label>
          <label>
            消息
            <input
              value={filters.message}
              onChange={event => updateFilter('message', event.target.value)}
              placeholder="boom"
            />
          </label>
          <Button variant="ghost" onClick={resetFilters}>
            重置
          </Button>
        </div>
      </Card>
      {loading ? <LoadingState label="正在加载事件..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && !events.length ? (
        <EmptyState label="当前筛选条件下暂无事件。" />
      ) : null}
      {!loading && !error && events.length ? (
        <>
          <p className="muted">
            当前显示 {events.length} / {response?.total ?? events.length} 条事件。
          </p>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={updatePageSize}
          />
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>类型</th>
                  <th>级别</th>
                  <th>应用</th>
                  <th>用户</th>
                  <th>消息</th>
                  <th>创建时间</th>
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
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={updatePageSize}
          />
        </>
      ) : null}
      {selected ? (
        <Card>
          <CardHeader title="选中事件 Payload" description={selected.id} />
          <JsonViewer value={selected} />
        </Card>
      ) : null}
    </div>
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
