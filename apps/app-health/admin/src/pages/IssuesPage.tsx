import { useEffect, useState } from 'react';
import { listIssues } from '../api/issues';
import type { IssueListParams } from '../api/issues';
import type { HealthIssue, ListResponse } from '../api/types';
import { getAppDisplayName } from '../app/appScope';
import type { ProjectAppOption } from '../app/appScope';
import { IssueStatusBadge } from '../components/IssueStatusBadge';
import { LevelBadge } from '../components/LevelBadge';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { DropdownSelect } from '../components/ui/DropdownSelect';
import type { DropdownOption } from '../components/ui/DropdownSelect';

interface IssueFilters {
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

const issueStatusOptions: DropdownOption[] = [
  { value: '', label: '全部' },
  { value: 'open', label: '未处理' },
  { value: 'resolved', label: '已解决' },
  { value: 'ignored', label: '已忽略' },
];

const issueLevelOptions: DropdownOption[] = [
  { value: '', label: '全部' },
  { value: 'fatal', label: '致命' },
  { value: 'error', label: '错误' },
  { value: 'warning', label: '警告' },
  { value: 'info', label: '信息' },
];

export function IssuesPage({
  app,
  environment,
  timeRange,
  onSelectIssue,
}: {
  app: ProjectAppOption;
  environment: string;
  timeRange: string;
  onSelectIssue: (id: string) => void;
}) {
  const [filters, setFilters] = useState<IssueFilters>({ ...defaultFilters });
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
          appId: app.appId,
          ...toIssueListParams(currentFilters),
          page: currentPage,
          pageSize: currentPageSize,
        })
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '问题列表加载失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters, page, pageSize);
  }, [app.appId, filters, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [app.appId]);

  function updateFilter<K extends keyof IssueFilters>(key: K, value: IssueFilters[K]) {
    setFilters(current => ({ ...current, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters({ ...defaultFilters });
    setPage(1);
  }

  function updatePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  const issues = response?.items ?? [];
  const total = response?.total ?? 0;
  const appDisplayName = getAppDisplayName(app);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">问题处理</span>
          <h1>问题</h1>
          <p>{appDisplayName} 的崩溃和错误聚合。</p>
          <div className="context-meta">
            <span>App ID: {app.appId}</span>
            <CopyAppIdButton value={app.appId} />
            <span>{environment ? getEnvironmentLabel(environment) : '全部环境'}</span>
            <span>{getTimeRangeLabel(timeRange)}</span>
          </div>
        </div>
        <Button onClick={() => void load()}>刷新</Button>
      </div>

      <Card>
        <CardHeader title="筛选" description="按状态、级别、版本、平台、指纹或错误消息缩小范围。" />
        <div className="filters" aria-label="问题筛选">
          <label>
            状态
            <DropdownSelect
              value={filters.status}
              options={issueStatusOptions}
              onChange={value => updateFilter('status', value as IssueFilters['status'])}
            />
          </label>
          <label>
            级别
            <DropdownSelect
              value={filters.level}
              options={issueLevelOptions}
              onChange={value => updateFilter('level', value)}
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
              placeholder="TypeError"
            />
          </label>
          <Button variant="ghost" onClick={resetFilters}>
            重置
          </Button>
        </div>
      </Card>
      {loading ? <LoadingState label="正在加载问题..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && !issues.length ? (
        <EmptyState label={`当前筛选条件下，${appDisplayName} 暂无问题。`} />
      ) : null}
      {!loading && !error && issues.length ? (
        <>
          <p className="muted">
            当前显示 {issues.length} / {response?.total ?? issues.length} 个问题。
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
                  <th>标题</th>
                  <th>级别</th>
                  <th>状态</th>
                  <th>事件数</th>
                  <th>用户数</th>
                  <th>平台</th>
                  <th>最近出现</th>
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
    </div>
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

function getEnvironmentLabel(environment: string) {
  const labels: Record<string, string> = {
    production: '生产环境',
    staging: '预发环境',
    development: '开发环境',
  };

  return labels[environment] ?? environment;
}

function getTimeRangeLabel(timeRange: string) {
  const labels: Record<string, string> = {
    '1h': '最近 1 小时',
    '24h': '最近 24 小时',
    '7d': '最近 7 天',
    '30d': '最近 30 天',
  };

  return labels[timeRange] ?? timeRange;
}

function CopyAppIdButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="copy-chip" type="button" onClick={() => void copy()}>
      {copied ? '已复制' : '复制'}
    </button>
  );
}
