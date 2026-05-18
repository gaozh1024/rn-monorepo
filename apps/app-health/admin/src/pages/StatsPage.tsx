import { useEffect, useState } from 'react';
import { getStatsOverview } from '../api/stats';
import type { StatsOverview } from '../api/types';
import { ErrorState, LoadingState } from '../components/PageState';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';

export function StatsPage({ appId }: { appId: string }) {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(currentAppId = appId) {
    setLoading(true);
    setError(null);
    try {
      setStats(await getStatsOverview({ appId: currentAppId }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '总览加载失败。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(appId);
  }, [appId]);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">健康总览</span>
          <h1>总览</h1>
          <p>跟踪 {appId || '全部应用'} 的未处理问题、致命事件和受影响用户。</p>
        </div>
        <Button onClick={() => void load()}>刷新</Button>
      </div>

      <div className="hero-panel">
        <div>
          <span className="eyebrow">当前应用</span>
          <h2>{appId || '全部应用'}</h2>
          <p>使用顶部栏切换应用、环境和时间范围。</p>
        </div>
        <div className="hero-status">
          <span className="pulse" />
          监控中
        </div>
      </div>

      {loading ? <LoadingState label="正在加载总览..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <div className="stats-grid">
          <MetricCard label="未处理问题" value={stats?.openIssues ?? '-'} tone="info" />
          <MetricCard label="今日事件" value={stats?.eventsToday ?? '-'} />
          <MetricCard label="受影响用户" value={stats?.affectedUsersToday ?? '-'} tone="warning" />
          <MetricCard label="致命事件" value={stats?.fatalEventsToday ?? '-'} tone="danger" />
        </div>
      ) : null}

      <div className="dashboard-grid">
        <Card>
          <CardHeader
            title="问题处理流"
            description="开始接入上报后，需要处理的问题会显示在这里。"
          />
          <div className="empty-panel">趋势图暂未接入。Phase 4 将增加级别和问题趋势图。</div>
        </Card>
        <Card>
          <CardHeader title="接入清单" description="让控制台达到生产可用的后续里程碑。" />
          <ol className="checklist">
            <li>
              <span /> 创建应用注册表
            </li>
            <li>
              <span /> 生成应用级上报 Token
            </li>
            <li>
              <span /> 配置告警路由
            </li>
            <li>
              <span /> 设置数据清理 dry-run
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
